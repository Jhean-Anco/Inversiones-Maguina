import type { FlujoIngresosDashboard } from "../../services/reportes.service";
import type { PuntoIngresos } from "./dashboard-chart-types";
import { variacionPorcentual, type ClaveSerie, type Comparativo } from "./dashboard-calculos";

export type Periodo = "SEMANA" | "MES" | "TRIMESTRE" | "ANIO";
export type Comparacion = "ANTERIOR" | "ANIO_PASADO";
/** Un rango de fechas ya transcurrido; `dias` cuenta ambos extremos. */
export type Tramo = { desde: string; hasta: string; dias: number };
export type Limites = { inicio: string; fin: string };
export type RangosPeriodo = {
  periodo: Periodo;
  /** Días que dura el periodo completo en curso (7, 28 a 31, 90 a 92 o 365/366). */
  diasPeriodo: number;
  actual: Tramo;
  anterior: Tramo;
  anioPasado: Tramo;
  /** Periodos completos, para medir cuánto cerró cada uno. */
  completos: { actual: Limites; anterior: Limites; anioPasado: Limites };
};

export const PERIODOS: ReadonlyArray<{ clave: Periodo; nombre: string }> = [
  { clave: "SEMANA", nombre: "Semana" }, { clave: "MES", nombre: "Mes" }, { clave: "TRIMESTRE", nombre: "Trimestre" }, { clave: "ANIO", nombre: "Año" },
];

const textos: Record<Periodo, { este: string; del: string; anterior: string; conArticulo: string; nombre: string }> = {
  SEMANA: { este: "Esta semana", del: "de la semana", anterior: "semana anterior", conArticulo: "la semana anterior", nombre: "esta semana" },
  MES: { este: "Este mes", del: "del mes", anterior: "mes anterior", conArticulo: "el mes anterior", nombre: "este mes" },
  TRIMESTRE: { este: "Este trimestre", del: "del trimestre", anterior: "trimestre anterior", conArticulo: "el trimestre anterior", nombre: "este trimestre" },
  ANIO: { este: "Este año", del: "del año", anterior: "año anterior", conArticulo: "el año anterior", nombre: "este año" },
};

export const textosPeriodo = (periodo: Periodo) => textos[periodo];
export const etiquetaComparacion = (periodo: Periodo, comparar: Comparacion) => comparar === "ANIO_PASADO" ? "año pasado" : textos[periodo].anterior;

const MS_DIA = 86_400_000;
const aFecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const aIso = (fecha: Date) => fecha.toISOString().slice(0, 10);
const sumarDias = (iso: string, dias: number) => aIso(new Date(aFecha(iso).getTime() + dias * MS_DIA));
const diasEntre = (desde: string, hasta: string) => Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / MS_DIA) + 1;
const primeroDeMes = (anio: number, mesIndice: number) => aIso(new Date(Date.UTC(anio, mesIndice, 1)));
const ultimoDeMes = (anio: number, mesIndice: number) => aIso(new Date(Date.UTC(anio, mesIndice + 1, 0)));
/** Retrocede `meses` desde un primer día de mes. */
const mesesAtras = (primerDia: string, meses: number) => { const [anio, mes] = primerDia.split("-").map(Number); return primeroDeMes(anio, mes - 1 - meses); };

/** Primer y último día del periodo que contiene la fecha. La semana va de lunes a domingo. */
export function limitesPeriodo(periodo: Periodo, fecha: string): Limites {
  const [anio, mes] = fecha.split("-").map(Number);
  if (periodo === "SEMANA") {
    const inicio = sumarDias(fecha, -((aFecha(fecha).getUTCDay() + 6) % 7));
    return { inicio, fin: sumarDias(inicio, 6) };
  }
  if (periodo === "MES") return { inicio: primeroDeMes(anio, mes - 1), fin: ultimoDeMes(anio, mes - 1) };
  if (periodo === "TRIMESTRE") {
    const primerMes = Math.floor((mes - 1) / 3) * 3;
    return { inicio: primeroDeMes(anio, primerMes), fin: ultimoDeMes(anio, primerMes + 2) };
  }
  return { inicio: primeroDeMes(anio, 0), fin: ultimoDeMes(anio, 11) };
}

/**
 * Rangos del periodo en curso y de los dos periodos con los que se compara. Los comparados se recortan a los mismos días
 * transcurridos, de modo que se comparan tramos equivalentes (por ejemplo, del 1 al 24 de cada mes).
 */
export function rangosDelPeriodo(periodo: Periodo, hoy: string): RangosPeriodo {
  const actual = limitesPeriodo(periodo, hoy);
  const dias = diasEntre(actual.inicio, hoy);
  const inicioAnterior = periodo === "SEMANA" ? sumarDias(actual.inicio, -7) : mesesAtras(actual.inicio, periodo === "MES" ? 1 : periodo === "TRIMESTRE" ? 3 : 12);
  // La semana del año pasado se alinea por día de la semana (52 semanas atrás), no por fecha.
  const inicioAnioPasado = periodo === "SEMANA" ? sumarDias(actual.inicio, -364) : mesesAtras(actual.inicio, 12);
  const anterior = limitesPeriodo(periodo, inicioAnterior);
  const anioPasado = limitesPeriodo(periodo, inicioAnioPasado);
  const tramo = (limites: Limites): Tramo => {
    const hasta = sumarDias(limites.inicio, dias - 1);
    const acotado = hasta > limites.fin ? limites.fin : hasta;
    return { desde: limites.inicio, hasta: acotado, dias: diasEntre(limites.inicio, acotado) };
  };
  return {
    periodo, diasPeriodo: diasEntre(actual.inicio, actual.fin),
    actual: { desde: actual.inicio, hasta: hoy, dias },
    anterior: tramo(anterior), anioPasado: tramo(anioPasado),
    completos: { actual, anterior, anioPasado },
  };
}

/** El tramo con el que se compara según la opción elegida. */
export const tramoComparado = (rangos: RangosPeriodo, comparar: Comparacion) => comparar === "ANIO_PASADO" ? rangos.anioPasado : rangos.anterior;

const valoresPorFecha = (dias: ReadonlyArray<PuntoIngresos>, clave: ClaveSerie) => new Map<string, number>(dias.map((dia) => [dia.fecha, dia[clave]]));

/** Acumulado día a día de un rango. */
function acumuladoDe(valores: ReadonlyMap<string, number>, desde: string, cantidad: number) {
  const serie: number[] = [];
  let suma = 0;
  for (let indice = 0; indice < cantidad; indice += 1) {
    suma += valores.get(sumarDias(desde, indice)) ?? 0;
    serie.push(suma);
  }
  return serie;
}

/** Compara lo acumulado del periodo en curso con el tramo equivalente del periodo elegido. */
export function compararAcumulado(dias: ReadonlyArray<PuntoIngresos>, rangos: RangosPeriodo, comparar: Comparacion, clave: ClaveSerie = "total"): Comparativo {
  const valores = valoresPorFecha(dias, clave);
  const comparado = tramoComparado(rangos, comparar);
  const serieActual = acumuladoDe(valores, rangos.actual.desde, rangos.actual.dias);
  const serieAnterior = acumuladoDe(valores, comparado.desde, comparado.dias);
  const actual = serieActual.at(-1) ?? 0;
  const anterior = serieAnterior.at(-1) ?? 0;
  return { actual, anterior, variacion: variacionPorcentual(actual, anterior), serieActual, serieAnterior };
}

function ticketEnTramo(filas: FlujoIngresosDashboard["flujoPorComprobante"], tramo: Tramo) {
  let total = 0;
  let operaciones = 0;
  for (const fila of filas) {
    if (fila.fecha < tramo.desde || fila.fecha > tramo.hasta) continue;
    total += Number(fila.total);
    operaciones += fila.ventas;
  }
  return operaciones > 0 ? total / operaciones : null;
}

/** Ticket promedio de boletas, facturas y notas de venta; null si no hubo operaciones en el tramo. */
export function compararTicketPromedio(reporte: FlujoIngresosDashboard, rangos: RangosPeriodo, comparar: Comparacion) {
  const actual = ticketEnTramo(reporte.flujoPorComprobante, rangos.actual);
  const anterior = ticketEnTramo(reporte.flujoPorComprobante, tramoComparado(rangos, comparar));
  return { actual, anterior, variacion: actual !== null && anterior !== null ? variacionPorcentual(actual, anterior) : null };
}

export type VariacionConcepto = { clave: "PRODUCTO" | "SERVICIO" | "MOTOTAXI"; nombre: string; actual: number; anterior: number; variacion: number | null };
const conceptos: ReadonlyArray<Pick<VariacionConcepto, "clave" | "nombre">> = [
  { clave: "PRODUCTO", nombre: "Repuestos" }, { clave: "SERVICIO", nombre: "Servicios" }, { clave: "MOTOTAXI", nombre: "Mototaxis" },
];

export function variacionPorConcepto(dias: ReadonlyArray<PuntoIngresos>, rangos: RangosPeriodo, comparar: Comparacion): VariacionConcepto[] {
  return conceptos.map(({ clave, nombre }) => {
    const { actual, anterior, variacion } = compararAcumulado(dias, rangos, comparar, clave);
    return { clave, nombre, actual, anterior, variacion };
  });
}

export type PuntoRitmo = { dia: number; actual: number | null; proyeccion: number | null; anterior: number | null; anioPasado: number | null };
export type Ritmo = {
  puntos: PuntoRitmo[];
  acumuladoActual: number;
  /** Proyección lineal al cierre del periodo; null si pasaron muy pocos días o el periodo terminó. */
  proyeccionCierre: number | null;
  cierreAnterior: number;
  cierreAnioPasado: number;
  hayAnterior: boolean;
  hayAnioPasado: boolean;
};

const MINIMO_DIAS_PARA_PROYECTAR = 3;

/** Acumulado día a día del periodo en curso frente al periodo anterior y al del año pasado, con proyección al cierre. */
export function construirRitmo(dias: ReadonlyArray<PuntoIngresos>, rangos: RangosPeriodo): Ritmo {
  const valores = valoresPorFecha(dias, "total");
  const completo = (limites: Limites) => acumuladoDe(valores, limites.inicio, diasEntre(limites.inicio, limites.fin));
  const actual = acumuladoDe(valores, rangos.actual.desde, rangos.actual.dias);
  const anterior = completo(rangos.completos.anterior);
  const anioPasado = completo(rangos.completos.anioPasado);
  const transcurridos = rangos.actual.dias;
  const acumuladoActual = actual.at(-1) ?? 0;
  const proyeccionCierre = transcurridos >= MINIMO_DIAS_PARA_PROYECTAR && transcurridos < rangos.diasPeriodo ? (acumuladoActual / transcurridos) * rangos.diasPeriodo : null;
  const puntos = Array.from({ length: rangos.diasPeriodo }, (_, indice): PuntoRitmo => {
    const dia = indice + 1;
    return {
      dia,
      actual: dia <= transcurridos ? actual[indice] : null,
      proyeccion: proyeccionCierre !== null && dia >= transcurridos ? acumuladoActual + (dia - transcurridos) * (acumuladoActual / transcurridos) : null,
      anterior: anterior[indice] ?? null,
      anioPasado: anioPasado[indice] ?? null,
    };
  });
  const cierreAnterior = anterior.at(-1) ?? 0;
  const cierreAnioPasado = anioPasado.at(-1) ?? 0;
  return { puntos, acumuladoActual, proyeccionCierre, cierreAnterior, cierreAnioPasado, hayAnterior: cierreAnterior > 0, hayAnioPasado: cierreAnioPasado > 0 };
}
