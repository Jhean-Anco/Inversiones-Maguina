import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorMototaxisInventario } from "./egresos.controller";
import { ServicioEgresos } from "./egresos.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorMototaxisInventario], providers: [ServicioEgresos, GuardiaSesion] })
export class ModuloEgresos {}
