import { solicitarApi } from "../api-cliente";
import { servicioCategorias } from "./catalogos.service";

export type OpcionCatalogo = { id: string; nombre: string; codigo?: string; descripcion?: string | null };
export type UnidadMedida = { codigo: string; nombre: string };
export type CatalogosProducto = {
  categorias: OpcionCatalogo[];
  marcas: OpcionCatalogo[];
  unidadesMedida: UnidadMedida[];
  tiposListasPrecio: OpcionCatalogo[];
};
export type CodigoProducto = { id?: string; tipo: "FABRICANTE" | "BARRAS" | "GTIN"; codigo: string };
export type PresentacionProducto = {
  id?: string;
  clave: string;
  unidadMedidaCodigo: string;
  unidadMedida?: string;
  nombre: string;
  factorAUnidadBase: string;
  seCompra: boolean;
  seVende: boolean;
  esBase?: boolean;
  activo?: boolean;
};
export type PrecioProducto = {
  id?: string;
  presentacionId?: string;
  presentacionClave: string;
  tipoListaPrecioId: string;
  tipoLista?: string;
  precio: string;
  cantidadMinima: string;
  vigenteDesde?: string | null;
  vigenteHasta?: string | null;
  activo?: boolean;
  usuario?: string | null;
};
export type Producto = {
  id: string;
  codigoInterno: string;
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  categoria: string;
  marcaId: string;
  marca: string;
  unidadBaseCodigo: string;
  stockActual: string;
  stockMinimo: string;
  precioGeneral: string | null;
  unidadBase: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
  afectoIgv: boolean;
  fichaTecnica: Record<string, string | number | boolean | null>;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
  codigos: CodigoProducto[];
  presentaciones: PresentacionProducto[];
  precios: PrecioProducto[];
};
export type ProductoTarjeta = Pick<Producto, "id" | "codigoInterno" | "nombre" | "descripcion" | "activo" | "categoriaId" | "categoria" | "marcaId" | "marca" | "unidadBaseCodigo" | "unidadBase" | "creadoEn" | "stockActual" | "stockMinimo" | "precioGeneral">;
export type PaginaProductos = { items: ProductoTarjeta[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type AlertaStockBajo = { id: string; codigo: string; nombre: string; stockActual: string; stockMinimo: string; unidad: string };
export type PaginaAlertasStockBajo = { items: AlertaStockBajo[]; total?: number; pagina: number; porPagina: number; hayMas: boolean };
export type DatosProducto = {
  nombre: string;
  descripcion: string | null;
  categoriaId: string;
  marcaId: string;
  unidadBaseCodigo: string;
  stockMinimo: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
  afectoIgv: boolean;
  fichaTecnica: Record<string, string | number | boolean | null>;
  codigos: CodigoProducto[];
  presentaciones: PresentacionProducto[];
  activo?: boolean;
};

export type HistorialProducto = {
  movimientos: { id: string; tipo: string; sentido: string | null; cantidad: string; fecha: string; motivo: string | null }[];
  compra: { fecha: string; importe: string | null } | null;
  venta: { fecha: string; importe: string | null } | null;
};
export type ConfiguracionPrecio = {
  presentacionId: string;
  tipoListaPrecioId: string;
  cantidadMinima: string;
  precio: string;
  vigenteDesde: string;
  vigenteHasta: string;
};

export const servicioProductos = {
  catalogos: () => solicitarApi<CatalogosProducto>("/inventario/productos/catalogos"),
  alertasStockBajo: (pagina = 1, porPagina = 20) => solicitarApi<PaginaAlertasStockBajo>(`/inventario/productos/alertas-stock-bajo?${new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina) })}`),
  listar: (pagina: number, porPagina: number, busqueda: string, filtros: { estado?: string; marca?: string; precio?: string } = {}) => {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda, ...filtros });
    return solicitarApi<PaginaProductos>(`/inventario/productos?${parametros.toString()}`);
  },
  configurarPrecio: (id: string, datos: ConfiguracionPrecio) => solicitarApi<PrecioProducto>(`/inventario/productos/${id}/precios`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos),
  }),
  corregirPrecio: (id: string, precioId: string, precio: string, precioAnterior: string) => solicitarApi<PrecioProducto>(`/inventario/productos/${id}/precios/${precioId}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ precio, precioAnterior }),
  }),
  costosCompra: (id: string) => solicitarApi<{ ultima: { fecha: string; importe: string | null } | null; promedioPonderado: string | null }>(`/inventario/productos/${id}/costos-compra`),
  historial: (id: string) => solicitarApi<HistorialProducto>(`/inventario/productos/${id}/historial`),
  consultar: (id: string) => solicitarApi<Producto>(`/inventario/productos/${id}`),
  async guardar(datos: DatosProducto, id?: string): Promise<{ producto: Producto; advertencia?: string }> {
    const producto = await solicitarApi<Producto>(`/inventario/productos${id ? `/${id}` : ""}`, {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    return { producto };
  },
  cambiarEstado: (id: string, activo: boolean) => solicitarApi<{ id: string; activo: boolean }>(`/inventario/productos/${id}/estado`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activo }),
  }),
  async crearMarca(nombre: string) {
    const marca = await solicitarApi<OpcionCatalogo>("/inventario/marcas", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }),
    });
    return { marca, advertencia: undefined as string | undefined };
  },
  async crearCategoria(nombre: string) {
    const categoria = await servicioCategorias.guardar({ nombre });
    return { categoria, advertencia: undefined as string | undefined };
  },
};
