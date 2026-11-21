import type { COLORES_SUGERIDOS_MOTOTAXI, ModeloMototaxi } from "../../services/mototaxis.service";

type Compra = { costoAdquisicion: string; modeloId: string };
type UnidadAdicional = { costoAdquisicion: string };
type DisponibleColor = { modeloId: string; marca: string; modelo: string; color: string | null; cantidad: number };

export function obtenerVistaCompraMototaxi(
  compra: Compra,
  unidadesAdicionales: UnidadAdicional[],
  disponiblesPorColor: DisponibleColor[],
  modelos: ModeloMototaxi[],
  coloresSugeridos: typeof COLORES_SUGERIDOS_MOTOTAXI,
) {
  const modeloSeleccionado = modelos.find((modelo) => modelo.id === compra.modeloId);
  const coloresModeloCompra = modeloSeleccionado?.coloresDisponibles ?? [];
  return {
    totalCompra: Number(compra.costoAdquisicion || 0) + unidadesAdicionales.reduce((total, unidad) => total + Number(unidad.costoAdquisicion || 0), 0),
    totalDisponibleColor: disponiblesPorColor.reduce((total, item) => total + item.cantidad, 0),
    coloresModeloCompra,
    coloresCompraDisponibles: coloresModeloCompra.length ? coloresModeloCompra : coloresSugeridos,
  };
}
