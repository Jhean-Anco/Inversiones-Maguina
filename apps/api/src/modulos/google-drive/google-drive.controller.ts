import { BadRequestException, Controller, Get, Param, Query, Req, Res, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyReply, FastifyRequest } from "fastify";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioGoogleDrive } from "./google-drive.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("integraciones/google-drive")
export class ControladorGoogleDrive {
  constructor(private readonly drive: ServicioGoogleDrive, private readonly jwt: JwtService) {}

  @Get("estado")
  @UseGuards(GuardiaSesion)
  async estado() { return { configurado: this.drive.configurado(), conectado: await this.drive.conectado(), puedeListarCarpetas: await this.drive.puedeListarCarpetasExistentes(), cuenta: await this.drive.cuentaConectada(), carpetaBovedaId: this.drive.carpetaBovedaId() }; }

  @Get("oauth/url")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  async urlAutorizacion(@Req() solicitud: SolicitudAutenticada) {
    if (!this.drive.configurado()) throw new BadRequestException("Completa la configuración de Google Drive en el servidor.");
    const estado = await this.jwt.signAsync({ sub: solicitud.usuario.id, objetivo: "google-drive" }, { expiresIn: "5m" });
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    const parametros: Record<string, string> = { client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!, redirect_uri: process.env.GOOGLE_DRIVE_REDIRECT_URI!, response_type: "code", scope: `openid email ${this.drive.scope} ${this.drive.scopeMetadata}`, access_type: "offline", prompt: "consent", include_granted_scopes: "true", state: estado };
    if (process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL?.trim()) parametros.login_hint = process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL.trim();
    url.search = new URLSearchParams(parametros).toString();
    return { url: url.toString() };
  }

  @Get("oauth/callback")
  async callback(@Query("code") codigo: string, @Query("state") estado: string, @Query("error") error: string | undefined, @Res() respuesta: FastifyReply) {
    const inicio = (process.env.FRONTEND_ORIGIN || "http://localhost:5173").split(",")[0].trim();
    if (error) return respuesta.redirect(`${inicio}/inicio`);
    if (!codigo || !estado) throw new BadRequestException("Google no devolvió el código de autorización esperado.");
    const carga = await this.jwt.verifyAsync<{ objetivo?: string }>(estado).catch(() => null);
    if (carga?.objetivo !== "google-drive") throw new BadRequestException("La sesión de autorización de Drive venció. Vuelve a intentarlo.");
    await this.drive.intercambiarCodigo(codigo);
    return respuesta.redirect(`${inicio}/inicio`);
  }

  @Get("imagenes/:id")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequiereCualquieraPermiso("INGRESOS.LEER", "INVENTARIO.LEER", "EGRESOS.LEER", "MOTOTAXIS.LEER")
  async consultarImagen(@Param("id") id: string, @Res() respuesta: FastifyReply) {
    const imagen = await this.drive.descargarImagen(id);
    return respuesta.type(imagen.mime).header("Cache-Control", "private, max-age=3600").send(imagen.contenido);
  }
}

@Controller("integraciones/archivos")
export class ControladorArchivosAlmacenados {
  constructor(private readonly drive: ServicioGoogleDrive) {}

  @Get(":id/contenido")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequiereCualquieraPermiso("INGRESOS.LEER", "EGRESOS.LEER", "INVENTARIO.LEER", "MOTOTAXIS.LEER", "FINANZAS.LEER")
  async consultar(@Param("id") id: string, @Res() respuesta: FastifyReply) {
    const archivo = await this.drive.descargarArchivoRegistrado(id);
    return respuesta.type(archivo.mime).header("Cache-Control", "private, max-age=3600")
      .header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`)
      .send(archivo.contenido);
  }
}
