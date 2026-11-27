import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioNotaVentaEdicion } from "./nota-venta-edicion.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("ingresos")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorNotaVentaEdicion {
  constructor(private readonly edicion: ServicioNotaVentaEdicion) {}

  @Get(":id/nota-venta") @RequierePermiso("INGRESOS.CREAR") obtener(@Param("id") id: string) { return this.edicion.obtener(id); }
  @Patch(":id/nota-venta") @RequierePermiso("INGRESOS.CREAR") editar(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.edicion.editar(id, datos, solicitud.usuario.id); }
}
