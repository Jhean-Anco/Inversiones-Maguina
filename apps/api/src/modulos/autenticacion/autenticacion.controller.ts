import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { ServicioAutenticacion } from "./autenticacion.service";
import { GuardiaSesion } from "./guardia-sesion";
import { UsuarioActual, type UsuarioAutenticado } from "./usuario-actual";
import { esProduccion } from "../../configuracion-entorno";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";

type DatosInicioSesion = {
  usuario?: unknown;
  contrasena?: unknown;
  recordar?: unknown;
};

const opcionesCookie = (recordar: boolean) => ({
  httpOnly: true,
  secure: esProduccion(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: recordar ? validarConfiguracionEntorno().segundosSesionRecordada : validarConfiguracionEntorno().segundosSesion,
});

@Controller("autenticacion")
export class ControladorAutenticacion {
  constructor(private readonly autenticacion: ServicioAutenticacion) {}

  @Post("iniciar-sesion")
  @HttpCode(200)
  async iniciarSesion(
    @Body() datos: DatosInicioSesion,
    @Res({ passthrough: true }) respuesta: FastifyReply,
  ) {
    if (typeof datos.usuario !== "string" || typeof datos.contrasena !== "string") {
      throw new BadRequestException("Ingresa tu usuario y contraseña.");
    }

    const recordar = datos.recordar === true;
    const resultado = await this.autenticacion.iniciarSesion(
      datos.usuario,
      datos.contrasena,
      recordar,
    );
    respuesta.setCookie("magina_sesion", resultado.token, opcionesCookie(recordar));
    return { usuario: resultado.usuario };
  }

  @Post("cerrar-sesion")
  @HttpCode(200)
  cerrarSesion(@Res({ passthrough: true }) respuesta: FastifyReply) {
    respuesta.clearCookie("magina_sesion", { ...opcionesCookie(false), maxAge: 0 });
    return { mensaje: "Sesión cerrada." };
  }

  @Get("yo")
  @UseGuards(GuardiaSesion)
  async obtenerSesion(@UsuarioActual() usuario: UsuarioAutenticado) {
    const perfil = await this.autenticacion.obtenerPerfil(usuario.id);
    if (!perfil) throw new UnauthorizedException("La cuenta no está disponible.");
    return { usuario: perfil };
  }
}
