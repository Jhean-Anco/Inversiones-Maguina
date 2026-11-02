import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
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
  @Get("modelos") @RequierePermiso("MOTOTAXIS.LEER") listarModelos(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarModelos(busqueda); }
  @Post("modelos") @RequierePermiso("MOTOTAXIS.CREAR") crearModelo(@Body() datos: unknown) { return this.mototaxis.crearModelo(datos); }
  @Get("proveedores") @RequierePermiso("MOTOTAXIS.LEER") listarProveedores(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarProveedores(busqueda); }
  @Post("proveedores") @RequierePermiso("MOTOTAXIS.CREAR") crearProveedor(@Body() datos: unknown) { return this.mototaxis.crearProveedor(datos); }
  @Get("unidades") @RequierePermiso("MOTOTAXIS.LEER") listarUnidades(@Query("busqueda") busqueda?: string, @Query("estado") estado?: string, @Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string) { return this.mototaxis.listarUnidades({ busqueda, estado, pagina, porPagina }); }
  @Post("compras") @RequierePermiso("MOTOTAXIS.CREAR") crearCompra(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.crearCompra(datos, solicitud.usuario.id); }
  @Post("unidades/:id/estado") @RequierePermiso("MOTOTAXIS.EDITAR") cambiarEstado(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.cambiarEstado(id, datos, solicitud.usuario.id); }
  @Get("unidades/:id/movimientos") @RequierePermiso("MOTOTAXIS.LEER") listarMovimientos(@Param("id") id: string) { return this.mototaxis.listarMovimientos(id); }
  @Get("garantias") @RequierePermiso("MOTOTAXIS.LEER") listarGarantias() { return this.mototaxis.listarGarantias(); }
  @Get("reclamos") @RequierePermiso("MOTOTAXIS.LEER") listarReclamos() { return this.mototaxis.listarReclamos(); }
  @Post("reclamos") @RequierePermiso("MOTOTAXIS.CREAR") crearReclamo(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.mototaxis.crearReclamo(datos, solicitud.usuario.id); }
}
