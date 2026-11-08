import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import { ServicioSunatSire } from "./sunat-sire.service";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("inventario/sunat-sire")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorSunatSire {
  constructor(private readonly sire: ServicioSunatSire) {}

  @Get("configuracion") @RequiereCualquieraPermiso("INVENTARIO.LEER", "EGRESOS.LEER") estadoConfiguracion() {
    return { configurado: this.sire.estaConfigurado() };
  }

  @Get("periodos") @RequiereCualquieraPermiso("INVENTARIO.LEER", "EGRESOS.LEER") consultarPeriodos() {
    return this.sire.consultarPeriodos();
  }

  @Get("propuesta") @RequiereCualquieraPermiso("INVENTARIO.LEER", "EGRESOS.CREAR") solicitarPropuesta(
    @Query("periodo") periodo?: string,
    @Query("fechaInicio") fechaInicio?: string,
    @Query("fechaFin") fechaFin?: string,
  ) {
    if (!periodo) throw new BadRequestException("Indica el periodo tributario con formato AAAAMM.");
    return this.sire.solicitarPropuesta(periodo, fechaInicio, fechaFin);
  }

  @Get("ticket") @RequiereCualquieraPermiso("INVENTARIO.LEER", "EGRESOS.LEER") consultarTicket(@Query("periodo") periodo?: string, @Query("numero") numero?: string) {
    if (!periodo || !numero) throw new BadRequestException("Indica el periodo tributario y el número de ticket.");
    return this.sire.consultarTicket(periodo, numero);
  }

  @Get("archivo") @RequiereCualquieraPermiso("INVENTARIO.LEER", "EGRESOS.LEER") async descargarArchivo(
    @Query("periodo") periodo: string | undefined,
    @Query("numero") numero: string | undefined,
    @Query("nombre") nombre: string | undefined,
    @Query("tipo") tipo: string | undefined,
    @Res() respuesta: FastifyReply,
  ) {
    if (!periodo || !numero || !nombre || tipo === undefined) throw new BadRequestException("Faltan datos requeridos para descargar el archivo de SUNAT.");
    const archivo = await this.sire.descargarArchivo(periodo, numero, nombre, tipo);
    return respuesta.type("application/zip").header("Cache-Control", "private, no-store").header("Content-Disposition", `attachment; filename="${archivo.nombre}"`).send(archivo.contenido);
  }
}

@Controller("egresos/documentos-recibidos")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorDocumentosRecibidos {
  constructor(private readonly sire: ServicioSunatSire) {}

  @Get()
  @RequierePermiso("EGRESOS.LEER")
  listar(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string, @Query("estado") estado?: string, @Query("periodo") periodo?: string, @Query("destino") destino?: string, @Query("tipoDocumento") tipoDocumento?: string) {
    return this.sire.listarDocumentos({ pagina, porPagina, busqueda, estado, periodo, destino, tipoDocumento });
  }

  @Post()
  @RequierePermiso("EGRESOS.CREAR")
  registrarManual(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new BadRequestException("Los datos del comprobante no son válidos.");
    return this.sire.registrarManual(datos as Record<string, unknown>, solicitud.usuario);
  }

  @Patch(":id/destino")
  @RequierePermiso("EGRESOS.CREAR")
  clasificar(@Param("id") id: string, @Body() datos: unknown) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new BadRequestException("Indica el destino del comprobante.");
    return this.sire.clasificarDocumento(id, (datos as Record<string, unknown>).destino);
  }

  @Post("importar-sire")
  @RequierePermiso("EGRESOS.CREAR")
  importar(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new BadRequestException("Los datos de importación no son válidos.");
    const entrada = datos as Record<string, unknown>;
    if (![entrada.periodo, entrada.ticket, entrada.nombre, entrada.tipo].every((valor) => typeof valor === "string" && valor.trim())) throw new BadRequestException("Indica el periodo, ticket y archivo del SIRE.");
    return this.sire.importarPropuesta(entrada.periodo as string, entrada.ticket as string, entrada.nombre as string, entrada.tipo as string, solicitud.usuario);
  }
}
