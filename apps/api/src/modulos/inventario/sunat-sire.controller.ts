import { Controller, Get, Query, Res, UseGuards, BadRequestException } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioSunatSire } from "./sunat-sire.service";

@Controller("inventario/sunat-sire")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorSunatSire {
  constructor(private readonly sire: ServicioSunatSire) {}

  @Get("configuracion") @RequierePermiso("INVENTARIO.LEER") estadoConfiguracion() {
    return { configurado: this.sire.estaConfigurado() };
  }

  @Get("periodos") @RequierePermiso("INVENTARIO.LEER") consultarPeriodos() {
    return this.sire.consultarPeriodos();
  }

  @Get("propuesta") @RequierePermiso("INVENTARIO.LEER") solicitarPropuesta(
    @Query("periodo") periodo?: string,
    @Query("fechaInicio") fechaInicio?: string,
    @Query("fechaFin") fechaFin?: string,
  ) {
    if (!periodo) throw new BadRequestException("Indica el periodo tributario con formato AAAAMM.");
    return this.sire.solicitarPropuesta(periodo, fechaInicio, fechaFin);
  }

  @Get("ticket") @RequierePermiso("INVENTARIO.LEER") consultarTicket(@Query("periodo") periodo?: string, @Query("numero") numero?: string) {
    if (!periodo || !numero) throw new BadRequestException("Indica el periodo tributario y el número de ticket.");
    return this.sire.consultarTicket(periodo, numero);
  }

  @Get("archivo") @RequierePermiso("INVENTARIO.LEER") async descargarArchivo(
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
