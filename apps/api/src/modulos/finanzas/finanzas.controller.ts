import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioFinanzas } from "./finanzas.service";

type SolicitudAutenticada = FastifyRequest & { usuario: { id: string } };

@Controller("finanzas/cuentas")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorFinanzas {
  constructor(private readonly finanzas: ServicioFinanzas) {}

  @Get()
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  listar() { return this.finanzas.listar(); }

  @Get("opciones")
  @RequierePermiso("FINANZAS.LEER")
  opciones() { return this.finanzas.opciones(); }

  @Get("resumen")
  @RequierePermiso("FINANZAS.LEER")
  resumen() { return this.finanzas.resumenDelMes(); }

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
