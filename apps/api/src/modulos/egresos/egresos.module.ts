import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorEgresos } from "./egresos.controller";
import { ServicioEgresos } from "./egresos.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorEgresos], providers: [ServicioEgresos, GuardiaSesion] })
export class ModuloEgresos {}
