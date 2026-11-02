import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioMarcas } from "./marcas.service";

type DatosMarca = { nombre?: unknown; descripcion?: unknown; activo?: unknown };

@Controller("inventario/marcas")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorMarcas {
  constructor(private readonly marcas: ServicioMarcas) {}

  @Get()
  @RequierePermiso("INVENTARIO.LEER")
  listar() { return this.marcas.listar(); }

  @Post()
  @RequierePermiso("INVENTARIO.CREAR")
  crear(@Body() datos: DatosMarca) { return this.marcas.crear(datos); }

  @Patch(":id")
  @RequierePermiso("INVENTARIO.EDITAR")
  actualizar(@Param("id") id: string, @Body() datos: DatosMarca) { return this.marcas.actualizar(id, datos); }
}
