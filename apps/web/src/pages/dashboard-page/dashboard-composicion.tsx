import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import type { CascadaCaja, FlujoDelMes, PasoCascada, TeselaVenta, VentasDelMes } from "./dashboard-calculos";

type Soles = (valor: string | number) => string;
const estiloTooltip = { border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 } as const;
const compacto = (valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`;
const colorPaso = (paso: PasoCascada) => paso.tipo === "inicio" ? "#0b376a" : paso.tipo === "suma" ? "#27a383" : paso.tipo === "resta" ? "#d62f4f" : paso.valor >= 0 ? "#258a79" : "#a8283b";
const colores = ["#0b376a", "#347caf", "#27a383", "#8069bd", "#e2a541", "#65a4b8", "#d62f4f", "#7b8fa1"];

export function CascadaCajaChart({ cascada, soles, nota }: { cascada: CascadaCaja; soles: Soles; nota?: string }) {
  if (cascada.pasos.length <= 2 && cascada.cobrado === 0) return <div className="inicio-chart-empty">Aún no hay cobros ni pagos en este periodo.</div>;
  const datos = cascada.pasos.map((paso) => ({ ...paso, texto: `${paso.tipo === "resta" || paso.valor < 0 ? "−" : paso.tipo === "suma" ? "+" : ""}${compacto(Math.abs(paso.valor))}` }));
  const centavosPorSol = cascada.cobrado > 0 ? (cascada.saldoNeto / cascada.cobrado) * 100 : null;
  return (
    <div className="grid gap-2">
      <div className="h-[290px] mobile-portrait:h-[260px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Cascada de caja del mes: cobrado ${soles(cascada.cobrado)}, saldo neto ${soles(cascada.saldoNeto)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 22, right: 8, bottom: 0, left: -6 }} barCategoryGap="18%">
            <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
            <XAxis dataKey="nombre" tickLine={false} axisLine={false} interval={0} tick={{ fill: "#5a6f84", fontSize: 9 }} />
            <YAxis tickLine={false} axisLine={false} width={54} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={compacto} />
            <ReferenceLine y={0} stroke="#9fb2c4" />
            <Tooltip cursor={{ fill: "#eff4f6" }} contentStyle={estiloTooltip} formatter={(_valor, _nombre, item) => [soles(item.payload.valor), item.payload.nombre]} labelFormatter={() => ""} />
            <Bar isAnimationActive={false} dataKey="rango" radius={3} maxBarSize={56}>
              {datos.map((paso) => <Cell key={paso.clave} fill={colorPaso(paso)} />)}
              <LabelList dataKey="texto" position="top" style={{ fontSize: 10, fontWeight: 800, fill: "#244967" }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="m-0 text-[10px] text-[#5a6f84]">
        {centavosPorSol === null ? null : centavosPorSol < 0 ? <>Pagaste más de lo que cobraste. </> : <>De cada S/ 100 cobrados quedan <b className="text-[#244967]">S/ {centavosPorSol.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</b>. </>}
        {nota}
      </p>
    </div>
  );
}

type TileProps = { x?: number; y?: number; width?: number; height?: number; index?: number; name?: string; porcentajes?: Record<string, number> };
function Tesela({ x = 0, y = 0, width = 0, height = 0, index = 0, name = "", porcentajes = {} }: TileProps) {
  const porcentaje = porcentajes[name] ?? 0;
  const cabeTexto = width > 62 && height > 34;
  return (
    <g>
      <rect x={x + 1} y={y + 1} width={Math.max(width - 2, 0)} height={Math.max(height - 2, 0)} rx={7} fill={colores[index % colores.length]} />
      {cabeTexto && <>
        <text x={x + 9} y={y + 19} fill="#fff" fontSize={11} fontWeight={800}>{name.length > Math.floor(width / 7) ? `${name.slice(0, Math.max(Math.floor(width / 7) - 1, 3))}…` : name}</text>
        <text x={x + 9} y={y + 34} fill="#ffffffe6" fontSize={10}>{porcentaje.toLocaleString("es-PE", { maximumFractionDigits: 0 })}%</text>
      </>}
    </g>
  );
}

export function MapaVentasChart({ teselas, soles }: { teselas: TeselaVenta[]; soles: Soles }) {
  if (!teselas.length) return <div className="inicio-chart-empty">Aún no hay ventas en este periodo.</div>;
  const datos = teselas.map((tesela) => ({ name: tesela.nombre, size: tesela.valor }));
  const porcentajes = Object.fromEntries(teselas.map((tesela) => [tesela.nombre, tesela.porcentaje]));
  return (
    <div className="grid gap-2">
      <div className="h-[290px] mobile-portrait:h-[250px]" role="img" aria-label={`Composición de las ventas: ${teselas.map((tesela) => `${tesela.nombre} ${tesela.porcentaje.toFixed(0)}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={datos} dataKey="size" nameKey="name" isAnimationActive={false} content={<Tesela porcentajes={porcentajes} />}>
            <Tooltip contentStyle={estiloTooltip} formatter={(valor) => [soles(Number(valor)), "Ventas sin IGV"]} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[10px] text-[#5a6f84]">
        {teselas.map((tesela, indice) => <li key={tesela.nombre} className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: colores[indice % colores.length] }} />{tesela.nombre} <b className="text-[#244967]">{soles(tesela.valor)}</b></li>)}
      </ul>
    </div>
  );
}

const conceptos = [
  { clave: "PRODUCTO", nombre: "Repuestos", color: "#0b376a" },
  { clave: "SERVICIO", nombre: "Servicios", color: "#347caf" },
  { clave: "MOTOTAXI", nombre: "Mototaxis", color: "#27a383" },
] as const;

export function MezclaVentasChart({ meses, soles }: { meses: VentasDelMes[]; soles: Soles }) {
  const [escala, setEscala] = useState<"SOLES" | "PORCENTAJE">("SOLES");
  if (!meses.some((mes) => mes.total > 0)) return <div className="inicio-chart-empty">No hay ventas registradas en los últimos doce meses.</div>;
  const porcentaje = escala === "PORCENTAJE";
  const datos = meses.map((mes) => porcentaje && mes.total > 0
    ? { ...mes, PRODUCTO: (mes.PRODUCTO / mes.total) * 100, SERVICIO: (mes.SERVICIO / mes.total) * 100, MOTOTAXI: (mes.MOTOTAXI / mes.total) * 100, soles: mes }
    : { ...mes, soles: mes });
  const totales = conceptos.map((concepto) => ({ ...concepto, total: meses.reduce((suma, mes) => suma + mes[concepto.clave], 0) }));
  const granTotal = totales.reduce((suma, concepto) => suma + concepto.total, 0);
  return (
    <div className="grid gap-2">
      <div className="inicio-sales-view-toggle w-fit" role="group" aria-label="Escala del gráfico">
        <button type="button" className={!porcentaje ? "is-active" : ""} aria-pressed={!porcentaje} onClick={() => setEscala("SOLES")}>Importe</button>
        <button type="button" className={porcentaje ? "is-active" : ""} aria-pressed={porcentaje} onClick={() => setEscala("PORCENTAJE")}>% del total</button>
      </div>
      <div className="h-[280px] mobile-portrait:h-[240px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Ventas de los últimos doce meses por tipo: ${totales.map((concepto) => `${concepto.nombre} ${granTotal > 0 ? ((concepto.total / granTotal) * 100).toFixed(0) : 0}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={datos} margin={{ top: 10, right: 12, bottom: 0, left: -6 }}>
            <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={54} tick={{ fill: "#8192a0", fontSize: 9 }} domain={porcentaje ? [0, 100] : undefined} tickFormatter={(valor) => porcentaje ? `${valor}%` : compacto(Number(valor))} />
            <Tooltip contentStyle={estiloTooltip} formatter={(valor, nombre, item) => {
              const concepto = conceptos.find((candidato) => candidato.nombre === nombre);
              const importe = concepto ? (item.payload.soles as VentasDelMes)[concepto.clave] : 0;
              return [porcentaje ? `${Number(valor).toFixed(0)}% · ${soles(importe)}` : soles(Number(valor)), String(nombre)];
            }} />
            {conceptos.map((concepto) => <Area key={concepto.clave} isAnimationActive={false} type="monotone" dataKey={concepto.clave} name={concepto.nombre} stackId="mezcla" stroke={concepto.color} fill={concepto.color} fillOpacity={0.9} strokeWidth={1} />)}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="inicio-chart-legend" role="list" aria-label="Leyenda del gráfico">
        {totales.map((concepto) => <span key={concepto.clave} role="listitem"><i aria-hidden="true" style={{ backgroundColor: concepto.color }} />{concepto.nombre} {granTotal > 0 ? `${((concepto.total / granTotal) * 100).toFixed(0)}%` : ""}</span>)}
      </div>
      <p className="m-0 text-[10px] text-[#5a6f84]">* Mes en curso.</p>
    </div>
  );
}

const coloresMedios = ["#0b376a", "#27a383", "#e2a541", "#8069bd", "#347caf", "#65a4b8"];

export function MediosPagoChart({ medios, soles }: { medios: Array<{ nombre: string; importe: number }>; soles: Soles }) {
  const total = medios.reduce((suma, medio) => suma + medio.importe, 0);
  if (total <= 0) return <div className="inicio-chart-empty">Aún no hay ventas en este periodo.</div>;
  return (
    <div className="grid justify-items-center gap-3">
      <div className="relative aspect-square w-[min(100%,210px)]" role="img" aria-label={`Ventas por medio de pago: ${medios.map((medio) => `${medio.nombre} ${((medio.importe / total) * 100).toFixed(0)}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={medios} dataKey="importe" nameKey="nombre" innerRadius="66%" outerRadius="94%" paddingAngle={2} stroke="none">
              {medios.map((medio, indice) => <Cell key={medio.nombre} fill={coloresMedios[indice % coloresMedios.length]} />)}
            </Pie>
            <Tooltip contentStyle={estiloTooltip} formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid content-center justify-items-center gap-0.5">
          <strong className="text-[20px] font-black tabular-nums text-[#0b376a]">{compacto(total)}</strong>
          <small className="text-[9px] font-bold text-[#5a6f84]">ventas</small>
        </div>
      </div>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-x-3 gap-y-1 p-0 text-[10px] text-[#5a6f84]">
        {medios.map((medio, indice) => <li key={medio.nombre} className="flex items-center gap-1.5"><i aria-hidden="true" className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: coloresMedios[indice % coloresMedios.length] }} />{medio.nombre} <b className="text-[#244967]">{((medio.importe / total) * 100).toFixed(0)}%</b></li>)}
      </ul>
    </div>
  );
}

const VERDE_SALDO = "#27a383";
const ROJO_SALDO = "#d62f4f";

export function IngresosEgresosChart({ meses, moneda }: { meses: FlujoDelMes[]; moneda: string }) {
  const idGradiente = useId();
  if (!meses.some((mes) => mes.ingresos > 0 || mes.egresos > 0)) return <div className="inicio-chart-empty">Aún no hay cobros ni pagos registrados este año.</div>;
  const formato = new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, maximumFractionDigits: 2 });
  const formatoEje = new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, notation: "compact", maximumFractionDigits: 1 });
  const datos = meses.map((mes) => ({ ...mes, egresosNegativos: -mes.egresos }));
  // La línea cambia de color donde cruza el cero: el degradado se reparte sobre el rango del propio saldo neto.
  const netoMaximo = Math.max(...meses.map((mes) => mes.neto));
  const netoMinimo = Math.min(...meses.map((mes) => mes.neto));
  const cruzaCero = netoMinimo < 0 && netoMaximo > 0;
  const cortes = cruzaCero ? netoMaximo / (netoMaximo - netoMinimo) : 0;
  const colorLinea = cruzaCero ? `url(#${idGradiente})` : netoMaximo > 0 ? VERDE_SALDO : netoMinimo < 0 ? ROJO_SALDO : VERDE_SALDO;
  const colorPunto = (neto: number) => neto < 0 ? ROJO_SALDO : VERDE_SALDO;
  return (
    <div className="grid gap-2">
      <div className="h-[290px] mobile-portrait:h-[250px] [&_.recharts-cartesian-axis-tick-value]:text-[10px]" role="img" aria-label={`Cobros y pagos por mes en ${moneda}; saldo neto del año ${formato.format(meses.reduce((suma, mes) => suma + mes.neto, 0))}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={datos} stackOffset="sign" margin={{ top: 10, right: 12, bottom: 0, left: -6 }} barCategoryGap="22%">
            {cruzaCero && <defs><linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1"><stop offset={cortes} stopColor={VERDE_SALDO} /><stop offset={cortes} stopColor={ROJO_SALDO} /></linearGradient></defs>}
            <CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" />
            <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} width={64} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor) => formatoEje.format(Number(valor))} />
            <ReferenceLine y={0} stroke="#9fb2c4" />
            <Tooltip cursor={{ fill: "#eff4f6" }} contentStyle={estiloTooltip} formatter={(valor, nombre) => [formato.format(nombre === "Egresos" ? Math.abs(Number(valor)) : Number(valor)), String(nombre)]} />
            <Bar isAnimationActive={false} dataKey="ingresos" name="Ingresos" stackId="flujo" fill="#0b376a" radius={[3, 3, 0, 0]} maxBarSize={30} />
            <Bar isAnimationActive={false} dataKey="egresosNegativos" name="Egresos" stackId="flujo" fill="#d62f4f" fillOpacity={0.85} radius={[0, 0, 3, 3]} maxBarSize={30} />
            <Line isAnimationActive={false} type="monotone" dataKey="neto" name="Saldo neto" stroke={colorLinea} strokeWidth={2.8} dot={(punto: { cx?: number; cy?: number; index?: number; payload?: FlujoDelMes }) => <circle key={`neto-${punto.index}`} cx={punto.cx} cy={punto.cy} r={3.5} fill={colorPunto(punto.payload?.neto ?? 0)} />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="inicio-chart-legend" role="list" aria-label="Leyenda del gráfico">
        <span role="listitem"><i aria-hidden="true" style={{ backgroundColor: "#0b376a" }} />Ingresos</span>
        <span role="listitem"><i aria-hidden="true" style={{ backgroundColor: "#d62f4f" }} />Egresos</span>
        <span role="listitem"><i aria-hidden="true" style={{ backgroundColor: VERDE_SALDO }} />Saldo neto positivo</span>
        <span role="listitem"><i aria-hidden="true" style={{ backgroundColor: ROJO_SALDO }} />Saldo neto negativo</span>
      </div>
    </div>
  );
}
