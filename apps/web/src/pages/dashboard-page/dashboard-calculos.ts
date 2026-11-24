import type { FiltroReporte, FlujoIngresosDashboard } from "../../services/reportes.service";
import type { FlujoFinanciero } from "../../services/finanzas.service";
import type { ImportesGrafico, PuntoIngresos } from "./dashboard-chart-types";
import { isoLocal } from "./dashboard-fechas";

export type ClaveSerie = "total" | keyof ImportesGrafico;
export type Comparativo = {
  actual: number;
  anterior: number;
  /** Variación en porcentaje; null cuando no hay base de comparación (periodo anterior en cero). */
  variacion: number | null;
  /** Acumulado día a día del mes en curso y del mes anterior, para minigráficos. */
  serieActual: number[];
  serieAnterior: number[];
};

const aIso = (fecha: Date) => fecha.toISOString().slice(0, 10);
const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

export function variacionPorcentual(actual: number, anterior: number): number | null {
  if (anterior === 0) return actual === 0 ? 0 : null;
  return ((actual - anterior) / anterior) * 100;
}

/** Saldo neto de caja (cobrado menos pagado) de una composición de caja, en una moneda. */
export function saldoNetoDeCaja(items: ReadonlyArray<{ moneda: string; sentido: "INGRESO" | "EGRESO"; importe: string }>, moneda: string) {
  return items.filter((item) => item.moneda === moneda).reduce((suma, item) => suma + (item.sentido === "INGRESO" ? Number(item.importe) : -Number(item.importe)), 0);
}

export type PuntoPareto = { nombre: string; tipo: string; total: number; acumulado: number };

/** Ordena los artículos por importe y calcula el % acumulado sobre el total de ventas del mes. */
export function construirPareto(articulos: ReadonlyArray<{ descripcion: string; tipo: string; total: string }>, totalVentasMes: number): PuntoPareto[] {
  const ordenados = articulos.map((articulo) => ({ nombre: articulo.descripcion, tipo: articulo.tipo, total: Number(articulo.total) })).filter((articulo) => articulo.total > 0).sort((a, b) => b.total - a.total);
  const base = totalVentasMes > 0 ? totalVentasMes : ordenados.reduce((suma, articulo) => suma + articulo.total, 0);
  let suma = 0;
  return ordenados.map((articulo) => {
    suma += articulo.total;
    return { ...articulo, acumulado: base > 0 ? Math.min(100, (suma / base) * 100) : 0 };
  });
}

export type MargenBruto = {
  /** Margen sobre las ventas cuyo costo se conoce; null si no hay ninguna. */
  porcentaje: number | null;
  margen: number;
  costo: number;
  ventaConCosto: number;
  ventaTotal: number;
  /** Porcentaje de las ventas del periodo cuyo costo se conoce (los servicios no tienen costo registrado). */
  cobertura: number;
};

type FilaVenta = { tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; categoria: string | null; venta: string; ventaConCosto: string | null; costo: string | null };

/** Margen bruto de lo vendido; null cuando el usuario no puede ver costos o no hay ventas con costo conocido. */
export function calcularMargen(filas: ReadonlyArray<FilaVenta>): MargenBruto | null {
  const ventaTotal = filas.reduce((suma, fila) => suma + Number(fila.venta), 0);
  const conCosto = filas.filter((fila) => fila.costo !== null && fila.ventaConCosto !== null);
  const ventaConCosto = conCosto.reduce((suma, fila) => suma + Number(fila.ventaConCosto), 0);
  if (ventaConCosto <= 0) return null;
  const costo = conCosto.reduce((suma, fila) => suma + Number(fila.costo), 0);
  const margen = ventaConCosto - costo;
  return { porcentaje: (margen / ventaConCosto) * 100, margen, costo, ventaConCosto, ventaTotal, cobertura: ventaTotal > 0 ? (ventaConCosto / ventaTotal) * 100 : 0 };
}

export type TeselaVenta = { nombre: string; valor: number; porcentaje: number };

/** Agrupa las ventas por categoría de repuesto, servicios y mototaxis; deja las mayores y junta el resto en "Otros". */
export function construirMapaVentas(filas: ReadonlyArray<FilaVenta>, maximo = 8): TeselaVenta[] {
  const porNombre = new Map<string, number>();
  for (const fila of filas) {
    const nombre = fila.tipo === "SERVICIO" ? "Servicios" : fila.tipo === "MOTOTAXI" ? "Mototaxis" : fila.categoria?.trim() || "Sin categoría";
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + Number(fila.venta));
  }
  const ordenadas = [...porNombre.entries()].filter(([, valor]) => valor > 0).sort((a, b) => b[1] - a[1]);
  const total = ordenadas.reduce((suma, [, valor]) => suma + valor, 0);
  if (total <= 0) return [];
  const principales = ordenadas.slice(0, maximo - 1);
  const resto = ordenadas.slice(maximo - 1);
  const teselas = resto.length > 1 ? [...principales, ["Otros", resto.reduce((suma, [, valor]) => suma + valor, 0)] as [string, number]] : ordenadas.slice(0, maximo);
  return teselas.map(([nombre, valor]) => ({ nombre, valor, porcentaje: (valor / total) * 100 }));
}

export type PasoCascada = { clave: string; nombre: string; tipo: "inicio" | "suma" | "resta" | "final"; valor: number; rango: [number, number] };
export type CascadaCaja = { pasos: PasoCascada[]; cobrado: number; saldoNeto: number };

const conceptosCascada = [
  { clave: "NOTA_DEBITO", nombre: "Notas de débito", conceptos: ["NOTA_DEBITO"], sentido: "suma" },
  { clave: "REPUESTOS", nombre: "Compra de repuestos", conceptos: ["COMPRA_REPUESTOS"], sentido: "resta" },
  { clave: "MOTOTAXIS", nombre: "Compra de mototaxis", conceptos: ["COMPRA_MOTOTAXIS"], sentido: "resta" },
  { clave: "GASTOS", nombre: "Gastos y activos", conceptos: ["GASTOS", "ACTIVOS"], sentido: "resta" },
  { clave: "NOTA_CREDITO", nombre: "Notas de crédito", conceptos: ["NOTA_CREDITO"], sentido: "resta" },
] as const;

/** Cascada de lo cobrado hasta el saldo neto, en la moneda indicada. Su saldo coincide con el del flujo financiero. */
export function construirCascadaCaja(items: ReadonlyArray<{ moneda: string; concepto: string; importe: string }>, moneda: string): CascadaCaja {
  const suma = (conceptos: ReadonlyArray<string>) => items.filter((item) => item.moneda === moneda && conceptos.includes(item.concepto)).reduce((total, item) => total + Number(item.importe), 0);
  const cobrado = suma(["COBRANZA", "ADELANTO_ORDEN"]);
  const pasos: PasoCascada[] = [{ clave: "COBRADO", nombre: "Cobrado", tipo: "inicio", valor: cobrado, rango: [0, cobrado] }];
  let acumulado = cobrado;
  for (const concepto of conceptosCascada) {
    const valor = suma(concepto.conceptos);
    if (valor === 0) continue;
    const siguiente = concepto.sentido === "suma" ? acumulado + valor : acumulado - valor;
    pasos.push({ clave: concepto.clave, nombre: concepto.nombre, tipo: concepto.sentido, valor, rango: [Math.min(acumulado, siguiente), Math.max(acumulado, siguiente)] });
    acumulado = siguiente;
  }
  pasos.push({ clave: "SALDO", nombre: "Saldo neto", tipo: "final", valor: acumulado, rango: [Math.min(0, acumulado), Math.max(0, acumulado)] });
  return { pasos, cobrado, saldoNeto: acumulado };
}

export type EstadoMeta = "adelante" | "en-ritmo" | "atrasado";
export type AvanceMeta = {
  clave: "VENTAS_MES" | "COBRANZA" | "MARGEN";
  titulo: string;
  unidad: "soles" | "porcentaje";
  actual: number | null;
  meta: number | null;
  anterior: number | null;
  /** Lo que se debería llevar hoy si el ritmo fuera parejo hasta la meta; solo para ingresos. */
  esperado: number | null;
  /** Avance sobre la meta, en porcentaje; null si no hay meta o dato. */
  avance: number | null;
  estado: EstadoMeta | null;
};

/** Último día del mes anterior al de `hoy`, para medir el mes anterior completo. */
export function mesAnteriorCompleto(hoy: string) {
  const [anio, mes] = hoy.split("-").map(Number);
  return { desde: aIso(new Date(Date.UTC(anio, mes - 2, 1))), hasta: aIso(new Date(Date.UTC(anio, mes - 1, 0))) };
}

export const porcentajeCobrado = (cobranza: { facturado: string; cobrado: string } | null) => {
  if (!cobranza) return null;
  const facturado = Number(cobranza.facturado);
  return facturado > 0 ? Math.min(100, (Number(cobranza.cobrado) / facturado) * 100) : null;
};

function estadoContraReferencia(actual: number, referencia: number): EstadoMeta {
  if (actual >= referencia) return "adelante";
  return actual >= referencia * 0.9 ? "en-ritmo" : "atrasado";
}

/** Arma las tres barras de avance. Los ingresos se miden contra el ritmo esperado a hoy; la cobranza y el margen, contra la meta. */
export function construirAvanceMetas(entrada: {
  hoy: string;
  metas: Partial<Record<"VENTAS_MES" | "COBRANZA" | "MARGEN", number | null>>;
  ingresos: { actual: number; anterior: number } | null;
  cobranza: { actual: number | null; anterior: number | null };
  margen: { actual: number | null; anterior: number | null };
}): AvanceMeta[] {
  const [anio, mes, dia] = entrada.hoy.split("-").map(Number);
  const diasMes = diasDelMes(anio, mes);
  const metaVentas = entrada.metas.VENTAS_MES ?? null;
  const esperado = metaVentas !== null ? (metaVentas * dia) / diasMes : null;
  const filas = [
    { clave: "VENTAS_MES" as const, titulo: "Ingresos del mes", unidad: "soles" as const, actual: entrada.ingresos?.actual ?? null, anterior: entrada.ingresos?.anterior ?? null, meta: metaVentas, esperado },
    { clave: "COBRANZA" as const, titulo: "Cobranza", unidad: "porcentaje" as const, actual: entrada.cobranza.actual, anterior: entrada.cobranza.anterior, meta: entrada.metas.COBRANZA ?? null, esperado: null },
    { clave: "MARGEN" as const, titulo: "Margen bruto", unidad: "porcentaje" as const, actual: entrada.margen.actual, anterior: entrada.margen.anterior, meta: entrada.metas.MARGEN ?? null, esperado: null },
  ];
  return filas.map((fila) => {
    const referencia = fila.esperado ?? fila.meta;
    return {
      ...fila,
      avance: fila.actual !== null && fila.meta !== null ? (fila.actual / fila.meta) * 100 : null,
      estado: fila.actual !== null && referencia !== null && referencia > 0 ? estadoContraReferencia(fila.actual, referencia) : null,
    };
  });
}

export type MetricaCalor = "importe" | "operaciones";
export type CeldaCalor = { hora: number; valor: number; operaciones: number; total: number; intensidad: number };
export type FilaCalor = { dia: number; nombre: string; nombreCompleto: string; celdas: CeldaCalor[] };
export type MapaCalor = {
  horas: number[];
  filas: FilaCalor[];
  mejor: { diaCompleto: string; hora: number; valor: number; operaciones: number; total: number } | null;
};

const nombresDia = [
  ["Lun", "lunes"], ["Mar", "martes"], ["Mié", "miércoles"], ["Jue", "jueves"], ["Vie", "viernes"], ["Sáb", "sábado"], ["Dom", "domingo"],
] as const;

/**
 * Convierte las ventas por día y hora en una cuadrícula. Muestra solo las horas con ventas y los días con ventas;
 * la intensidad de cada celda es relativa a la más alta. Devuelve null si no hay ventas que mostrar.
 */
export function construirMapaCalor(celdas: ReadonlyArray<{ dia: number; hora: number; operaciones: number; total: string }>, metrica: MetricaCalor): MapaCalor | null {
  const validas = celdas.filter((celda) => celda.dia >= 1 && celda.dia <= 7 && celda.hora >= 0 && celda.hora <= 23 && celda.operaciones > 0);
  if (!validas.length) return null;
  const valorDe = (celda: { operaciones: number; total: string }) => metrica === "importe" ? Number(celda.total) : celda.operaciones;
  const maximo = Math.max(...validas.map(valorDe));
  const horaMinima = Math.min(...validas.map((celda) => celda.hora));
  const horaMaxima = Math.max(...validas.map((celda) => celda.hora));
  const horas = Array.from({ length: horaMaxima - horaMinima + 1 }, (_, indice) => horaMinima + indice);
  const diasConVentas = [...new Set(validas.map((celda) => celda.dia))].sort((a, b) => a - b);
  const filas = diasConVentas.map((dia): FilaCalor => ({
    dia,
    nombre: nombresDia[dia - 1][0],
    nombreCompleto: nombresDia[dia - 1][1],
    celdas: horas.map((hora) => {
      const celda = validas.find((candidata) => candidata.dia === dia && candidata.hora === hora);
      const valor = celda ? valorDe(celda) : 0;
      return { hora, valor, operaciones: celda?.operaciones ?? 0, total: Number(celda?.total ?? 0), intensidad: maximo > 0 ? valor / maximo : 0 };
    }),
  }));
  let mejor: MapaCalor["mejor"] = null;
  for (const fila of filas) {
    for (const celda of fila.celdas) {
      if (celda.valor > 0 && (mejor === null || celda.valor > mejor.valor)) mejor = { diaCompleto: fila.nombreCompleto, hora: celda.hora, valor: celda.valor, operaciones: celda.operaciones, total: celda.total };
    }
  }
  return { horas, filas, mejor };
}

const tiposImporte = ["BOLETA", "FACTURA", "NOTA_VENTA", "NOTA_DEBITO", "ADELANTO", "PRODUCTO", "SERVICIO", "MOTOTAXI"] as const;
const origenesIngreso = ["BOLETA", "FACTURA", "NOTA_VENTA", "NOTA_DEBITO", "ADELANTO"] as const;
const importesVacios = () => Object.fromEntries(tiposImporte.map((tipo) => [tipo, 0])) as ImportesGrafico;

/** Une las cuatro series del reporte en un punto por día del rango, con ceros en los días sin movimiento. */
export function serieDiariaIngresos(reporte: FlujoIngresosDashboard | null, rango: FiltroReporte): PuntoIngresos[] {
  if (!reporte) return [];
  const porFecha = new Map<string, ImportesGrafico>();
  const acumular = (fecha: string, clave: keyof ImportesGrafico, total: string) => {
    const importes = porFecha.get(fecha) ?? importesVacios();
    importes[clave] += Number(total);
    porFecha.set(fecha, importes);
  };
  for (const fila of reporte.flujoPorComprobante) acumular(fila.fecha, fila.tipoComprobante, fila.total);
  for (const fila of reporte.flujoPorNotaDebito) acumular(fila.fecha, "NOTA_DEBITO", fila.total);
  for (const fila of reporte.flujoPorAdelanto) acumular(fila.fecha, "ADELANTO", fila.total);
  for (const fila of reporte.flujoPorConcepto) acumular(fila.fecha, fila.tipo, fila.total);
  const dias: PuntoIngresos[] = [];
  const fin = new Date(`${rango.hasta}T00:00:00`);
  for (let fecha = new Date(`${rango.desde}T00:00:00`); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
    const iso = isoLocal(fecha);
    const importes = porFecha.get(iso) ?? importesVacios();
    dias.push({ fecha: iso, ...importes, total: origenesIngreso.reduce((suma, tipo) => suma + importes[tipo], 0) });
  }
  return dias;
}

const etiquetaMes = (anio: number, mesIndice: number) => new Date(Date.UTC(anio, mesIndice, 1)).toLocaleDateString("es-PE", { timeZone: "UTC", month: "short" }).replace(".", "");

export type VentasDelMes = { clave: string; etiqueta: string; PRODUCTO: number; SERVICIO: number; MOTOTAXI: number; total: number };

/** Ventas de los últimos 12 meses (el actual incluido, aún en curso) repartidas en repuestos, servicios y mototaxis. */
export function ventasMensualesPorConcepto(dias: ReadonlyArray<PuntoIngresos>, hoy: string): VentasDelMes[] {
  const [anio, mes] = hoy.split("-").map(Number);
  return Array.from({ length: 12 }, (_, indice) => {
    const fecha = new Date(Date.UTC(anio, mes - 1 - 11 + indice, 1));
    const clave = aIso(fecha).slice(0, 7);
    const delMes = dias.filter((dia) => dia.fecha.startsWith(clave));
    const suma = (concepto: "PRODUCTO" | "SERVICIO" | "MOTOTAXI") => delMes.reduce((total, dia) => total + dia[concepto], 0);
    const [repuestos, servicios, mototaxis] = [suma("PRODUCTO"), suma("SERVICIO"), suma("MOTOTAXI")];
    const enCurso = indice === 11;
    return { clave, etiqueta: `${etiquetaMes(fecha.getUTCFullYear(), fecha.getUTCMonth())}${enCurso ? "*" : ""}`, PRODUCTO: repuestos, SERVICIO: servicios, MOTOTAXI: mototaxis, total: repuestos + servicios + mototaxis };
  });
}

export type FlujoDelMes = { clave: string; etiqueta: string; ingresos: number; egresos: number; neto: number };

/** Ingresos y egresos de caja por mes, desde el primer mes del flujo hasta el mes en curso, en una moneda. */
export function ingresosEgresosPorMes(flujo: FlujoFinanciero, moneda: FlujoFinanciero["monedas"][number]): FlujoDelMes[] {
  const porClave = new Map(flujo.items.filter((item) => item.moneda === moneda).map((item) => [item.fecha.slice(0, 7), item]));
  const [anioDesde, mesDesde] = flujo.desde.split("-").map(Number);
  const [anioHasta, mesHasta] = flujo.hasta.split("-").map(Number);
  const meses = (anioHasta - anioDesde) * 12 + (mesHasta - mesDesde) + 1;
  return Array.from({ length: Math.max(meses, 0) }, (_, indice) => {
    const fecha = new Date(Date.UTC(anioDesde, mesDesde - 1 + indice, 1));
    const clave = aIso(fecha).slice(0, 7);
    const item = porClave.get(clave);
    const ingresos = Number(item?.ingresos ?? 0);
    const egresos = Number(item?.egresos ?? 0);
    return { clave, etiqueta: etiquetaMes(fecha.getUTCFullYear(), fecha.getUTCMonth()), ingresos, egresos, neto: ingresos - egresos };
  });
}
