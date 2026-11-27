import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { UsuarioActual, type UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioReportes } from "./reportes.service";
import { diasEntreFechas } from "./reportes.util";
import { validarRangoFechas as validarRango } from "../../utilidades/validar-rango-fechas";

const MAXIMO_DIAS_COMPARATIVO = 800;

@Controller("reportes")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorReportes {
  constructor(private readonly reportes: ServicioReportes) {}
  @Get("ingresos/dashboard") @RequierePermiso("INGRESOS.LEER") ingresosDashboard(@Query("desde") desde?: string, @Query("hasta") hasta?: string, @Query("mesDesde") mesDesde?: string) {
    const anual = validarRango(desde, hasta);
    return this.reportes.ingresosDashboard(validarRango(mesDesde, anual.hasta), anual);
  }
  @Get("ingresos/reporte") @RequierePermiso("INGRESOS.LEER") reporteIngresos(@Query("desde") desde?: string, @Query("hasta") hasta?: string, @Query("linea") linea?: string) {
    if (linea && !["PRODUCTO", "MOTOTAXI", "SERVICIO"].includes(linea)) throw new BadRequestException("Selecciona una línea de ingresos válida.");
    return this.reportes.reporteIngresos(validarRango(desde, hasta), linea as "PRODUCTO" | "MOTOTAXI" | "SERVICIO" | undefined);
  }
  @Get("ingresos/comparativo") @RequierePermiso("INGRESOS.LEER") ingresosComparativo(@Query("desde") desde?: string, @Query("hasta") hasta?: string) {
    const rango = validarRango(desde, hasta);
    if (diasEntreFechas(rango.desde, rango.hasta) > MAXIMO_DIAS_COMPARATIVO) throw new BadRequestException(`El rango no puede superar ${MAXIMO_DIAS_COMPARATIVO} días.`);
    return this.reportes.ingresosComparativo(rango);
  }
  @Get("ingresos/rentabilidad") @RequierePermiso("INGRESOS.LEER") rentabilidad(@UsuarioActual() usuario: UsuarioAutenticado, @Query("desde") desde?: string, @Query("hasta") hasta?: string) {
    return this.reportes.rentabilidad(validarRango(desde, hasta), usuario.permisos ?? []);
  }
  @Get("ingresos/cobranza") @RequierePermiso("INGRESOS.LEER") cobranza(@Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.reportes.cobranza(validarRango(desde, hasta)); }
  @Get("ingresos/articulos") @RequierePermiso("INGRESOS.LEER") articulos(@Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.reportes.articulosMasVendidos(validarRango(desde, hasta)); }
  @Get("ingresos/horarios") @RequierePermiso("INGRESOS.LEER") horarios(@Query("desde") desde?: string, @Query("hasta") hasta?: string) {
    const rango = validarRango(desde, hasta);
    if (diasEntreFechas(rango.desde, rango.hasta) > MAXIMO_DIAS_COMPARATIVO) throw new BadRequestException(`El rango no puede superar ${MAXIMO_DIAS_COMPARATIVO} días.`);
    return this.reportes.horarios(rango);
  }
  @Get("inventario") @RequierePermiso("INVENTARIO.LEER") inventario(@UsuarioActual() usuario: UsuarioAutenticado, @Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.reportes.inventario(validarRango(desde, hasta), usuario.permisos ?? []); }
  @Get("resumen") resumen(@UsuarioActual() usuario: UsuarioAutenticado) { return this.reportes.resumenGerencial(usuario.permisos ?? []); }
}
