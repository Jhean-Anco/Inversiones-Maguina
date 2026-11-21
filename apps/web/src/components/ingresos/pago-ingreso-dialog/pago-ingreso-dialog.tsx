import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { useEffect, useState, type FormEvent } from "react";
import { servicioIngresos, type PagoIngreso } from "../../../services/ingresos.service";
import { SelectorCuentaFinanciera } from "../../finanzas/selector-cuenta-financiera/selector-cuenta-financiera";

type Props = { ingresoId: string; total: string; contadoPendiente?: boolean; importeInicialObligatorio?: boolean; fechaPagoInicial?: string; importeInicial?: string; medioPagoInicial?: string; cuentaFinancieraInicialId?: string; onPaymentRecorded?: () => void; onClose: () => void };
const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function PagoIngresoDialog({ ingresoId, total, contadoPendiente = false, importeInicialObligatorio = false, fechaPagoInicial, importeInicial, medioPagoInicial, cuentaFinancieraInicialId = "", onPaymentRecorded, onClose }: Props) {
  const [items, setItems] = useState<PagoIngreso[]>([]);
  const [importeAplicadoTotal, setImporteAplicadoTotal] = useState(0);
  const [fechaPago, setFechaPago] = useState(fechaPagoInicial ?? hoy());
  const [importeAplicado, setImporteAplicado] = useState(contadoPendiente || importeInicialObligatorio ? (importeInicial ?? total) : "");
  const [medioPago, setMedioPago] = useState(medioPagoInicial ?? "EFECTIVO");
  const [cuentaFinancieraId, setCuentaFinancieraId] = useState(cuentaFinancieraInicialId);
  const [referenciaPago, setReferenciaPago] = useState("");
  const [observacion, setObservacion] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const saldo = Math.max(0, Number(total) - importeAplicadoTotal);

  async function cargar() {
    setCargando(true);
    try {
      const datos = await servicioIngresos.listarPagos(ingresoId);
      setItems(datos.items); setImporteAplicadoTotal(Number(datos.importeAplicadoTotal)); if (contadoPendiente) setImporteAplicado(datos.saldoPendiente); setError("");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo cargar el historial de pagos."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, [ingresoId]);

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    const importe = Number(importeAplicado);
    if (!Number.isFinite(importe) || importe <= 0 || importe > saldo || (contadoPendiente && Math.round(importe * 100) !== Math.round(saldo * 100))) { setError(contadoPendiente ? "La venta debe cancelarse por el saldo completo." : "Ingresa un importe válido que no supere el saldo pendiente."); return; }
    setGuardando(true);
    try {
      await servicioIngresos.registrarPago(ingresoId, { idempotencyKey: uuid(), fechaPago, importeAplicado: importe.toFixed(2), medioPago, cuentaFinancieraId, referenciaPago: referenciaPago.trim() || undefined, observacion: observacion.trim() || undefined });
      setImporteAplicado(""); setReferenciaPago(""); setObservacion("");
      await cargar(); onPaymentRecorded?.();
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el pago."); }
    finally { setGuardando(false); }
  }

  return <div className="pago-dialog-backdrop fixed inset-0 z-[1100] grid place-items-center bg-[rgba(6,22,42,.58)] p-5 backdrop-blur-[5px] [html[data-responsive-profile=mobile-portrait]_&]:p-2 [html[data-responsive-profile=mobile-portrait]_&]:items-end" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}><section className="pago-dialog w-[min(760px,100%)] max-h-[min(92dvh,960px)] overflow-auto border border-[var(--border-subtle,#d8e3ef)] rounded-[20px] bg-[var(--surface,#fff)] text-[var(--text-primary,#173b63)] shadow-[0_24px_80px_rgba(8,32,64,.28)] [html[data-responsive-profile=mobile-portrait]_&]:max-h-[95dvh] [html[data-responsive-profile=mobile-portrait]_&]:rounded-[18px_18px_10px_10px]" role="dialog" aria-modal="true" aria-labelledby="pago-dialog-title">
    <header className="flex justify-between gap-4 border-b border-[var(--border-subtle,#d8e3ef)] p-6 [&_h2]:my-[5px] [&_h2]:text-2xl [&_p]:m-0 [&_p]:text-[#7186a2] [&_p]:text-[.9rem] [&_button]:h-[38px] [&_button]:w-[38px] [&_button]:cursor-pointer [&_button]:rounded-[10px] [&_button]:border [&_button]:border-[#d8e3ef] [&_button]:bg-transparent [&_button]:text-[1.4rem] [html[data-responsive-profile=mobile-portrait]_&]:p-4"><div><span>VENTA</span><h2 id="pago-dialog-title">Registrar pago</h2><p>Total {`S/ ${Number(total).toFixed(2)}`} · saldo pendiente {`S/ ${saldo.toFixed(2)}`}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
    <div className="pago-dialog-body">
    {error && <NotificacionFlotante mensaje={error} />}
    {cargando ? <p>Cargando pagos…</p> : <section className="pago-history border-b border-[#e4ebf3] px-6 py-4 [&_h3]:m-0 [&_h3]:mb-2 [&_h3]:text-[.95rem] [&_article]:flex [&_article]:justify-between [&_article]:gap-3 [&_article]:border-t [&_article]:border-[#edf1f6] [&_article]:py-[9px] [&_article_div]:grid [&_article_div]:gap-[3px] [&_small]:text-[.78rem] [&_small]:text-[#7186a2] [&_article>span]:text-[.78rem] [&_article>span]:text-[#7186a2] [html[data-responsive-profile=mobile-portrait]_&]:px-4 [html[data-responsive-profile=mobile-portrait]_&]:py-3"><h3>Pagos registrados</h3>{items.length ? items.map((item) => <article key={item.id}><strong>{new Date(`${item.fechaPago}T00:00:00`).toLocaleDateString("es-PE")} · S/ {Number(item.importeAplicado).toFixed(2)}</strong><span>{item.medioPago}{item.cuentaFinancieraNombre ? ` · ${item.cuentaFinancieraNombre}` : ""}</span>{item.observacion && <small>{item.observacion}</small>}</article>) : <p>Aún no se registraron pagos.</p>}</section>}
    {saldo > 0 && <form id="pago-ingreso-form" onSubmit={(evento) => void registrar(evento)}>
      <label>Fecha de pago<input type="date" max={hoy()} required value={fechaPago} onChange={(evento) => setFechaPago(evento.target.value)} /></label>
      <div className="pago-payment-pair grid grid-cols-[minmax(0,.8fr)_minmax(220px,1.2fr)] items-end gap-3 [&>label]:grid [&>label]:min-w-0 [&>label]:gap-1.5 [&>label]:text-xs [&>label]:font-bold [&>label]:text-[#355372] [&>.selector-cuenta-financiera]:grid [&>.selector-cuenta-financiera]:min-w-0 [&>.selector-cuenta-financiera]:gap-1.5 [&>.selector-cuenta-financiera]:text-xs [&>.selector-cuenta-financiera]:font-bold [&>.selector-cuenta-financiera]:text-[#355372] [&_input]:box-border [&_input]:min-h-10 [&_input]:w-full [&_input]:rounded-[9px] [&_input]:border [&_input]:border-[#d5e0ec] [&_input]:bg-white [&_input]:px-[11px] [&_input]:text-[13px] [&_input]:text-[#173c67] [&_select]:box-border [&_select]:min-h-10 [&_select]:w-full [&_select]:rounded-[9px] [&_select]:border [&_select]:border-[#d5e0ec] [&_select]:bg-white [&_select]:px-[11px] [&_select]:text-[13px] [&_select]:text-[#173c67] [html[data-responsive-profile=mobile-portrait]_&]:grid-cols-1">
        <label>{contadoPendiente ? "Saldo a cancelar (S/)" : "Importe aplicado (S/)"}<input type="number" min="0.01" max={saldo.toFixed(2)} step="0.01" required value={importeAplicado} readOnly={contadoPendiente || importeInicialObligatorio} onChange={(evento) => setImporteAplicado(evento.target.value)} /></label>
        <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={(id, medio) => { setCuentaFinancieraId(id); setMedioPago(medio); }} />
      </div>
      <label>Referencia (opcional)<input maxLength={100} value={referenciaPago} onChange={(evento) => setReferenciaPago(evento.target.value)} /></label>
      <label>Observación (opcional)<textarea maxLength={500} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
    </form>}
    </div>
    <footer><button type="button" onClick={onClose}>Cerrar</button>{saldo > 0 && <button className="pago-submit" type="submit" form="pago-ingreso-form" disabled={guardando}>{guardando ? "Guardando…" : "Registrar pago"}</button>}</footer>
  </section></div>;
}
