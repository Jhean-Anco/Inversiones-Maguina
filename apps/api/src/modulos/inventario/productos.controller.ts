import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioProductos } from "./productos.service";

@Controller("inventario/productos")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorProductos {
  constructor(private readonly productos: ServicioProductos) {}

  @Get("catalogos")
  @RequierePermiso("INVENTARIO.LEER")
  catalogos() { return this.productos.catalogos(); }

  @Get("alertas-stock-bajo")
  @RequierePermiso("INVENTARIO.LEER")
  alertasStockBajo() { return this.productos.alertasStockBajo(); }

  @Get()
  @RequierePermiso("INVENTARIO.LEER")
  listar(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) {
    return this.productos.listar({ pagina, porPagina, busqueda });
  }

  @Get(":id")
  @RequierePermiso("INVENTARIO.LEER")
  consultar(@Param("id") id: string) { return this.productos.consultar(id); }

  @Post()
  @RequierePermiso("INVENTARIO.CREAR")
  crear(@Body() datos: unknown) { return this.productos.guardar(datos); }

  @Patch(":id")
  @RequierePermiso("INVENTARIO.EDITAR")
  actualizar(@Param("id") id: string, @Body() datos: unknown) { return this.productos.guardar(datos, id); }

  @Patch(":id/estado")
  @RequierePermiso("INVENTARIO.EDITAR")
  cambiarEstado(@Param("id") id: string, @Body() datos: { activo?: unknown }) {
    return this.productos.cambiarEstado(id, datos.activo);
  }
}
