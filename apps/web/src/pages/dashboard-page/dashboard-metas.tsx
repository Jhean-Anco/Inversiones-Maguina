import { useId, useState } from "react";
import type { AvanceMeta, EstadoMeta } from "./dashboard-calculos";
import type { IndicadorMeta, MetasDashboard } from "../../services/reportes.service";

type Soles = (valor: string | number) => string;
export type CambioMeta = { indicador: IndicadorMeta; valor: number | null };
type Props = {
  avances: AvanceMeta[];
  soles: Soles;
  metas: MetasDashboard["metas"] | null;
  puedeConfigurar: boolean;
  onGuardar: (cambios: CambioMeta[], alcance: "MES" | "TODOS") => Promise<void>;
};

const colorEstado: Record<EstadoMeta, string> = { adelante: "#27a383", "en-ritmo": "#e2a541", atrasado: "#d62f4f" };
const textoEstado: Record<EstadoMeta, string> = { adelante: "Por delante", "en-ritmo": "En ritmo justo", atrasado: "Atrasado" };
const etiquetas: Record<IndicadorMeta, { titulo: string; sufijo: string }> = {
  VENTAS_MES: { titulo: "Ingresos del mes", sufijo: "S/" },
  COBRANZA: { titulo: "Cobranza", sufijo: "%" },
  MARGEN: { titulo: "Margen bruto", sufijo: "%" },
};
const indicadores = Object.keys(etiquetas) as IndicadorMeta[];
const porcentaje = (valor: number) => `${valor.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`;

function BarraMeta({ fila, soles }: { fila: AvanceMeta; soles: Soles }) {
  const formato = (valor: number) => fila.unidad === "soles" ? soles(valor) : porcentaje(valor);
  const maximo = Math.max(fila.meta ?? 0, fila.actual ?? 0, fila.anterior ?? 0, fila.esperado ?? 0, 1) * 1.06;
  const posicion = (valor: number) => `${Math.min(100, (valor / maximo) * 100)}%`;
  const color = fila.estado ? colorEstado[fila.estado] : "#347caf";
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="text-[11px] font-extrabold text-[#244967]">{fila.titulo}</span>
        <span className="text-[11px] tabular-nums text-[#5a6f84]"><b className="text-[13px] text-[#0b376a]">{fila.actual !== null ? formato(fila.actual) : "—"}</b>{fila.meta !== null ? ` de ${formato(fila.meta)}` : ""}</span>
      </div>
      <div className="relative h-3 rounded-full bg-[#e8eef3]" role="img" aria-label={`${fila.titulo}: ${fila.actual !== null ? formato(fila.actual) : "sin dato"}${fila.meta !== null ? `, meta ${formato(fila.meta)}` : ", sin meta definida"}${fila.estado ? `, ${textoEstado[fila.estado].toLowerCase()}` : ""}`}>
        {fila.actual !== null && <div className="h-full rounded-full" style={{ width: posicion(fila.actual), backgroundColor: color }} />}
        {fila.anterior !== null && <i className="absolute -top-[3px] h-[18px] w-[3px] rounded bg-[#9fb2c4]" style={{ left: posicion(fila.anterior) }} title={`Mes anterior: ${formato(fila.anterior)}`} />}
        {fila.esperado !== null && <i className="absolute -top-[3px] h-[18px] w-[3px] rounded bg-[#0b376a]" style={{ left: posicion(fila.esperado) }} title={`Ritmo esperado a hoy: ${formato(fila.esperado)}`} />}
        {fila.meta !== null && <i className="absolute -top-[5px] h-[22px] w-[3px] rounded bg-[#d62f4f]" style={{ left: posicion(fila.meta) }} title={`Meta: ${formato(fila.meta)}`} />}
      </div>
      <p className="m-0 text-[10px] text-[#5a6f84]">
        {fila.meta === null ? "Sin meta definida." : <>
          {fila.avance !== null ? `${porcentaje(fila.avance)} de la meta. ` : ""}
          {fila.estado ? <b style={{ color: colorEstado[fila.estado] }}>{textoEstado[fila.estado]}{fila.esperado !== null ? ` frente al ritmo esperado (${formato(fila.esperado)})` : ""}.</b> : null}
        </>}
        {fila.anterior !== null ? ` Mes anterior: ${formato(fila.anterior)}.` : ""}
      </p>
    </div>
  );
}

function EditorMetas({ metas, onGuardar, onCerrar }: { metas: MetasDashboard["metas"] | null; onGuardar: Props["onGuardar"]; onCerrar: () => void }) {
  const id = useId();
  const inicial = Object.fromEntries(indicadores.map((indicador) => [indicador, metas?.[indicador] ? String(metas[indicador]!.valor) : ""])) as Record<IndicadorMeta, string>;
  const [valores, setValores] = useState(inicial);
  const [alcance, setAlcance] = useState<"MES" | "TODOS">("TODOS");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    const cambios: CambioMeta[] = [];
    for (const indicador of indicadores) {
      const texto = valores[indicador].trim().replace(",", ".");
      if (texto === inicial[indicador]) continue;
      const valor = texto === "" ? null : Number(texto);
      if (valor !== null && (!Number.isFinite(valor) || valor <= 0)) { setError(`La meta de ${etiquetas[indicador].titulo.toLowerCase()} debe ser un número mayor que cero.`); return; }
      if (valor !== null && indicador !== "VENTAS_MES" && valor > 100) { setError(`La meta de ${etiquetas[indicador].titulo.toLowerCase()} no puede superar 100%.`); return; }
      cambios.push({ indicador, valor });
    }
    if (!cambios.length) { onCerrar(); return; }
    setGuardando(true);
    setError("");
    try { await onGuardar(cambios, alcance); onCerrar(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudieron guardar las metas."); }
    finally { setGuardando(false); }
  };

  return (
    <form className="grid gap-2.5 rounded-xl border border-[#dbe3e9] bg-[#f7fafc] p-3" onSubmit={(evento) => { evento.preventDefault(); void guardar(); }}>
      {indicadores.map((indicador) => (
        <label key={indicador} htmlFor={`${id}-${indicador}`} className="grid grid-cols-[1fr_110px] items-center gap-2 text-[11px] font-bold text-[#244967]">
          <span>{etiquetas[indicador].titulo} ({etiquetas[indicador].sufijo})</span>
          <input id={`${id}-${indicador}`} type="number" inputMode="decimal" min="0" step="0.01" value={valores[indicador]} placeholder="Sin meta" onChange={(evento) => setValores((actual) => ({ ...actual, [indicador]: evento.target.value }))} className="min-h-9 rounded-lg border border-[#cbd8e4] bg-white px-2 text-right text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2878b9]" />
        </label>
      ))}
      <label htmlFor={`${id}-alcance`} className="grid grid-cols-[1fr_150px] items-center gap-2 text-[11px] font-bold text-[#244967]">
        <span>Aplicar a</span>
        <select id={`${id}-alcance`} value={alcance} onChange={(evento) => setAlcance(evento.target.value as "MES" | "TODOS")} className="min-h-9 rounded-lg border border-[#cbd8e4] bg-white px-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2878b9]">
          <option value="TODOS">Todos los meses</option>
          <option value="MES">Solo este mes</option>
        </select>
      </label>
      <p className="m-0 text-[10px] text-[#5a6f84]">Deja un campo vacío para quitar su meta. Una meta propia de un mes tiene prioridad sobre la de todos los meses.</p>
      {error && <p className="m-0 text-[11px] font-bold text-[#a8283b]" role="alert">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCerrar} disabled={guardando} className="min-h-9 rounded-lg border border-[#cbd8e4] bg-white px-3 text-[11px] font-bold text-[#244967] hover:bg-[#f5f8fb] disabled:opacity-60">Cancelar</button>
        <button type="submit" disabled={guardando} className="min-h-9 rounded-lg bg-[#0b376a] px-3 text-[11px] font-bold text-white hover:bg-[#10508f] disabled:opacity-60">{guardando ? "Guardando…" : "Guardar metas"}</button>
      </div>
    </form>
  );
}

export function AvanceMetasPanel({ avances, soles, metas, puedeConfigurar, onGuardar }: Props) {
  const [editando, setEditando] = useState(false);
  const sinMetas = avances.every((fila) => fila.meta === null);
  return (
    <div className="grid gap-4">
      {sinMetas && !editando && <p className="m-0 rounded-xl border border-dashed border-[#cbd8e4] p-3 text-[11px] text-[#5a6f84]">Aún no hay metas definidas. {puedeConfigurar ? "Defínelas para ver qué tan cerca estás." : "Pide a un administrador de finanzas que las defina."}</p>}
      {avances.map((fila) => <BarraMeta key={fila.clave} fila={fila} soles={soles} />)}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#5a6f84]" role="list" aria-label="Leyenda de las barras">
        <span role="listitem"><b className="text-[#d62f4f]">▌</b> Meta</span>
        <span role="listitem"><b className="text-[#0b376a]">▌</b> Ritmo esperado a hoy</span>
        <span role="listitem"><b className="text-[#9fb2c4]">▌</b> Mes anterior</span>
      </div>
      {puedeConfigurar && (editando
        ? <EditorMetas key="editor" metas={metas} onGuardar={onGuardar} onCerrar={() => setEditando(false)} />
        : <button type="button" onClick={() => setEditando(true)} className="justify-self-start rounded-lg border border-[#cbd8e4] bg-white px-3 py-2 text-[11px] font-bold text-[#244967] hover:bg-[#f5f8fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878b9]">Configurar metas</button>)}
    </div>
  );
}
