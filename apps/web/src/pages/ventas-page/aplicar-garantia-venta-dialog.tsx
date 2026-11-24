import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { DialogoCatalogo, fechaInventario } from "../../components/inventario/dialogo-catalogo";
import { servicioMototaxis, type GarantiaModeloMototaxi } from "../../services/mototaxis.service";
import type { VentaListado } from "../../services/ingresos.service";

type Props = { venta: VentaListado; onClose: () => void; onApplied: () => void };
function fechaFin(fecha: string, meses: number) { const [y, m, d] = fecha.split("-").map(Number); const fin = new Date(Date.UTC(y, m - 1 + meses + 1, 0)); fin.setUTCDate(Math.min(d, fin.getUTCDate())); return fin.toISOString().slice(0, 10); }
const hoyPeru = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });

export function AplicarGarantiaVentaDialog({ venta, onClose, onApplied }: Props) {
  const lineas = venta.mototaxis ?? [];
  const [detalleId, setDetalleId] = useState(lineas[0]?.id ?? "");
  const linea = lineas.find((item) => item.id === detalleId);
  const [politica, setPolitica] = useState<GarantiaModeloMototaxi | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setPolitica(null); setError(""); setCargando(true);
    if (!linea?.modeloId) { setCargando(false); return; }
    void servicioMototaxis.garantiaModelo(linea.modeloId).then((valor) => { if (vigente) setPolitica(valor); })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo consultar la política de garantía."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [linea?.modeloId]);

  async function aplicar() {
    if (!linea || !politica?.activa || guardando || linea.garantiaAplicada) return;
    setGuardando(true); setError("");
    try { await servicioMototaxis.aplicarGarantiaVenta(linea.id); onApplied(); onClose(); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo aplicar la garantía a esta venta."); }
    finally { setGuardando(false); }
  }

  const aplicada = linea?.garantiaAplicada;
  const vigenteParaVenta = politica?.activa && hoyPeru() <= fechaFin(venta.fecha, politica.mesesVigencia);
  return <DialogoCatalogo titulo="Garantía aplicada a la venta" articulo={venta.clienteNombre || "Cliente no especificado"} codigo={venta.codigoComprobante} guardando={guardando} alCerrar={onClose}
    acciones={<><Button type="button" variant="outline" onClick={onClose}>Cerrar</Button>{!aplicada && <Button type="button" disabled={guardando || cargando || !vigenteParaVenta} onClick={() => void aplicar()}>{guardando ? "Aplicando…" : "Aplicar garantía"}</Button>}</>}>
    <div className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-medium">Mototaxi de esta venta<select value={detalleId} onChange={(e) => setDetalleId(e.target.value)} className="w-full rounded-lg border border-[var(--erp-border)] bg-[var(--erp-surface)] p-2.5">{lineas.map((item) => <option key={item.id} value={item.id}>{item.descripcion} · {item.cantidad} un.</option>)}</select></label>
      {linea && <div className="grid gap-1 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface-muted)] p-4 text-sm"><strong>Venta {venta.codigoComprobante}</strong><span>Fecha de venta: {fechaInventario(venta.fecha)}</span><span>Cliente: {venta.clienteNombre || "Sin nombre registrado"}</span><span>Unidades incluidas: {linea.cantidad}</span></div>}
      {cargando && <p role="status" className="m-0 text-sm">Consultando garantía definida para el modelo…</p>}
      {!cargando && !error && aplicada && <section className="grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><h3 className="m-0 text-base">Garantía aplicada a esta venta</h3><p className="m-0">Vigencia: {fechaInventario(aplicada.iniciaEn)} – {fechaInventario(aplicada.terminaEn)} · {aplicada.mesesVigencia} meses · {aplicada.cantidad} unidades.</p><div><strong>Cobertura</strong><p className="m-0 whitespace-pre-wrap">{aplicada.alcance}</p></div>{aplicada.exclusiones && <div><strong>Exclusiones</strong><p className="m-0 whitespace-pre-wrap">{aplicada.exclusiones}</p></div>}<small>Esta copia pertenece a la venta y conserva estas condiciones aunque luego se edite la política del modelo.</small></section>}
      {!cargando && !aplicada && politica?.activa && <section className="grid gap-3 rounded-xl border border-[var(--erp-border)] p-4 text-sm"><div><h3 className="m-0 text-base">Política del modelo</h3><p className="m-0 mt-1">{politica.mesesVigencia} meses desde la venta. Al aplicar, cubrirá {linea?.cantidad ?? "—"} unidad(es), del {fechaInventario(venta.fecha)} al {fechaInventario(fechaFin(venta.fecha, politica.mesesVigencia))}.</p></div><div><strong>¿Qué cubre?</strong><p className="m-0 whitespace-pre-wrap">{politica.alcance}</p></div>{politica.exclusiones && <div><strong>¿Qué no cubre?</strong><p className="m-0 whitespace-pre-wrap">{politica.exclusiones}</p></div>}</section>}
      {!cargando && !aplicada && !politica?.activa && !error && <p className="m-0 rounded-lg bg-amber-50 p-4 text-sm">El modelo de esta mototaxi no tiene una garantía activa definida. Configúrala en Inventario de mototaxis antes de aplicarla.</p>}
      {!cargando && !aplicada && politica?.activa && !vigenteParaVenta && <p className="m-0 rounded-lg bg-amber-50 p-4 text-sm">La vigencia calculada desde la fecha de esta venta ya terminó, por lo que no se puede aplicar ahora.</p>}
      {error && <p role="alert" className="m-0 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  </DialogoCatalogo>;
}
