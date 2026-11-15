import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso } from "../autenticacion/permisos";
import { ServicioTransportistas } from "./transportistas.service";

@Controller("personas/transportistas")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorTransportistas {
  constructor(private readonly transportistas: ServicioTransportistas) {}

  @Get() @RequiereCualquieraPermiso("PERSONAS.LEER", "INGRESOS.CREAR")
  listar(@Query("busqueda") busqueda?: string) { return this.transportistas.listar(busqueda); }

  @Post() @RequiereCualquieraPermiso("PERSONAS.CREAR", "INGRESOS.CREAR")
  crear(@Body() datos: unknown) { return this.transportistas.crear(datos); }
}
