const formateadorCantidadStock = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

export function formatearCantidadStock(valor: string) {
  return formateadorCantidadStock.format(Number(valor) || 0);
}
