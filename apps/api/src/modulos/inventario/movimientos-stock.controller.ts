import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioMovimientosStock } from "./movimientos-stock.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("inventario/movimientos-stock")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorMovimientosStock {
  constructor(private readonly movimientos: ServicioMovimientosStock) {}

  @Get("productos")
  @RequierePermiso("INVENTARIO.LEER")
  buscarProductos(@Query("busqueda") busqueda?: string) { return this.movimientos.buscarProductos(busqueda); }

  @Get()
  @RequierePermiso("INVENTARIO.LEER")
  listar(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string, @Query("tipo") tipo?: string) {
    return this.movimientos.listar({ pagina, porPagina, busqueda, tipo });
  }

  @Post("ajustes")
  @RequierePermiso("INVENTARIO.EDITAR")
  crearAjuste(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    return this.movimientos.crearAjuste(datos, solicitud.usuario.id);
  }
}
