import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import { ServicioPersonal } from "./personal.service";

@Controller("personas/personal")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorPersonal {
  constructor(private readonly personal: ServicioPersonal) {}
  @Get() @RequiereCualquieraPermiso("PERSONAS.LEER", "INGRESOS.CREAR") listar(@Query("busqueda") q?: string) { return this.personal.listar(q); }
  @Post() @RequierePermiso("PERSONAS.CREAR") registrar(@Body() datos: unknown) { return this.personal.registrar(datos); }
  @Patch(":id/baja") @RequierePermiso("PERSONAS.EDITAR") darDeBaja(@Param("id") id: string) { return this.personal.darDeBaja(id); }
}
