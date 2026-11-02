import { useEffect, useState, type FormEvent } from "react";
import { servicioIngresos, type PagoIngreso } from "../../../services/ingresos.service";
import { SelectorCuentaFinanciera } from "../../finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import "./pago-ingreso-dialog.css";

type Props = { ingresoId: string; total: string; contadoPendiente?: boolean; importeInicialObligatorio?: boolean; fechaPagoInicial?: string; importeInicial?: string; medioPagoInicial?: string; onPaymentRecorded?: () => void; onClose: () => void };
const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const uuid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

export function PagoIngresoDialog({ ingresoId, total, contadoPendiente = false, importeInicialObligatorio = false, fechaPagoInicial, importeInicial, medioPagoInicial, onPaymentRecorded, onClose }: Props) {
  const [items, setItems] = useState<PagoIngreso[]>([]);
  const [importeAplicadoTotal, setImporteAplicadoTotal] = useState(0);
  const [fechaPago, setFechaPago] = useState(fechaPagoInicial ?? hoy());
  const [importeAplicado, setImporteAplicado] = useState(contadoPendiente || importeInicialObligatorio ? (importeInicial ?? total) : "");
  const [medioPago, setMedioPago] = useState(medioPagoInicial ?? "EFECTIVO");
  const [cuentaFinancieraId, setCuentaFinancieraId] = useState("");
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
      setItems(datos.items); setImporteAplicadoTotal(Number(datos.importeAplicadoTotal)); setError("");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo cargar el historial de pagos."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, [ingresoId]);

  async function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    const importe = Number(importeAplicado);
    if (!Number.isFinite(importe) || importe <= 0 || importe > saldo) { setError("Ingresa un importe válido que no supere el saldo pendiente."); return; }
    setGuardando(true);
    try {
      await servicioIngresos.registrarPago(ingresoId, { idempotencyKey: uuid(), fechaPago, importeAplicado: importe.toFixed(2), medioPago, cuentaFinancieraId, referenciaPago: referenciaPago.trim() || undefined, observacion: observacion.trim() || undefined });
      setImporteAplicado(""); setReferenciaPago(""); setObservacion("");
      await cargar(); onPaymentRecorded?.();
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el pago."); }
    finally { setGuardando(false); }
  }

  return <div className="pago-dialog-backdrop" role="presentation"><section className="pago-dialog" role="dialog" aria-modal="true" aria-labelledby="pago-dialog-title">
    <header><div><span>VENTA</span><h2 id="pago-dialog-title">Registrar pago</h2><p>Total {`S/ ${Number(total).toFixed(2)}`} · saldo pendiente {`S/ ${saldo.toFixed(2)}`}</p></div><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header>
    {error && <p role="alert">{error}</p>}
    {cargando ? <p>Cargando pagos…</p> : <section className="pago-history"><h3>Pagos registrados</h3>{items.length ? items.map((item) => <article key={item.id}><strong>{new Date(`${item.fechaPago}T00:00:00`).toLocaleDateString("es-PE")} · S/ {Number(item.importeAplicado).toFixed(2)}</strong><span>{item.medioPago}</span></article>) : <p>Aún no se registraron pagos.</p>}</section>}
    {saldo > 0 && <form onSubmit={(evento) => void registrar(evento)}>
      <label>Fecha de pago<input type="date" max={hoy()} required value={fechaPago} onChange={(evento) => setFechaPago(evento.target.value)} /></label>
      <label>Importe aplicado (S/)<input type="number" min="0.01" max={saldo.toFixed(2)} step="0.01" required value={importeAplicado} onChange={(evento) => setImporteAplicado(evento.target.value)} /></label>
      <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={(id, medio) => { setCuentaFinancieraId(id); setMedioPago(medio); }} />
      <label>Referencia (opcional)<input maxLength={100} value={referenciaPago} onChange={(evento) => setReferenciaPago(evento.target.value)} /></label>
      <label>Observación (opcional)<textarea maxLength={500} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
      <button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Registrar pago"}</button>
    </form>}
    <footer><button type="button" onClick={onClose}>Cerrar</button></footer>
  </section></div>;
}
