import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioCategorias } from "./categorias.service";

type DatosCategoria = { nombre?: unknown; descripcion?: unknown; activo?: unknown };

@Controller("inventario/categorias")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorCategorias {
  constructor(private readonly categorias: ServicioCategorias) {}

  @Get()
  @RequierePermiso("INVENTARIO.LEER")
  listar() { return this.categorias.listar(); }

  @Post()
  @RequierePermiso("INVENTARIO.CREAR")
  crear(@Body() datos: DatosCategoria) { return this.categorias.crear(datos); }

  @Patch(":id")
  @RequierePermiso("INVENTARIO.EDITAR")
  actualizar(@Param("id") id: string, @Body() datos: DatosCategoria) { return this.categorias.actualizar(id, datos); }

}
