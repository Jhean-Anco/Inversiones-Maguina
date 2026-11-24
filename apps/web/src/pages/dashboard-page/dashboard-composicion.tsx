import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, Treemap, XAxis, YAxis } from "recharts";
import type { CascadaCaja, PasoCascada, TeselaVenta } from "./dashboard-calculos";

type Soles = (valor: string | number) => string;
const estiloTooltip = { border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 } as const;
const compacto = (valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`;
const colorPaso = (paso: PasoCascada) => paso.tipo === "inicio" ? "#0b376a" : paso.tipo === "suma" ? "#27a383" : paso.tipo === "resta" ? "#d62f4f" : paso.valor >= 0 ? "#258a79" : "#a8283b";
const colores = ["#0b376a", "#347caf", "#27a383", "#8069bd", "#e2a541", "#65a4b8", "#d62f4f", "#7b8fa1"];

export function CascadaCajaChart({ cascada, soles, nota }: { cascada: CascadaCaja; soles: Soles; nota?: string }) {
  if (cascada.pasos.length <= 2 && cascada.cobrado === 0) return <div className="inicio-chart-empty">Aún no hay cobros ni pagos registrados este mes.</div>;
  const datos = cascada.pasos.map((paso) => ({ ...paso, texto: `${paso.tipo === "resta" ? "−" : paso.tipo === "suma" ? "+" : ""}${compacto(Math.abs(paso.valor))}` }));
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
        {centavosPorSol !== null ? <>De cada S/ 100 cobrados quedan <b className="text-[#244967]">S/ {centavosPorSol.toLocaleString("es-PE", { maximumFractionDigits: 0 })}</b> después de pagar compras y gastos. </> : null}
        Es dinero que entró y salió de tus cuentas en el mes, no una utilidad contable. {nota}
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
  if (!teselas.length) return <div className="inicio-chart-empty">Aún no hay ventas este mes.</div>;
  const datos = teselas.map((tesela) => ({ name: tesela.nombre, size: tesela.valor }));
  const porcentajes = Object.fromEntries(teselas.map((tesela) => [tesela.nombre, tesela.porcentaje]));
  return (
    <div className="grid gap-2">
      <div className="h-[290px] mobile-portrait:h-[250px]" role="img" aria-label={`Composición de las ventas del mes: ${teselas.map((tesela) => `${tesela.nombre} ${tesela.porcentaje.toFixed(0)}%`).join(", ")}`}>
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
