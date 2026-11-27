import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorIngresos } from "./ingresos.controller";
import { ServicioIngresos } from "./ingresos.service";
import { ServicioSeguimientoNubefact } from "./seguimiento-nubefact.service";
import { ControladorNotaVentaEdicion } from "./nota-venta-edicion.controller";
import { ServicioNotaVentaEdicion } from "./nota-venta-edicion.service";
import { ModuloAlmacenamiento } from "../almacenamiento/almacenamiento.module";

@Module({ imports: [ModuloAutenticacion, ModuloAlmacenamiento], controllers: [ControladorIngresos, ControladorNotaVentaEdicion], providers: [ServicioIngresos, ServicioSeguimientoNubefact, ServicioNotaVentaEdicion, GuardiaSesion] })
export class ModuloIngresos {}
