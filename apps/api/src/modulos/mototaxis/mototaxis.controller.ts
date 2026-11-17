import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioMototaxis } from "./mototaxis.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("mototaxis")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorMototaxis {
  constructor(private readonly mototaxis: ServicioMototaxis) {}

  @Get("marcas") @RequierePermiso("MOTOTAXIS.LEER") listarMarcas() { return this.mototaxis.listarMarcas(); }
  @Post("marcas") @RequierePermiso("MOTOTAXIS.CREAR") crearMarca(@Body() datos: unknown) { return this.mototaxis.crearMarca(datos); }
  @Get("modelos") @RequierePermiso("MOTOTAXIS.LEER") listarModelos(@Query("busqueda") busqueda?: string, @Query("incluirInactivos") incluirInactivos?: string) { return this.mototaxis.listarModelos(busqueda, incluirInactivos === "true"); }
  @Get("modelos/:id/analisis") @RequierePermiso("MOTOTAXIS.LEER") obtenerAnalisisModelo(@Param("id") id: string) { return this.mototaxis.obtenerAnalisisModelo(id); }
  @Post("modelos") @RequierePermiso("MOTOTAXIS.CREAR") crearModelo(@Body() datos: unknown) { return this.mototaxis.crearModelo(datos); }
  @Patch("modelos/:id/precio-venta") @RequierePermiso("MOTOTAXIS.EDITAR") actualizarPrecioVentaModelo(@Param("id") id: string, @Body() datos: unknown) { return this.mototaxis.actualizarPrecioVentaModelo(id, datos); }
  @Patch("modelos/:id") @RequierePermiso("MOTOTAXIS.EDITAR") actualizarModelo(@Param("id") id: string, @Body() datos: unknown) { return this.mototaxis.actualizarModelo(id, datos); }
  @Get("proveedores") @RequierePermiso("MOTOTAXIS.LEER") listarProveedores(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarProveedores(busqueda); }
  @Post("proveedores") @RequierePermiso("MOTOTAXIS.CREAR") crearProveedor(@Body() datos: unknown) { return this.mototaxis.crearProveedor(datos); }
  @Get("compras") @RequierePermiso("MOTOTAXIS.LEER") listarCompras(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarCompras(busqueda); }
  @Post("compras/:id/pagos") @RequierePermiso("MOTOTAXIS.CREAR") aplicarPagoCompra(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.aplicarPagoCompra(id, datos, solicitud.usuario.id); }
  @Get("compras/:id/pagos") @RequierePermiso("MOTOTAXIS.LEER") listarPagosCompra(@Param("id") id: string) { return this.mototaxis.listarPagosCompra(id); }
  @Get("unidades") @RequierePermiso("MOTOTAXIS.LEER") listarUnidades(@Query("busqueda") busqueda?: string, @Query("estado") estado?: string, @Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string) { return this.mototaxis.listarUnidades({ busqueda, estado, pagina, porPagina }); }
  @Get("ajustes-inventario") @RequierePermiso("MOTOTAXIS.LEER") listarAjustesInventario() { return this.mototaxis.listarAjustesInventario(); }
  @Get("ajustes-inventario/:modeloId/reconteo") @RequierePermiso("MOTOTAXIS.LEER") obtenerReconteoModelo(@Param("modeloId") modeloId: string) { return this.mototaxis.obtenerReconteoModelo(modeloId); }
  @Post("ajustes-inventario") @RequierePermiso("MOTOTAXIS.EDITAR") crearAjusteInventario(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.crearAjusteInventario(datos, solicitud.usuario.id); }
  @Post("compras") @RequierePermiso("MOTOTAXIS.CREAR") crearCompra(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.crearCompra(datos, solicitud.usuario.id); }
  @Post("unidades/:id/estado") @RequierePermiso("MOTOTAXIS.EDITAR") cambiarEstado(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.cambiarEstado(id, datos, solicitud.usuario.id); }
  @Get("unidades/:id/movimientos") @RequierePermiso("MOTOTAXIS.LEER") listarMovimientos(@Param("id") id: string) { return this.mototaxis.listarMovimientos(id); }
  @Get("garantias") @RequierePermiso("MOTOTAXIS.LEER") listarGarantias() { return this.mototaxis.listarGarantias(); }
  @Get("reclamos") @RequierePermiso("MOTOTAXIS.LEER") listarReclamos() { return this.mototaxis.listarReclamos(); }
  @Post("reclamos") @RequierePermiso("MOTOTAXIS.CREAR") crearReclamo(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.crearReclamo(datos, solicitud.usuario.id); }
}
