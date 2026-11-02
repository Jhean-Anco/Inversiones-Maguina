import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ModuloFacturacionElectronica } from "../facturacion-electronica/facturacion-electronica.module";
import { ControladorIngresos } from "./ingresos.controller";
import { ServicioIngresos } from "./ingresos.service";

@Module({ imports: [ModuloAutenticacion, ModuloFacturacionElectronica], controllers: [ControladorIngresos], providers: [ServicioIngresos, GuardiaSesion] })
export class ModuloIngresos {}
