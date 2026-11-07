import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorMototaxis } from "./mototaxis.controller";
import { ControladorDirectorioProveedores } from "./proveedores.controller";
import { ServicioMototaxis } from "./mototaxis.service";
import { ModuloGoogleDrive } from "../google-drive/google-drive.module";

@Module({ imports: [ModuloAutenticacion, ModuloGoogleDrive], controllers: [ControladorMototaxis, ControladorDirectorioProveedores], providers: [ServicioMototaxis, GuardiaSesion] })
export class ModuloMototaxis {}
