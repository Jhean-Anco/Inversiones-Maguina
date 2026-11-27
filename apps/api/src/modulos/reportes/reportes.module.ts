import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorReportes } from "./reportes.controller";
import { ServicioReportes } from "./reportes.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorReportes], providers: [ServicioReportes, GuardiaSesion] })
export class ModuloReportes {}
