import type { Comparativo, MargenBruto } from "./dashboard-calculos";

type Valor = { actual: number | null; anterior: number | null; variacion: number | null };
type Props = {
  soles: (valor: string | number) => string;
  ingresosMes: Comparativo | null;
  ventasHoy: Valor | null;
  ticket: Valor | null;
  saldo: { actual: number; anterior: number; moneda: string } | null;
  /** null mientras carga; con `actual` null cuando no hay costos que mostrar. */
  margen: { actual: MargenBruto | null; anterior: MargenBruto | null } | null;
  mostrarMargen: boolean;
  mostrarIngresos: boolean;
  mostrarFinanzas: boolean;
};

function Minigrafico({ actual, anterior, color }: { actual: number[]; anterior: number[]; color: string }) {
  const largo = Math.max(actual.length, anterior.length);
  const maximo = Math.max(...actual, ...anterior, 1);
  if (largo < 2) return <div className="h-9" aria-hidden="true" />;
  const puntos = (serie: number[]) => serie.map((valor, indice) => `${((indice / (largo - 1)) * 100).toFixed(1)},${(30 - (valor / maximo) * 26).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-9 w-full" aria-hidden="true">
      <polyline points={puntos(anterior)} fill="none" stroke="#9fb2c4" strokeWidth="1.5" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
      <polyline points={puntos(actual)} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Variacion({ valor, referencia, unidad = "%" }: { valor: number | null; referencia: string; unidad?: string }) {
  if (valor === null) return <span className="text-[10px] font-semibold text-[#5a6f84]">Sin base de comparación</span>;
  const sube = valor >= 0;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${sube ? "bg-[#dff3ec] text-[#116048]" : "bg-[#fde3e6] text-[#a8283b]"}`}>{sube ? "▲" : "▼"} {Math.abs(valor).toLocaleString("es-PE", { maximumFractionDigits: 1 })}{unidad}</span>
      <span className="text-[10px] text-[#5a6f84]">{referencia}</span>
    </span>
  );
}

function Tarjeta({ titulo, valor, variacion, referencia, serie, color = "#0b376a", unidad }: {
  titulo: string; valor: string; variacion: number | null; referencia: string; serie?: { actual: number[]; anterior: number[] }; color?: string; unidad?: string;
}) {
  return (
    <article className="grid min-w-0 content-start gap-1.5 rounded-2xl border border-[#dbe3e9] bg-white p-4 shadow-[0_8px_22px_#0b376a0d]">
      <span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#4f6a82]">{titulo}</span>
      <strong className="text-[24px] font-extrabold tabular-nums tracking-[-.03em] text-[#0b376a] mobile-portrait:text-[19px]">{valor}</strong>
      <Variacion valor={variacion} referencia={referencia} unidad={unidad} />
      {serie ? <Minigrafico actual={serie.actual} anterior={serie.anterior} color={color} /> : null}
    </article>
  );
}

export function IndicadoresClave({ soles, ingresosMes, ventasHoy, ticket, saldo, margen, mostrarMargen, mostrarIngresos, mostrarFinanzas }: Props) {
  if (!mostrarIngresos && !mostrarFinanzas) return null;
  const margenActual = margen?.actual ?? null;
  const puntosMargen = margenActual?.porcentaje != null && margen?.anterior?.porcentaje != null ? margenActual.porcentaje - margen.anterior.porcentaje : null;
  const monedaSaldo = saldo?.moneda ?? "PEN";
  const formatoSaldo = (valor: number) => monedaSaldo === "PEN" ? soles(valor) : `${monedaSaldo} ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return (
    <section className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4 mobile-portrait:grid-cols-2 mobile-portrait:gap-2.5" aria-label="Indicadores clave del mes">
      {mostrarIngresos && <>
        <Tarjeta titulo="Ingresos del mes" valor={ingresosMes ? soles(ingresosMes.actual) : "…"} variacion={ingresosMes?.variacion ?? null} referencia={ingresosMes ? `vs ${soles(ingresosMes.anterior)} mes anterior` : ""} serie={ingresosMes ? { actual: ingresosMes.serieActual, anterior: ingresosMes.serieAnterior } : undefined} />
        <Tarjeta titulo="Ventas de hoy" valor={ventasHoy ? soles(ventasHoy.actual ?? 0) : "…"} variacion={ventasHoy?.variacion ?? null} referencia={ventasHoy ? `vs ${soles(ventasHoy.anterior ?? 0)} ayer` : ""} color="#347caf" />
        <Tarjeta titulo="Ticket promedio" valor={ticket?.actual != null ? soles(ticket.actual) : ticket ? "—" : "…"} variacion={ticket?.variacion ?? null} referencia={ticket?.anterior != null ? `vs ${soles(ticket.anterior)} mes anterior` : "sin ventas en el periodo previo"} />
        {mostrarMargen && (margen === null || margenActual !== null) && <Tarjeta titulo="Margen bruto" valor={margenActual?.porcentaje != null ? `${margenActual.porcentaje.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%` : "…"} variacion={puntosMargen} unidad=" pt" color="#27a383" referencia={margenActual ? `sobre el ${margenActual.cobertura.toLocaleString("es-PE", { maximumFractionDigits: 0 })}% de las ventas con costo conocido` : ""} />}
      </>}
      {mostrarFinanzas && <Tarjeta titulo="Saldo neto del mes" valor={saldo ? formatoSaldo(saldo.actual) : "…"} variacion={saldo ? (saldo.anterior === 0 ? (saldo.actual === 0 ? 0 : null) : ((saldo.actual - saldo.anterior) / Math.abs(saldo.anterior)) * 100) : null} referencia={saldo ? `mes anterior completo: ${formatoSaldo(saldo.anterior)}` : ""} />}
    </section>
  );
}
