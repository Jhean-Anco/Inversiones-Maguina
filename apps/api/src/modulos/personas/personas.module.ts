import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { ControladorConsultaIdentidad } from "./consulta-identidad.controller";
import { ControladorConductores } from "./conductores.controller";
import { ServicioConductores } from "./conductores.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorConsultaIdentidad, ControladorConductores], providers: [ServicioConductores] })
export class ModuloPersonas {}
