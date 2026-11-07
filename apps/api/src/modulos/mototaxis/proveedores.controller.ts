import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioMototaxis } from "./mototaxis.service";

@Controller("personas/proveedores")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorDirectorioProveedores {
  constructor(private readonly mototaxis: ServicioMototaxis) {}

  @Get()
  @RequierePermiso("PERSONAS.LEER")
  listar(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarProveedores(busqueda); }

  @Get("listado")
  @RequierePermiso("PERSONAS.LEER")
  listarDirectorio(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.mototaxis.listarDirectorioProveedores(pagina, porPagina, busqueda); }

  @Post()
  @RequierePermiso("PERSONAS.CREAR")
  crear(@Body() datos: unknown) { return this.mototaxis.crearProveedor(datos); }
}
