import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorMototaxis } from "./mototaxis.controller";
import { ServicioMototaxis } from "./mototaxis.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorMototaxis], providers: [ServicioMototaxis, GuardiaSesion] })
export class ModuloMototaxis {}
