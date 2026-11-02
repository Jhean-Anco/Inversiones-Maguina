import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioIngresos } from "./ingresos.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("ingresos")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorIngresos {
  constructor(private readonly ingresos: ServicioIngresos) {}

  @Get("productos") @RequierePermiso("INGRESOS.LEER") buscarProductos(@Query("busqueda") busqueda?: string, @Query("catalogo") catalogo?: string, @Query("limite") limite?: string) { return this.ingresos.buscarProductos(busqueda, catalogo === "1", limite); }
  @Get("series") @RequierePermiso("INGRESOS.CREAR") obtenerNumeraciones() { return this.ingresos.obtenerNumeraciones(); }
  @Get("control-nrus") @RequierePermiso("INGRESOS.CREAR") obtenerControlNrus(@Query("fecha") fecha?: string) { return this.ingresos.obtenerControlNrus(fecha); }
  @Get("clientes") @RequierePermiso("PERSONAS.LEER") buscarClientes(@Query("busqueda") busqueda?: string) { return this.ingresos.buscarClientes(busqueda); }
  @Get("clientes/consulta-identidad") @RequierePermiso("PERSONAS.CREAR") consultarIdentidadCliente(@Query("tipoDocumento") tipoDocumento?: string, @Query("numeroDocumento") numeroDocumento?: string) { return this.ingresos.consultarIdentidadCliente(tipoDocumento, numeroDocumento); }
  @Post("clientes") @RequierePermiso("PERSONAS.CREAR") registrarCliente(@Body() datos: unknown) { return this.ingresos.registrarCliente(datos); }
  @Patch("clientes/:id") @RequierePermiso("PERSONAS.EDITAR") actualizarCliente(@Param("id") id: string, @Body() datos: unknown) { return this.ingresos.actualizarCliente(id, datos); }
  @Get("nubefact/estado") @RequierePermiso("FACTURACION.LEER") estadoNubefact() { return this.ingresos.estadoNubefact(); }
  @Post() @RequierePermiso("INGRESOS.CREAR") crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.crear(datos, solicitud.usuario.id); }
  @Get(":id/pagos") @RequierePermiso("INGRESOS.LEER") listarPagos(@Param("id") id: string) { return this.ingresos.listarPagos(id); }
  @Post(":id/pagos") @RequierePermiso("INGRESOS.CREAR") registrarPago(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.registrarPago(id, datos, solicitud.usuario.id); }
}
