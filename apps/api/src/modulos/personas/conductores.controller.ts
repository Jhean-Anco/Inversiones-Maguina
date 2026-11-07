import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import { ServicioConductores } from "./conductores.service";

@Controller("personas/conductores")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorConductores {
  constructor(private readonly conductores: ServicioConductores) {}

  @Get()
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INGRESOS.CREAR")
  listar(@Query("busqueda") busqueda?: string) { return this.conductores.listar(busqueda); }

  @Get("listado")
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INGRESOS.CREAR")
  listarPaginado(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.conductores.listarPaginado(pagina, porPagina, busqueda); }

  @Post()
  @RequierePermiso("PERSONAS.CREAR")
  crear(@Body() datos: unknown) { return this.conductores.crear(datos); }
}
