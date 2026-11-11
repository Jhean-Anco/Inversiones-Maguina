import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorArchivosLocales } from "./almacenamiento.controller";
import { ServicioAlmacenamiento } from "./almacenamiento.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorArchivosLocales], providers: [ServicioAlmacenamiento, GuardiaSesion], exports: [ServicioAlmacenamiento] })
export class ModuloAlmacenamiento {}
