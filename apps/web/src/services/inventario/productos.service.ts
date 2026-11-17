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
export type ProductoTarjeta = Pick<Producto, "id" | "codigoInterno" | "nombre" | "descripcion" | "activo" | "categoriaId" | "categoria" | "marcaId" | "marca" | "unidadBaseCodigo" | "unidadBase" | "creadoEn" | "stockActual" | "stockMinimo">;
export type PaginaProductos = { items: ProductoTarjeta[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type PrecioCatalogo = {
  id: string; productoId: string; codigo: string; producto: string; marca: string;
  presentacion: string; presentacionBase: boolean; listaPrecio: string; precio: string; cantidadMinima: string;
  vigenteDesde: string | null; vigenteHasta: string | null; precioActivo: boolean; productoActivo: boolean;
};
export type PaginaPreciosCatalogo = { items: PrecioCatalogo[]; total: number; pagina: number; porPagina: number; totalPaginas: number };
export type AlertaStockBajo = { id: string; codigo: string; nombre: string; stockActual: string; stockMinimo: string; unidad: string };
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
  precios: PrecioProducto[];
  activo?: boolean;
};

export function redondearPrecioADecimos(valor: string) {
  if (!valor.trim()) return valor;
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero < 0) return valor;
  const centimos = Math.round(numero * 100);
  return (Math.ceil(centimos / 10) * 10 / 100).toFixed(2);
}

export const servicioProductos = {
  catalogos: () => solicitarApi<CatalogosProducto>("/inventario/productos/catalogos"),
  alertasStockBajo: () => solicitarApi<AlertaStockBajo[]>("/inventario/productos/alertas-stock-bajo"),
  listar: (pagina: number, porPagina: number, busqueda: string) => {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaProductos>(`/inventario/productos?${parametros.toString()}`);
  },
  listarPrecios: (pagina: number, porPagina: number, busqueda: string) => {
    const parametros = new URLSearchParams({ pagina: String(pagina), porPagina: String(porPagina), busqueda });
    return solicitarApi<PaginaPreciosCatalogo>(`/inventario/productos/precios?${parametros.toString()}`);
  },
  actualizarPrecio: (id: string, precio: string) => solicitarApi<{ id: string; precio: string }>(`/inventario/productos/precios/${id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ precio }),
  }),
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
