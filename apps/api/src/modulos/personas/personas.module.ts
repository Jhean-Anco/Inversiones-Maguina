import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { ControladorConsultaIdentidad } from "./consulta-identidad.controller";
import { ControladorConductores } from "./conductores.controller";
import { ServicioConductores } from "./conductores.service";
import { ControladorTransportistas } from "./transportistas.controller";
import { ServicioTransportistas } from "./transportistas.service";
import { ControladorPersonal } from "./personal.controller";
import { ServicioPersonal } from "./personal.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorConsultaIdentidad, ControladorConductores, ControladorTransportistas, ControladorPersonal], providers: [ServicioConductores, ServicioTransportistas, ServicioPersonal] })
export class ModuloPersonas {}
