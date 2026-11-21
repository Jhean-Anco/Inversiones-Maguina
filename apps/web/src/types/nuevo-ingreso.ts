import type { MototaxiParaIngreso, ProductoParaIngreso } from "../services/ingresos.service";

export type AfectacionIgv = "GRAVADO" | "EXONERADO" | "INAFECTO";

export type LineaCarrito =
  | { clave: string; tipo: "PRODUCTO"; producto: ProductoParaIngreso; listaPrecioCodigo?: string; cantidad: string; descuento: string; afectacionIgv: AfectacionIgv }
  | { clave: string; tipo: "SERVICIO"; descripcion: string; cantidad: string; precio: string; descuento: string; afectacionIgv: AfectacionIgv }
  | { clave: string; tipo: "MOTOTAXI"; mototaxi: MototaxiParaIngreso; cantidad: string; precio: string; descuento: string; afectacionIgv: AfectacionIgv };

export type TipoVenta = "REPUESTOS" | "MOTOTAXIS";
