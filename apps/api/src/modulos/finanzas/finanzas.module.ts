import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorFinanzas } from "./finanzas.controller";
import { ServicioFinanzas } from "./finanzas.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorFinanzas], providers: [ServicioFinanzas, GuardiaSesion] })
export class ModuloFinanzas {}
