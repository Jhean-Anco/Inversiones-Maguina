import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorIngresos } from "./ingresos.controller";
import { ServicioIngresos } from "./ingresos.service";
import { ModuloAlmacenamiento } from "../almacenamiento/almacenamiento.module";

@Module({ imports: [ModuloAutenticacion, ModuloAlmacenamiento], controllers: [ControladorIngresos], providers: [ServicioIngresos, GuardiaSesion] })
export class ModuloIngresos {}
