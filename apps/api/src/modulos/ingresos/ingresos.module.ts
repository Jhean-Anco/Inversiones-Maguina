import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorIngresos } from "./ingresos.controller";
import { ServicioIngresos } from "./ingresos.service";
import { ModuloGoogleDrive } from "../google-drive/google-drive.module";

@Module({ imports: [ModuloAutenticacion, ModuloGoogleDrive], controllers: [ControladorIngresos], providers: [ServicioIngresos, GuardiaSesion] })
export class ModuloIngresos {}
