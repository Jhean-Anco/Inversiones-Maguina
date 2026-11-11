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

  @Get() @RequierePermiso("INGRESOS.LEER") listarVentas(@Query("tipoVenta") tipoVenta?: string, @Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) {
    return this.ingresos.listarVentas({ tipoVenta, pagina, porPagina, busqueda });
  }

  @Get("productos") @RequierePermiso("INGRESOS.LEER") buscarProductos(@Query("busqueda") busqueda?: string, @Query("catalogo") catalogo?: string, @Query("limite") limite?: string, @Query("escaneo") escaneo?: string) { return this.ingresos.buscarProductos(busqueda, catalogo === "1", limite, escaneo === "1"); }
  @Get("mototaxis") @RequierePermiso("INGRESOS.CREAR") buscarMototaxisVenta(@Query("busqueda") busqueda?: string) { return this.ingresos.buscarMototaxisVenta(busqueda); }
  @Get("series") @RequierePermiso("INGRESOS.CREAR") obtenerNumeraciones() { return this.ingresos.obtenerNumeraciones(); }
  @Get("series/configuracion") @RequierePermiso("FINANZAS.ADMINISTRAR") listarSeriesConfiguradas() { return this.ingresos.listarSeriesConfiguradas(); }
  @Post("series/configuracion") @RequierePermiso("FINANZAS.ADMINISTRAR") guardarSerieConfigurada(@Body() datos: unknown) { return this.ingresos.guardarSerieConfigurada(datos); }
  @Get("guias") @RequierePermiso("INGRESOS.LEER") listarGuias(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string) { return this.ingresos.listarGuias(pagina, porPagina); }
  @Post("guias") @RequierePermiso("INGRESOS.CREAR") emitirGuia(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.emitirGuia(datos, solicitud.usuario.id); }
  @Post("guias/:id/consultar") @RequierePermiso("INGRESOS.LEER") consultarGuia(@Param("id") id: string) { return this.ingresos.consultarGuia(id); }
  @Get("medios-pago") @RequierePermiso("INGRESOS.CREAR") obtenerMediosPagoDisponibles() { return this.ingresos.mediosPagoDisponibles(); }
  @Get("ordenes-servicio") @RequierePermiso("INGRESOS.LEER") listarOrdenesServicio(@Query("busqueda") busqueda?: string) { return this.ingresos.listarOrdenesServicio(busqueda); }
  @Post("ordenes-servicio") @RequierePermiso("INGRESOS.CREAR") crearOrdenServicio(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.crearOrdenServicio(datos, solicitud.usuario.id); }
  @Patch("ordenes-servicio/:id") @RequierePermiso("INGRESOS.CREAR") actualizarOrdenServicio(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.actualizarOrdenServicio(id, datos, solicitud.usuario.id); }
  @Post("ordenes-servicio/:id/emitir") @RequierePermiso("INGRESOS.CREAR") emitirOrdenServicio(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.emitirOrdenServicio(id, datos, solicitud.usuario.id); }
  @Get("cotizaciones") @RequierePermiso("INGRESOS.LEER") listarCotizaciones(@Query("busqueda") busqueda?: string) { return this.ingresos.listarCotizaciones(busqueda); }
  @Post("cotizaciones") @RequierePermiso("INGRESOS.CREAR") crearCotizacion(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.crearCotizacion(datos, solicitud.usuario.id); }
  @Patch("cotizaciones/:id/estado") @RequierePermiso("INGRESOS.CREAR") cambiarEstadoCotizacion(@Param("id") id: string, @Body() datos: unknown) { return this.ingresos.cambiarEstadoCotizacion(id, datos); }
  @Post("cotizaciones/:id/convertir") @RequierePermiso("INGRESOS.CREAR") convertirCotizacion(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.convertirCotizacion(id, datos, solicitud.usuario.id); }
  @Get("clientes") @RequierePermiso("PERSONAS.LEER") buscarClientes(@Query("busqueda") busqueda?: string) { return this.ingresos.buscarClientes(busqueda); }
  @Get("clientes/listado") @RequierePermiso("PERSONAS.LEER") listarClientes(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.ingresos.listarClientes(pagina, porPagina, busqueda); }
  @Get("clientes/consulta-identidad") @RequierePermiso("PERSONAS.CREAR") consultarIdentidadCliente(@Query("tipoDocumento") tipoDocumento?: string, @Query("numeroDocumento") numeroDocumento?: string) { return this.ingresos.consultarIdentidadCliente(tipoDocumento, numeroDocumento); }
  @Post("clientes") @RequierePermiso("PERSONAS.CREAR") registrarCliente(@Body() datos: unknown) { return this.ingresos.registrarCliente(datos); }
  @Patch("clientes/:id") @RequierePermiso("PERSONAS.EDITAR") actualizarCliente(@Param("id") id: string, @Body() datos: unknown) { return this.ingresos.actualizarCliente(id, datos); }
  @Get("nubefact/estado") @RequierePermiso("INGRESOS.CREAR") estadoNubefact() { return this.ingresos.estadoNubefact(); }
  @Post() @RequierePermiso("INGRESOS.CREAR") crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.crear(datos, solicitud.usuario.id); }
  @Get(":id/notas/fuente") @RequierePermiso("INGRESOS.LEER") obtenerFuenteNota(@Param("id") id: string) { return this.ingresos.obtenerFuenteNota(id); }
  @Get(":id/notas") @RequierePermiso("INGRESOS.LEER") listarNotas(@Param("id") id: string) { return this.ingresos.listarNotas(id); }
  @Post(":id/notas") @RequierePermiso("FACTURACION.NOTAS_EMITIR") emitirNota(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.emitirNota(id, datos, solicitud.usuario.id); }
  @Get(":id/pagos") @RequierePermiso("INGRESOS.LEER") listarPagos(@Param("id") id: string) { return this.ingresos.listarPagos(id); }
  @Post(":id/pagos") @RequierePermiso("INGRESOS.CREAR") registrarPago(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return this.ingresos.registrarPago(id, datos, solicitud.usuario.id); }
}
