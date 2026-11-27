type FilaDiaria = { fecha: string; total: string | null };

/**
 * Suma varias series diarias en una sola, ordenada por fecha. Opera en centavos enteros
 * para que 0.1 + 0.2 no arrastre error de coma flotante.
 */
export function sumarFlujosDiarios(...series: ReadonlyArray<ReadonlyArray<FilaDiaria>>): Array<{ fecha: string; total: string }> {
  const centavos = new Map<string, number>();
  for (const serie of series) {
    for (const fila of serie) {
      const importe = Math.round(Number(fila.total ?? 0) * 100);
      if (!Number.isFinite(importe) || importe === 0) continue;
      centavos.set(fila.fecha, (centavos.get(fila.fecha) ?? 0) + importe);
    }
  }
  return [...centavos.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([fecha, total]) => ({ fecha, total: (total / 100).toFixed(2) }));
}

/** Suma importes en centavos enteros y devuelve el total con dos decimales. */
export function sumarImportes(...importes: ReadonlyArray<string>) {
  return (importes.reduce((suma, importe) => suma + Math.round(Number(importe) * 100), 0) / 100).toFixed(2);
}

/** Días calendario entre dos fechas ISO, ambas incluidas. */
export function diasEntreFechas(desde: string, hasta: string) {
  const inicio = Date.parse(`${desde}T00:00:00.000Z`);
  const fin = Date.parse(`${hasta}T00:00:00.000Z`);
  return Math.floor((fin - inicio) / 86_400_000) + 1;
}

type FilaConCosto = { tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; categoria: string | null; venta: string; ventaConCosto: string; costo: string };
type PermisosCosto = { inventario: boolean; mototaxis: boolean };

/**
 * Oculta el costo y el margen de las líneas que el usuario no puede ver: los repuestos requieren INVENTARIO.LEER
 * y los mototaxis MOTOTAXIS.LEER. Las ventas se conservan, porque eso solo exige permiso de ingresos.
 */
export function aplicarPermisosDeCosto(filas: ReadonlyArray<FilaConCosto>, permisos: PermisosCosto) {
  return filas.map((fila) => {
    const puedeVerCosto = fila.tipo === "PRODUCTO" ? permisos.inventario : fila.tipo === "MOTOTAXI" ? permisos.mototaxis : false;
    return { tipo: fila.tipo, categoria: fila.categoria, venta: fila.venta, ventaConCosto: puedeVerCosto ? fila.ventaConCosto : null, costo: puedeVerCosto ? fila.costo : null };
  });
}
