import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PuntoPareto } from "./dashboard-calculos";
import type { Ritmo, VariacionConcepto } from "./dashboard-periodos";

type Soles = (valor: string | number) => string;
const estiloTooltip = { border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 } as const;
const compacto = (valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`;
const recortar = (texto: string, largo: number) => texto.length > largo ? `${texto.slice(0, largo - 1)}…` : texto;

export function VariacionPorTipoChart({ datos, soles }: { datos: VariacionConcepto[]; soles: Soles }) {
  if (!datos.some((fila) => fila.actual > 0 || fila.anterior > 0)) return <div className="inicio-chart-empty">No hay ventas para comparar todavía.</div>;
  const filas = datos.map((fila) => ({ ...fila, valor: fila.variacion ?? 0 }));
  return (
    <div className="grid gap-3">
      <div className="h-[190px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Variación porcentual frente al mes anterior: ${datos.map((fila) => `${fila.nombre} ${fila.variacion === null ? "sin base de comparación" : `${fila.variacion.toFixed(1)}%`}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} layout="vertical" margin={{ top: 6, right: 16, bottom: 0, left: 4 }} barCategoryGap="30%">
            <CartesianGrid horizontal={false} stroke="#e9eef2" strokeDasharray="3 6" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} tickFormatter={(valor) => `${valor}%`} />
            <YAxis type="category" dataKey="nombre" tickLine={false} axisLine={false} width={74} tick={{ fill: "#33506a", fontSize: 11, fontWeight: 700 }} />
            <ReferenceLine x={0} stroke="#9fb2c4" />
            <Tooltip cursor={{ fill: "#eff4f6" }} contentStyle={estiloTooltip} formatter={(valor, _nombre, item) => [item.payload.variacion === null ? "Sin base de comparación" : `${Number(valor).toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`, "Variación"]} />
            <Bar isAnimationActive={false} dataKey="valor" radius={3} maxBarSize={24}>
              {filas.map((fila) => <Cell key={fila.clave} fill={fila.variacion === null ? "#cbd5dc" : fila.variacion >= 0 ? "#27a383" : "#d62f4f"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="m-0 grid list-none gap-1 p-0 text-[10px] text-[#5a6f84]">
        {datos.map((fila) => <li key={fila.clave} className="flex justify-between gap-2"><span>{fila.nombre}</span><span><b className="text-[#244967]">{soles(fila.actual)}</b> vs {soles(fila.anterior)}</span></li>)}
      </ul>
    </div>
  );
}

export function ParetoArticulosChart({ datos, soles }: { datos: PuntoPareto[]; soles: Soles }) {
  if (!datos.length) return <div className="inicio-chart-empty">Aún no hay artículos vendidos en este periodo.</div>;
  return (
    <div className="h-[290px] mobile-portrait:h-[260px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Pareto de los ${datos.length} artículos más vendidos del mes; acumulan ${datos.at(-1)?.acumulado.toFixed(0)}% de las ventas`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={datos} margin={{ top: 12, right: 6, bottom: 0, left: -6 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
          <XAxis dataKey="nombre" tickLine={false} axisLine={false} interval={0} angle={-35} textAnchor="end" height={64} tick={{ fill: "#718797", fontSize: 9 }} tickFormatter={(valor) => recortar(String(valor), 16)} />
          <YAxis yAxisId="importe" tickLine={false} axisLine={false} width={54} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={compacto} />
          <YAxis yAxisId="porcentaje" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={36} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor) => `${valor}%`} />
          <ReferenceLine yAxisId="porcentaje" y={80} stroke="#e2a541" strokeDasharray="5 4" />
          <Tooltip cursor={{ fill: "#eff4f6" }} contentStyle={estiloTooltip} labelFormatter={(valor) => String(valor)} formatter={(valor, nombre) => [nombre === "Acumulado" ? `${Number(valor).toFixed(1)}%` : soles(Number(valor)), String(nombre)]} />
          <Bar yAxisId="importe" isAnimationActive={false} dataKey="total" name="Ventas" fill="#0b376a" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line yAxisId="porcentaje" isAnimationActive={false} type="monotone" dataKey="acumulado" name="Acumulado" stroke="#cc3450" strokeWidth={2.5} dot={{ r: 3, fill: "#cc3450", strokeWidth: 0 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RitmoChart({ ritmo, soles, textos }: { ritmo: Ritmo; soles: Soles; textos: { este: string; anterior: string } }) {
  if (ritmo.acumuladoActual <= 0 && !ritmo.hayAnterior && !ritmo.hayAnioPasado) return <div className="inicio-chart-empty">Aún no hay ingresos para comparar.</div>;
  const etiquetaAnterior = textos.anterior.charAt(0).toUpperCase() + textos.anterior.slice(1);
  const series = [
    { nombre: textos.este, color: "#0b376a" },
    ...(ritmo.proyeccionCierre !== null ? [{ nombre: "Proyección", color: "#0b376a", punteada: true }] : []),
    ...(ritmo.hayAnterior ? [{ nombre: etiquetaAnterior, color: "#e2a541" }] : []),
    ...(ritmo.hayAnioPasado ? [{ nombre: "Año pasado", color: "#9fb2c4" }] : []),
  ];
  return (
    <div className="grid gap-2">
      <div className="h-[300px] mobile-landscape:h-[250px] mobile-portrait:h-[230px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Ingresos acumulados: ${soles(ritmo.acumuladoActual)}${ritmo.proyeccionCierre !== null ? `, proyección al cierre ${soles(ritmo.proyeccionCierre)}` : ""}; ${textos.anterior} cerró en ${soles(ritmo.cierreAnterior)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ritmo.puntos} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
            <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
            <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} interval="preserveStartEnd" minTickGap={24} />
            <YAxis tickLine={false} axisLine={false} width={58} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={compacto} />
            <Tooltip contentStyle={estiloTooltip} labelFormatter={(dia) => `Día ${dia}`} formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} />
            {ritmo.hayAnioPasado && <Line isAnimationActive={false} type="monotone" dataKey="anioPasado" name="Año pasado" stroke="#9fb2c4" strokeWidth={2} dot={false} connectNulls={false} />}
            {ritmo.hayAnterior && <Line isAnimationActive={false} type="monotone" dataKey="anterior" name={etiquetaAnterior} stroke="#e2a541" strokeWidth={2.2} dot={false} connectNulls={false} />}
            {ritmo.proyeccionCierre !== null && <Line isAnimationActive={false} type="linear" dataKey="proyeccion" name="Proyección" stroke="#0b376a" strokeWidth={2} strokeDasharray="6 5" dot={false} connectNulls={false} />}
            <Line isAnimationActive={false} type="monotone" dataKey="actual" name={textos.este} stroke="#0b376a" strokeWidth={3.2} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="inicio-chart-legend" role="list" aria-label="Leyenda del gráfico">
        {series.map((serie) => <span key={serie.nombre} role="listitem"><i aria-hidden="true" style={{ backgroundColor: serie.color, opacity: "punteada" in serie ? 0.55 : 1 }} />{serie.nombre}</span>)}
      </div>
      <p className="m-0 text-[10px] text-[#5a6f84]">
        {ritmo.proyeccionCierre !== null ? <>Proyección al cierre: <b className="text-[#244967]">{soles(ritmo.proyeccionCierre)}</b>{ritmo.hayAnterior || ritmo.hayAnioPasado ? " · " : ""}</> : null}
        {ritmo.hayAnterior ? <>{etiquetaAnterior}: <b className="text-[#244967]">{soles(ritmo.cierreAnterior)}</b>{ritmo.hayAnioPasado ? " · " : ""}</> : null}
        {ritmo.hayAnioPasado ? <>Año pasado: <b className="text-[#244967]">{soles(ritmo.cierreAnioPasado)}</b></> : null}
      </p>
    </div>
  );
}
