import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { ControladorConsultaIdentidad } from "./consulta-identidad.controller";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorConsultaIdentidad] })
export class ModuloPersonas {}
