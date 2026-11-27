import "./mototaxis-page.css";
import { useEffect, useState } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useNavigate } from "react-router-dom";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { servicioMototaxis } from "../../services/mototaxis.service";
import { GarantiasMototaxis } from "./garantias-mototaxis";
import { AjusteInventarioMototaxis } from "./ajuste-inventario-mototaxis";
import { useDatosMototaxis, type SeccionMototaxis } from "./use-datos-mototaxis";
import { usePagosCompraMototaxi } from "./use-pagos-compra-mototaxi";
import { mototaxisClasses } from "./mototaxis-classes";
import { ComprasMototaxisListado } from "./compras-mototaxis-listado";
import { FormularioCompraMototaxis } from "./formulario-compra-mototaxis";
import { ConfirmarAnulacion } from "../../components/ui/confirmar-anulacion";
const fechaHoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
const soles = (n: string | number) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function MototaxisPage({ seccion = "compras", puedeAjustarInventario = false, puedeCrearReclamo = false, esNuevaCompra = false, puedeAnularCompra = false }: { puedeAnularCompra?: boolean; seccion?: SeccionMototaxis; puedeAjustarInventario?: boolean; puedeCrearReclamo?: boolean; esNuevaCompra?: boolean }) {
  const navegar = useNavigate();
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [exito, setExito] = useState("");
  const [guardando, setGuardando] = useState(false);
  const datos = useDatosMototaxis({ seccion, busquedaCompras });
  const { marcas, modelos, proveedores, garantias, reclamos, compras, cargando, error, setError, manejarError, cargar, setProveedores } = datos;
  const [compraPorAnular, setCompraPorAnular] = useState<typeof compras[number] | null>(null);
  async function anularCompra(motivo: string) {
    if (!compraPorAnular) return;
    await servicioMototaxis.anularCompra(compraPorAnular.id, motivo);
    setExito(`Compra ${compraPorAnular.codigo} anulada. Se revirtieron sus unidades y su pago.`);
    setCompraPorAnular(null);
    await cargar();
  }
  const { compraPago, setCompraPago, pagosCompra, formPago, setFormPago, abrirPago, guardarPago } = usePagosCompraMototaxi({ fechaHoy, setError, manejarError, cargar, setExito, setGuardando });
  useEffect(() => {
    if (!compraPago) return;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === "Escape" && !guardando) setCompraPago(null); };
    window.addEventListener("keydown", cerrarConEscape);
    return () => { document.body.style.overflow = overflowAnterior; window.removeEventListener("keydown", cerrarConEscape); };
  }, [compraPago, guardando]);

  const avisos = <>
    {error && <NotificacionFlotante tipo="error" mensaje={error} duracionMs={0} onCerrar={() => setError("")} />}{exito && <NotificacionFlotante tipo="exito" mensaje={exito} duracionMs={4000} onCerrar={() => setExito("")} />}
  </>;

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (esNuevaCompra) return <>{avisos}<FormularioCompraMototaxis marcas={marcas} modelos={modelos} proveedores={proveedores}
    alAgregarProveedor={(proveedor) => setProveedores((actuales) => [proveedor, ...actuales])}
    alCambiarCatalogo={() => void cargar()} alCerrar={() => navegar("/mototaxis/compras")} /></>;

  return <>
    {avisos}
    {seccion === "compras" && <ComprasMototaxisListado compras={compras} cargando={cargando}
      busqueda={busquedaCompras} alBuscar={setBusquedaCompras}
      alCrear={() => navegar("/mototaxis/compras/nueva")} alPagar={(compra) => void abrirPago(compra)} alAnular={puedeAnularCompra ? setCompraPorAnular : undefined} />}
    {compraPorAnular && <ConfirmarAnulacion titulo={`¿Anular la compra ${compraPorAnular.codigo}?`} descripcion="Se descontarán sus unidades del inventario, quedarán sin efecto sus garantías con el proveedor y su pago dejará de contar en las cuentas. No se puede deshacer." etiquetaConfirmar="Anular compra" onCancelar={() => setCompraPorAnular(null)} onConfirmar={anularCompra} />}
    {seccion !== "compras" && <section className={`mototaxis-page ${mototaxisClasses.page}`}>
      {seccion === "garantias" && <GarantiasMototaxis garantias={garantias} reclamos={reclamos} cargando={cargando} puedeCrear={puedeCrearReclamo} puedeEditar={puedeAjustarInventario} alActualizar={cargar} />}
      {seccion === "movimientos" && <AjusteInventarioMototaxis puedeAjustar={puedeAjustarInventario} />}
    </section>}
    {compraPago && (
      <Dialogo
        titulo="Cancelar saldo pendiente"
        subtitulo={`${compraPago.codigo} · saldo a cancelar ${soles(compraPago.saldo)}`}
        ancho="md"
        cerrable={!guardando}
        onCerrar={() => setCompraPago(null)}
        pie={
          <>
            <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={() => setCompraPago(null)}>Cancelar</button>
            <button type="submit" form="moto-payment-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando}><span aria-hidden="true">+</span>{guardando ? "Aplicando…" : "Cancelar saldo completo"}</button>
          </>
        }
      >
        <form id="moto-payment-form" className="grid gap-4" onSubmit={(e) => void guardarPago(e)}>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Fecha<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" type="date" required max={fechaHoy()} value={formPago.fechaPago} onChange={(e) => setFormPago((p) => ({ ...p, fechaPago: e.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Saldo (S/)<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" type="number" required min="0.01" max={compraPago.saldo} step="0.01" value={compraPago.saldo} readOnly /></label>
            <SelectorCuentaFinanciera value={formPago.cuentaFinancieraId} medioActual={formPago.medioPago} onChange={(id, medio) => setFormPago((p) => ({ ...p, cuentaFinancieraId: id, medioPago: medio }))} />
          </div>
          <div className="grid gap-2">
            <strong className="text-sm text-[#0b2545]">Pagos registrados</strong>
            {pagosCompra.map((p) => (
              <div key={p.id} className="flex justify-between gap-3 border-t border-[#edf1f6] py-2 text-sm">
                <span className="text-[#52697d]">{new Date(`${p.fechaPago}T00:00:00`).toLocaleDateString("es-PE")} · {p.medioPago}</span>
                <b className="text-[#0b2545]">{soles(p.importePagado)}</b>
              </div>
            ))}
          </div>
        </form>
      </Dialogo>
    )}
  </>;
}
