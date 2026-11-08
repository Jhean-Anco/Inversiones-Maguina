import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorCategorias } from "./categorias.controller";
import { ServicioCategorias } from "./categorias.service";
import { ControladorMarcas } from "./marcas.controller";
import { ServicioMarcas } from "./marcas.service";
import { ControladorImagenesCatalogo } from "./imagenes-catalogo.controller";
import { ServicioImagenesCatalogo } from "./imagenes-catalogo.service";
import { ControladorProductos } from "./productos.controller";
import { ServicioProductos } from "./productos.service";
import { ControladorEntradasStock } from "./entradas-stock.controller";
import { ServicioEntradasStock } from "./entradas-stock.service";
import { ControladorMovimientosStock } from "./movimientos-stock.controller";
import { ServicioMovimientosStock } from "./movimientos-stock.service";
import { ControladorDocumentosRecibidos, ControladorSunatSire } from "./sunat-sire.controller";
import { ServicioSunatSire } from "./sunat-sire.service";
import { ModuloGoogleDrive } from "../google-drive/google-drive.module";

@Module({
  imports: [ModuloAutenticacion, ModuloGoogleDrive],
  controllers: [ControladorCategorias, ControladorMarcas, ControladorProductos, ControladorEntradasStock, ControladorImagenesCatalogo, ControladorMovimientosStock, ControladorSunatSire, ControladorDocumentosRecibidos],
  providers: [ServicioCategorias, ServicioMarcas, ServicioProductos, ServicioEntradasStock, ServicioImagenesCatalogo, ServicioMovimientosStock, ServicioSunatSire, GuardiaSesion],
})
export class ModuloInventario {}
