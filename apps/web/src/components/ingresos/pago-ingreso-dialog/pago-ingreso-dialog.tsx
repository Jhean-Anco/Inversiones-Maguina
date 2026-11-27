import { Dialogo } from "../../ui/dialogo/dialogo";
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

  const pie = (
    <>
      <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={onClose}>Cerrar</button>
      {saldo > 0 && (
        <button type="submit" form="pago-ingreso-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando}>
          {guardando ? "Guardando…" : "Registrar pago"}
        </button>
      )}
    </>
  );

  return (
    <Dialogo
      kicker="VENTA"
      titulo="Registrar pago"
      ancho="md"
      cerrable={!guardando}
      onCerrar={onClose}
      subtitulo={`Total S/ ${Number(total).toFixed(2)} · saldo pendiente S/ ${saldo.toFixed(2)}`}
      pie={pie}
    >
      {error && <NotificacionFlotante mensaje={error} />}

      {cargando ? (
        <p className="m-0 text-sm text-[#52697d]">Cargando pagos…</p>
      ) : (
        <section aria-label="Pagos registrados" className="grid gap-2">
          <h3 className="m-0 text-[15px] font-bold text-[#0b2545]">Pagos registrados</h3>
          {items.length ? items.map((item) => (
            <article key={item.id} className="flex justify-between gap-3 border-t border-[#edf1f6] py-2.5">
              <div className="grid gap-0.5">
                <strong className="text-sm text-[#0b2545]">{new Date(`${item.fechaPago}T00:00:00`).toLocaleDateString("es-PE")} · S/ {Number(item.importeAplicado).toFixed(2)}</strong>
                <span className="text-xs text-[#52697d]">{item.medioPago}{item.cuentaFinancieraNombre ? ` · ${item.cuentaFinancieraNombre}` : ""}</span>
              </div>
              {item.observacion && <small className="text-xs text-[#52697d]">{item.observacion}</small>}
            </article>
          )) : <p className="m-0 text-sm text-[#52697d]">Aún no se registraron pagos.</p>}
        </section>
      )}

      {saldo > 0 && (
        <form id="pago-ingreso-form" className="grid gap-4" onSubmit={(evento) => void registrar(evento)}>
          <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Fecha de pago<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" type="date" max={hoy()} required value={fechaPago} onChange={(evento) => setFechaPago(evento.target.value)} /></label>
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,.8fr)_minmax(220px,1.2fr)]">
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">{contadoPendiente ? "Saldo a cancelar (S/)" : "Importe aplicado (S/)"}<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" type="number" min="0.01" max={saldo.toFixed(2)} step="0.01" required value={importeAplicado} readOnly={contadoPendiente || importeInicialObligatorio} onChange={(evento) => setImporteAplicado(evento.target.value)} /></label>
            <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={(id, medio) => { setCuentaFinancieraId(id); setMedioPago(medio); }} />
          </div>
          <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Referencia (opcional)<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" maxLength={100} value={referenciaPago} onChange={(evento) => setReferenciaPago(evento.target.value)} /></label>
          <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Observación (opcional)<textarea className="rounded-xl border border-[#c5d1db] p-3 text-sm" rows={3} maxLength={500} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
        </form>
      )}
    </Dialogo>
  );
}
