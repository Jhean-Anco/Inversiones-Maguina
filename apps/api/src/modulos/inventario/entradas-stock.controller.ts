import { Body, Controller, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioEntradasStock } from "./entradas-stock.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("inventario/entradas-stock")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorEntradasStock {
  constructor(private readonly entradas: ServicioEntradasStock) {}

  @Get("productos") @RequierePermiso("INVENTARIO.LEER") buscarProductos(@Query("busqueda") busqueda?: string) { return this.entradas.buscarProductos(busqueda); }
  @Get() @RequierePermiso("INVENTARIO.LEER") listar(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string, @Query("estadoPago") estadoPago?: string) { return this.entradas.listar({ pagina, porPagina, busqueda, estadoPago }); }
  @Get(":id") @RequierePermiso("INVENTARIO.LEER") consultar(@Param("id") id: string) { return this.entradas.consultar(id); }
  @Put(":id") @RequierePermiso("INVENTARIO.EDITAR") actualizar(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.entradas.actualizar(id, datos, solicitud.usuario.id); }
  @Post(":id/anular") @RequierePermiso("INVENTARIO.ANULAR") anular(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.entradas.anular(id, datos, solicitud.usuario.id); }
  @Post() @RequierePermiso("INVENTARIO.CREAR") crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) return this.entradas.crear(datos, solicitud.usuario.id);
    return this.entradas.crear(datos, solicitud.usuario.id);
  }
}
