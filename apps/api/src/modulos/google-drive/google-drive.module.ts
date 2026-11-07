import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { ControladorArchivosAlmacenados, ControladorGoogleDrive } from "./google-drive.controller";
import { ServicioGoogleDrive } from "./google-drive.service";

@Module({ imports: [ModuloAutenticacion], controllers: [ControladorGoogleDrive, ControladorArchivosAlmacenados], providers: [ServicioGoogleDrive], exports: [ServicioGoogleDrive] })
export class ModuloGoogleDrive {}
