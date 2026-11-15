import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso } from "../autenticacion/permisos";
import { ServicioMototaxis } from "./mototaxis.service";

@Controller("personas/proveedores")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorDirectorioProveedores {
  constructor(private readonly mototaxis: ServicioMototaxis) {}

  @Get()
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INVENTARIO.CREAR")
  listar(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarProveedores(busqueda); }

  @Get("listado")
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INVENTARIO.CREAR")
  listarDirectorio(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.mototaxis.listarDirectorioProveedores(pagina, porPagina, busqueda); }

  @Post()
  @RequiereCualquieraPermiso("PERSONAS.CREAR", "INVENTARIO.CREAR")
  crear(@Body() datos: unknown) { return this.mototaxis.crearProveedor(datos); }
}
