import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ModuloEmpresa } from "../empresa/empresa.module";
import { ControladorImpresion } from "./impresion.controller";
import { ServicioImpresion } from "./impresion.service";

@Module({ imports: [ModuloAutenticacion, ModuloEmpresa], controllers: [ControladorImpresion], providers: [ServicioImpresion, GuardiaSesion] })
export class ModuloImpresion {}
