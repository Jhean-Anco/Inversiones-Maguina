import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ModoDesgloseGrafico, PuntoIngresos, PuntoVentasMensuales } from "./dashboard-chart-types";
import type { FlujoFinanciero } from "../../services/finanzas.service";

type FlujoChartProps = {
  datos: PuntoIngresos[];
  modo: ModoDesgloseGrafico;
  mensajeVacio: string;
  soles: (valor: string | number) => string;
  etiquetaFecha: (valor: string) => string;
  className?: string;
};

const formatoCompacto = (valor: number) =>
  `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`;

const etiquetaPeriodoFlujo = (fecha: string, periodo: FlujoFinanciero["periodo"]) => {
  const date = new Date(`${fecha}T00:00:00.000Z`);
  return date.toLocaleDateString("es-PE", { timeZone: "UTC", ...(periodo === "MES" ? { month: "short" } : { day: "numeric", month: "short" }) }).replace(".", "");
};

export function FlujoFinancieroChart({ datos }: { datos: FlujoFinanciero }) {
  if (!datos.monedas.length) return <div className="inicio-chart-empty">No hay cuentas financieras para mostrar.</div>;

  const fechas: string[] = [];
  const inicio = new Date(`${datos.desde}T00:00:00.000Z`);
  const fin = new Date(`${datos.hasta}T00:00:00.000Z`);
  for (const cursor = new Date(inicio); cursor <= fin; ) {
    fechas.push(cursor.toISOString().slice(0, 10));
    if (datos.periodo === "DIA") cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (datos.periodo === "SEMANA") cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {datos.monedas.map((moneda) => {
        const monedaFormato = new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 });
        const formatoEje = new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, notation: "compact", maximumFractionDigits: 1 });
        const porFecha = new Map(datos.items.filter((item) => item.moneda === moneda).map((item) => [item.fecha, item]));
        const puntos = fechas.map((fecha) => {
          const item = porFecha.get(fecha);
          const ingresos = Number(item?.ingresos ?? 0);
          const egresos = Number(item?.egresos ?? 0);
          return { fecha, etiqueta: etiquetaPeriodoFlujo(fecha, datos.periodo), ingresos, egresos, neto: Number(item?.neto ?? ingresos - egresos) };
        });

        return <section key={moneda} className={`min-w-0 rounded-[13px] border border-[#e1eaf0] bg-[linear-gradient(150deg,#fff,#f7fafc)] p-3 ${datos.monedas.length === 1 ? "md:col-span-2 xl:col-span-3" : ""}`} aria-label={`Flujo financiero en ${moneda}`}>
          <h3 className="mb-1 text-xs font-extrabold tracking-wide text-[#60778e]">{moneda}</h3>
          <div className="h-[250px] min-w-0 [&_.recharts-cartesian-axis-tick-value]:text-[10px] [&_.recharts-tooltip-wrapper]:drop-shadow-[0_8px_18px_#17354b14] mobile-portrait:h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart accessibilityLayer data={puntos} margin={{ top: 10, right: 12, bottom: 0, left: 4 }} barCategoryGap="24%">
                <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor) => formatoEje.format(Number(valor))} width={72} />
                <ReferenceLine y={0} stroke="#b9c8d2" />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaPeriodoFlujo(String(payload[0].payload.fecha), datos.periodo) : ""} formatter={(valor, nombre) => [monedaFormato.format(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} />
                <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 10, color: "#60778e" }} />
                <Bar isAnimationActive={false} dataKey="ingresos" name="Ingresos" fill="#258a79" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="egresos" name="Egresos" fill="#d62f4f" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>;
      })}
    </div>
  );
}

export function FlujoChart({ datos, modo, mensajeVacio, soles, etiquetaFecha, className = "" }: FlujoChartProps) {
  if (!datos.some((dia) => dia.total > 0)) return <div className="inicio-chart-empty">{mensajeVacio}</div>;

  return (
    <div className={`inicio-recharts inicio-recharts-line h-[300px] mobile-landscape:h-[245px] mobile-portrait:h-[220px] ${className} [&_.recharts-cartesian-axis-tick-value]:text-[10px] [&_.recharts-tooltip-wrapper]:drop-shadow-[0_8px_18px_#17354b14]`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart accessibilityLayer data={datos} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={formatoCompacto} width={58} />
          <Tooltip
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaFecha(String(payload[0].payload.fecha)) : ""}
            formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]}
            contentStyle={{ border: "1px solid #dce6ec", borderRadius: 12, boxShadow: "0 12px 28px #18395018", fontSize: 11 }}
            labelStyle={{ marginBottom: 6, color: "#526d80", fontWeight: 800 }}
          />
          {modo === "TOTAL" ? (
            <Line isAnimationActive={false} type="monotone" dataKey="total" name="Total" stroke="#cc3450" strokeWidth={2.8} dot={{ r: 2.5, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          ) : modo === "COMPROBANTE" ? (
            <>
              <Line isAnimationActive={false} type="monotone" dataKey="BOLETA" name="Boletas" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="FACTURA" name="Facturas" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="NOTA_VENTA" name="Notas de venta" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </>
          ) : (
            <>
              <Line isAnimationActive={false} type="monotone" dataKey="PRODUCTO" name="Repuestos" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="SERVICIO" name="Servicios" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              <Line isAnimationActive={false} type="monotone" dataKey="MOTOTAXI" name="Mototaxis" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

type VentasMensualesChartProps = {
  datos: PuntoVentasMensuales[];
  modo: ModoDesgloseGrafico;
  mensajeVacio: string;
  soles: (valor: string | number) => string;
};

export function VentasMensualesChart({ datos, modo, mensajeVacio, soles }: VentasMensualesChartProps) {
  if (!datos.some((mes) => mes.total > 0)) return <div className="inicio-chart-empty">{mensajeVacio}</div>;

  return (
    <div className="inicio-recharts inicio-recharts-months h-[252px] mobile-landscape:h-[230px] mobile-portrait:h-[210px] [&_.recharts-cartesian-axis-tick-value]:text-[10px] [&_.recharts-tooltip-wrapper]:drop-shadow-[0_8px_18px_#17354b14] [&_.recharts-bar-rectangle]:transition-opacity [&_.recharts-bar-rectangle]:duration-[180ms] [&_.recharts-bar-rectangle:hover]:opacity-[.78]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer data={datos} margin={{ top: 12, right: 8, bottom: 0, left: -14 }} barCategoryGap="32%">
          <CartesianGrid vertical={false} stroke="#edf1f4" strokeDasharray="3 5" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 9 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={formatoCompacto} width={48} />
          <Tooltip formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} />
          {modo === "TOTAL" ? (
            <Bar isAnimationActive={false} dataKey="total" name="Total mensual" fill="#347caf" radius={[5, 5, 0, 0]} barSize={22} />
          ) : modo === "COMPROBANTE" ? (
            <>
              <Bar isAnimationActive={false} dataKey="BOLETA" name="Boletas" stackId="documentos" fill="#cc3450" barSize={22} />
              <Bar isAnimationActive={false} dataKey="FACTURA" name="Facturas" stackId="documentos" fill="#347caf" barSize={22} />
              <Bar isAnimationActive={false} dataKey="NOTA_VENTA" name="Notas de venta" stackId="documentos" fill="#27a383" radius={[5, 5, 0, 0]} barSize={22} />
            </>
          ) : (
            <>
              <Bar isAnimationActive={false} dataKey="PRODUCTO" name="Repuestos" stackId="conceptos" fill="#cc3450" barSize={22} />
              <Bar isAnimationActive={false} dataKey="SERVICIO" name="Servicios" stackId="conceptos" fill="#347caf" barSize={22} />
              <Bar isAnimationActive={false} dataKey="MOTOTAXI" name="Mototaxis" stackId="conceptos" fill="#27a383" radius={[5, 5, 0, 0]} barSize={22} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
