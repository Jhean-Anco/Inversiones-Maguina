import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
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
  @Get() @RequierePermiso("INVENTARIO.LEER") listar(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.entradas.listar({ pagina, porPagina, busqueda }); }
  @Get(":id") @RequierePermiso("INVENTARIO.LEER") consultar(@Param("id") id: string) { return this.entradas.consultar(id); }
  @Post(":id/evidencia") @RequierePermiso("INVENTARIO.CREAR") subirEvidencia(@Param("id") id: string, @Req() solicitud: FastifyRequest) { return this.entradas.guardarEvidencia(id, solicitud); }
  @Get(":id/evidencia") @RequierePermiso("INVENTARIO.LEER") async consultarEvidencia(@Param("id") id: string, @Res() respuesta: FastifyReply) { const evidencia = await this.entradas.leerEvidencia(id); return respuesta.type(evidencia.mime).header("Cache-Control", "private, no-store").header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(evidencia.nombre)}`).send(evidencia.contenido); }
  @Post() @RequierePermiso("INVENTARIO.CREAR") crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) return this.entradas.crear(datos, solicitud.usuario.id);
    return this.entradas.crear(datos, solicitud.usuario.id);
  }
}
