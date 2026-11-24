import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import { ServicioFinanzas } from "./finanzas.service";
import { validarRangoFechas } from "../../utilidades/validar-rango-fechas";

type SolicitudAutenticada = FastifyRequest & { usuario: { id: string } };

@Controller("finanzas/cuentas")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorFinanzas {
  constructor(private readonly finanzas: ServicioFinanzas) {}

  @Get()
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  listar() { return this.finanzas.listar(); }

  @Get("opciones")
  @RequiereCualquieraPermiso("FINANZAS.LEER", "FACTURACION.NOTAS_EMITIR")
  opciones() { return this.finanzas.opciones(); }

  @Get("resumen")
  @RequierePermiso("FINANZAS.LEER")
  resumen() { return this.finanzas.resumenDelMes(); }

  @Get("flujo")
  @RequierePermiso("FINANZAS.LEER")
  flujo(@Query("periodo") periodo?: string) {
    if (!periodo) throw new BadRequestException("Indica el periodo del flujo financiero.");
    return this.finanzas.flujoPorPeriodo(periodo);
  }

  @Get("composicion")
  @RequierePermiso("FINANZAS.LEER")
  composicion(@Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.finanzas.composicionDeCaja(validarRangoFechas(desde, hasta)); }

  @Get("movimientos")
  @RequierePermiso("FINANZAS.LEER")
  movimientos(@Query("periodo") periodo?: string, @Query("fecha") fecha?: string) {
    if (!periodo || !fecha) throw new BadRequestException("Indica el periodo y la fecha que quieres consultar.");
    return this.finanzas.movimientosPorPeriodo(periodo, fecha);
  }

  @Post()
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.finanzas.crear(datos, solicitud.usuario.id); }

  @Patch(":id")
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  actualizar(@Param("id") id: string, @Body() datos: unknown) { return this.finanzas.actualizar(id, datos); }

  @Patch(":id/estado")
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  cambiarEstado(@Param("id") id: string, @Body() datos: unknown) { return this.finanzas.cambiarEstado(id, datos); }
}
