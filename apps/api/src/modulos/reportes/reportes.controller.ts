import { BadRequestException, Controller, Get, Query, UseGuards } from "@nestjs/common";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioReportes } from "./reportes.service";

function validarRango(desde?: string, hasta?: string) {
  const fecha = (valor: string | undefined, nombre: string) => {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestException(`La fecha ${nombre} no es válida.`);
    const parseada = new Date(`${valor}T00:00:00.000Z`);
    if (Number.isNaN(parseada.getTime()) || parseada.toISOString().slice(0, 10) !== valor) throw new BadRequestException(`La fecha ${nombre} no es válida.`);
    return valor;
  };
  const inicio = fecha(desde, "desde");
  const fin = fecha(hasta, "hasta");
  if (inicio > fin) throw new BadRequestException("La fecha desde no puede ser posterior a la fecha hasta.");
  return { desde: inicio, hasta: fin };
}

@Controller("reportes")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorReportes {
  constructor(private readonly reportes: ServicioReportes) {}
  @Get("ingresos") @RequierePermiso("INGRESOS.LEER") ingresos(@Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.reportes.ingresos(validarRango(desde, hasta)); }
  @Get("inventario") @RequierePermiso("INVENTARIO.LEER") inventario(@Query("desde") desde?: string, @Query("hasta") hasta?: string) { return this.reportes.inventario(validarRango(desde, hasta)); }
  @Get("resumen") resumen() { return this.reportes.resumenGerencial(); }
}
