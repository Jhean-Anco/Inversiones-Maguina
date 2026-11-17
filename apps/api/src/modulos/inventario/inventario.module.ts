import { Module } from "@nestjs/common";
import { ModuloAutenticacion } from "../autenticacion/autenticacion.module";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { ControladorCategorias } from "./categorias.controller";
import { ServicioCategorias } from "./categorias.service";
import { ControladorMarcas } from "./marcas.controller";
import { ServicioMarcas } from "./marcas.service";
import { ControladorProductos } from "./productos.controller";
import { ServicioProductos } from "./productos.service";
import { ControladorEntradasStock } from "./entradas-stock.controller";
import { ServicioEntradasStock } from "./entradas-stock.service";
import { ControladorMovimientosStock } from "./movimientos-stock.controller";
import { ServicioMovimientosStock } from "./movimientos-stock.service";

@Module({
  imports: [ModuloAutenticacion],
  controllers: [ControladorCategorias, ControladorMarcas, ControladorProductos, ControladorEntradasStock, ControladorMovimientosStock],
  providers: [ServicioCategorias, ServicioMarcas, ServicioProductos, ServicioEntradasStock, ServicioMovimientosStock, GuardiaSesion],
})
export class ModuloInventario {}
