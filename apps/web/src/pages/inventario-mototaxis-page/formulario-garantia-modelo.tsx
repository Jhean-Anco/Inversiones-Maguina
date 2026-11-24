import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioMototaxis, type ModeloMototaxi } from "../../services/mototaxis.service";

type Props = { modelo: ModeloMototaxi; puedeEditar: boolean; alCerrar: () => void; alGuardar: () => void };
type FormData = { activa: boolean; mesesVigencia: string; alcance: string; exclusiones: string };
const vacio: FormData = { activa: true, mesesVigencia: "12", alcance: "", exclusiones: "" };

export function FormularioGarantiaModelo({ modelo, puedeEditar, alCerrar, alGuardar }: Props) {
  const [datos, setDatos] = useState<FormData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let vigente = true; void servicioMototaxis.garantiaModelo(modelo.id).then((g) => { if (vigente) setDatos(g ? { activa: g.activa, mesesVigencia: String(g.mesesVigencia), alcance: g.alcance, exclusiones: g.exclusiones ?? "" } : vacio); }).catch((e: unknown) => { if (vigente) { setError(e instanceof Error ? e.message : "No se pudo cargar la garantía."); setDatos(vacio); } }); return () => { vigente = false; }; }, [modelo.id]);
  if (!datos) return createPortal(<div className="fixed inset-0 z-[180] grid place-items-center bg-[#14283d80] p-4"><section role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-[var(--erp-surface)] p-6"><p role="status" className="m-0">Cargando garantía del modelo…</p></section></div>, document.body);
  return <FormularioGarantiaModeloCargado modelo={modelo} inicial={datos} errorInicial={error} puedeEditar={puedeEditar} alCerrar={alCerrar} alGuardar={alGuardar} />;
}

function FormularioGarantiaModeloCargado({ modelo, inicial, errorInicial, puedeEditar, alCerrar, alGuardar }: Props & { inicial: FormData; errorInicial: string }) {
  const [datos, setDatos] = useState(inicial);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(errorInicial);
  const formulario = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(formulario, alCerrar, "la garantía del modelo", JSON.stringify(datos));
  useDialogoFlotante(formulario, true, () => { if (!guardando) solicitarCancelacion(); });
  const falloLectura = Boolean(errorInicial);
  async function guardar(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!puedeEditar || guardando) return; setGuardando(true); setError(""); try { await servicioMototaxis.guardarGarantiaModelo(modelo.id, { activa: datos.activa, mesesVigencia: Number(datos.mesesVigencia), alcance: datos.alcance, exclusiones: datos.exclusiones }); alGuardar(); } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo guardar la garantía."); } finally { setGuardando(false); } }
  const nombre = [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ");
  return createPortal(<>{dialogo}<div className="fixed inset-0 z-[180] grid place-items-center bg-[#14283d80] p-3 sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) solicitarCancelacion(); }}><form ref={formulario} role="dialog" aria-modal="true" aria-labelledby="garantia-modelo-title" onSubmit={(e) => void guardar(e)} className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-ink)] shadow-2xl">
    <header className="flex items-start justify-between gap-4 border-b border-[var(--erp-border)] px-5 py-4 sm:px-7"><div><p className="m-0 text-xs font-bold uppercase tracking-wider text-[var(--erp-ink-soft)]">Política de garantía para clientes</p><h2 id="garantia-modelo-title" className="mb-0 mt-1 text-xl font-bold">{nombre}</h2><p className="m-0 mt-1 text-sm">Define las condiciones que se podrán aplicar a una venta de este modelo.</p></div><button type="button" aria-label="Cerrar" onClick={solicitarCancelacion} className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--erp-border)]">×</button></header>
    <div className="grid min-h-0 gap-5 overflow-y-auto p-5 sm:p-7">
      {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <label className="flex items-start gap-3 rounded-xl border border-[var(--erp-border)] p-4"><input type="checkbox" checked={datos.activa} disabled={!puedeEditar} onChange={(e) => setDatos((d) => ({ ...d, activa: e.target.checked }))} className="mt-1 size-4"/><span><strong className="block">Este modelo cuenta con garantía</strong><small className="text-[var(--erp-ink-soft)]">Al activarla, estará disponible para aplicarse a sus ventas emitidas.</small></span></label>
      <label className="grid gap-1.5 text-sm font-medium">Vigencia desde la fecha de venta<input type="number" min="1" max="120" required disabled={!puedeEditar || !datos.activa} value={datos.mesesVigencia} onChange={(e) => setDatos((d) => ({ ...d, mesesVigencia: e.target.value }))} className="w-full rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2.5"/><small className="font-normal text-[var(--erp-ink-soft)]">Meses (de 1 a 120). La venta guardará su propio periodo y condiciones.</small></label>
      <label className="grid gap-1.5 text-sm font-medium">¿Qué cubre la garantía?<textarea required maxLength={4000} rows={4} disabled={!puedeEditar || !datos.activa} value={datos.alcance} onChange={(e) => setDatos((d) => ({ ...d, alcance: e.target.value }))} placeholder="Indica componentes cubiertos y condiciones de atención." className="w-full resize-y rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] p-3"/></label>
      <label className="grid gap-1.5 text-sm font-medium">¿Qué no cubre?<textarea maxLength={4000} rows={3} disabled={!puedeEditar || !datos.activa} value={datos.exclusiones} onChange={(e) => setDatos((d) => ({ ...d, exclusiones: e.target.value }))} placeholder="Ej. desgaste, mantenimiento omitido o daños por uso indebido." className="w-full resize-y rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] p-3"/></label>
      <p className="m-0 rounded-lg bg-[var(--erp-surface-muted)] p-3 text-sm">Al aplicar esta garantía desde una venta, se conservarán en esa venta su vigencia, alcance, exclusiones y cantidad. Los cambios posteriores al modelo no modificarán ventas ya atendidas.</p>
      {!puedeEditar && <p className="m-0 text-sm text-[var(--erp-ink-soft)]">Tu perfil permite consultar, pero no modificar esta garantía.</p>}
    </div><footer className="flex justify-end gap-2 border-t border-[var(--erp-border)] px-5 py-3 sm:px-7"><button type="button" disabled={guardando} onClick={solicitarCancelacion} className="rounded-lg border border-[var(--erp-border)] px-4 py-2">Cancelar</button>{puedeEditar && <button type="submit" disabled={guardando || falloLectura} className="rounded-lg bg-[var(--action-primary)] px-4 py-2 font-semibold text-white">{guardando ? "Guardando…" : "Guardar garantía"}</button>}</footer>
  </form></div></>, document.body);
}
