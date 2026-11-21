import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { FastifyRequest } from "fastify";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
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
  listar(@Query() filtros: Parameters<ServicioProductos["listar"]>[0]) {
    return this.productos.listar(filtros);
  }

  @Get("precios")
  @RequierePermiso("INVENTARIO.LEER")
  listarPrecios(@Query() filtros: Parameters<ServicioProductos["listarPrecios"]>[0]) {
    return this.productos.listarPrecios(filtros);
  }

  @Post(":id/precios")
  @RequierePermiso("INVENTARIO.EDITAR")
  configurarPrecio(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: FastifyRequest & { usuario: UsuarioAutenticado }) {
    return this.productos.configurarPrecio(id, datos, solicitud.usuario.id);
  }

  @Patch(":id/precios/:precioId")
  @RequierePermiso("INVENTARIO.EDITAR")
  corregirPrecio(@Param("id") id: string, @Param("precioId") precioId: string, @Body() datos: { precio?: unknown; precioAnterior?: unknown }, @Req() solicitud: FastifyRequest & { usuario: UsuarioAutenticado }) {
    return this.productos.configurarPrecio(id, { precio: datos?.precio, precioAnterior: datos?.precioAnterior }, solicitud.usuario.id, precioId);
  }

  @Get(":id/costos-compra")
  @RequierePermiso("INVENTARIO.LEER")
  costosCompra(@Param("id") id: string) { return this.productos.costosCompra(id); }

  @Get(":id/historial")
  @RequierePermiso("INVENTARIO.LEER")
  historial(@Param("id") id: string) { return this.productos.historial(id); }

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
