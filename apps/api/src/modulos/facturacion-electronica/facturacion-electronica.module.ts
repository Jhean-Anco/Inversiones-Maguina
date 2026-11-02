import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { ControladorComprobantesFacturacion, ControladorEmisorFacturacion } from "./facturacion-electronica.controller";
import { ServicioEmisorFacturacion } from "./emisor.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorEmisorFacturacion, ControladorComprobantesFacturacion], providers: [ServicioEmisorFacturacion], exports: [ServicioEmisorFacturacion] })
export class ModuloFacturacionElectronica {}
