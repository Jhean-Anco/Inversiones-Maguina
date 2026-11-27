import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorEmpresa } from "./empresa.controller";
import { ServicioEmpresa } from "./empresa.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorEmpresa], providers: [ServicioEmpresa, GuardiaSesion], exports: [ServicioEmpresa] })
export class ModuloEmpresa {}
