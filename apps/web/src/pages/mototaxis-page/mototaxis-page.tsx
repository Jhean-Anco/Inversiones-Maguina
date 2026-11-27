import "./mototaxis-page.css";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useNavigate } from "react-router-dom";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { servicioIdentidad } from "../../services/identidad.service";
import { servicioMototaxis } from "../../services/mototaxis.service";
import { FormularioModeloMototaxi } from "../inventario-mototaxis-page/formulario-modelo-mototaxi";
import { GarantiasMototaxis } from "./garantias-mototaxis";
import { AjusteInventarioMototaxis } from "./ajuste-inventario-mototaxis";
import { useDatosMototaxis, type SeccionMototaxis } from "./use-datos-mototaxis";
import { usePagosCompraMototaxi } from "./use-pagos-compra-mototaxi";
import { mototaxisClasses } from "./mototaxis-classes";
import { CompraMototaxisEditor, type LineaCompraMototaxi } from "./compra-mototaxis-editor";
import type { PagoDocumentoCompra } from "../../components/documentos/compra-documento";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, useCatalogoRecientes, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { ComprasMototaxisListado } from "./compras-mototaxis-listado";
import { ConfirmarAnulacion } from "../../components/ui/confirmar-anulacion";
const fechaHoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
const soles = (n: string | number) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const nuevaLinea = (): LineaCompraMototaxi => ({ modeloId: "", cantidad: "1", costoUnitario: "", porcentajeGarantia: "80", mesesGarantia: "12" });
const nuevaCompra = () => ({ proveedorPersonaId: "", fecha: fechaHoy(), documentoTipo: "FACTURA", documentoNumero: "", observacion: "", ...nuevaLinea() });
const lineaValida = (linea: LineaCompraMototaxi) => linea.modeloId && Number.isInteger(Number(linea.cantidad)) && Number(linea.cantidad) > 0 && Number(linea.cantidad) <= 2_147_483_647 && Number(linea.costoUnitario) > 0 && Number(Number(linea.costoUnitario).toFixed(2)) === Number(linea.costoUnitario) && Number.isInteger(Number(linea.mesesGarantia)) && Number(linea.mesesGarantia) >= 1 && Number(linea.mesesGarantia) <= 120;

export function MototaxisPage({ seccion = "compras", puedeAjustarInventario = false, puedeCrearReclamo = false, esNuevaCompra = false, puedeAnularCompra = false }: { puedeAnularCompra?: boolean; seccion?: SeccionMototaxis; puedeAjustarInventario?: boolean; puedeCrearReclamo?: boolean; esNuevaCompra?: boolean }) {
  const navegar = useNavigate();
  const [busquedaCompras, setBusquedaCompras] = useState("");
  const [filtroPagoCompra, setFiltroPagoCompra] = useState("TODOS");
  const [exito, setExito] = useState("");
  const [modal, setModal] = useState(false);
  const modeloAbierto = useRef(false);
  modeloAbierto.current = modal;
  const [compraPaso, setCompraPaso] = useState<"datos" | "revision">("datos");
  const [pagosIniciales, setPagosIniciales] = useState<PagoDocumentoCompra[]>([{ clave: crypto.randomUUID(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
  const [guardando, setGuardando] = useState(false);
  const [compra, setCompra] = useState(nuevaCompra);
  const [lineasAgregadas, setLineasAgregadas] = useState<LineaCompraMototaxi[]>([]);
  const claveCompra = useRef(crypto.randomUUID());
  const detalleCompra = compra.modeloId ? [...lineasAgregadas, compra] : lineasAgregadas;
  const totalCompra = detalleCompra.reduce((total, linea) => total + Number(linea.cantidad) * Number(linea.costoUnitario), 0);
  const [nuevoProveedor, setNuevoProveedor] = useState({ tipoDocumento: "RUC", numeroDocumento: "", razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", nombreComercial: "" });
  const [proveedorModal, setProveedorModal] = useState(false);
  const [proveedorBusquedaCompra, setProveedorBusquedaCompra] = useState("");
  const [modeloBusquedaCompra, setModeloBusquedaCompra] = useState("");
  const [buscandoIdentidadProveedor, setBuscandoIdentidadProveedor] = useState(false);
  const datos = useDatosMototaxis({ seccion, busquedaCompras });
  const { marcas, modelos, proveedores, garantias, reclamos, compras, cargando, error, setError, manejarError, cargar, setProveedores } = datos;
  const comprasFiltradas = useMemo(() => filtroPagoCompra === "TODOS" ? compras : compras.filter((item) => filtroPagoCompra === "ANULADAS" ? item.estado === "ANULADA" : item.estado !== "ANULADA" && (filtroPagoCompra === "PENDIENTES" ? Number(item.saldo) > 0 : Number(item.saldo) <= 0)), [compras, filtroPagoCompra]);
  const [compraPorAnular, setCompraPorAnular] = useState<typeof compras[number] | null>(null);
  async function anularCompra(motivo: string) {
    if (!compraPorAnular) return;
    await servicioMototaxis.anularCompra(compraPorAnular.id, motivo);
    setExito(`Compra ${compraPorAnular.codigo} anulada. Se revirtieron sus unidades y su pago.`);
    setCompraPorAnular(null);
    await cargar();
  }
  const catalogoRecienteModelos = useCatalogoRecientes("mototaxis-modelos");
  const modelosParaCompra = modeloBusquedaCompra.trim().length >= MIN_CARACTERES_BUSQUEDA_CATALOGO
    ? modelos.filter((m) => `${m.marca} ${m.nombre} ${m.version ?? ""} ${m.codigo}`.toLocaleLowerCase().includes(modeloBusquedaCompra.trim().toLocaleLowerCase())).slice(0, MAX_RESULTADOS_CATALOGO)
    : [];
  function seleccionarModeloCompra(modeloElegido: typeof modelos[number]) {
    catalogoRecienteModelos.registrar({ id: modeloElegido.id, nombre: `${modeloElegido.marca} ${modeloElegido.nombre}${modeloElegido.version ? ` ${modeloElegido.version}` : ""}`, codigo: modeloElegido.codigo, detalle: modeloElegido.version || undefined });
    setCompra((actual) => ({ ...actual, modeloId: modeloElegido.id }));
    setModeloBusquedaCompra("");
  }
  function seleccionarModeloReciente(reciente: CatalogoReciente) {
    const modeloActual = modelos.find((item) => item.id === reciente.id);
    if (modeloActual) seleccionarModeloCompra(modeloActual);
    else setError("Ese modelo ya no está disponible en el catálogo. Búscalo nuevamente.");
  }
  const { compraPago, setCompraPago, pagosCompra, formPago, setFormPago, abrirPago, guardarPago } = usePagosCompraMototaxi({ fechaHoy, setError, manejarError, cargar, setExito, setGuardando });
  useEffect(() => {
    const hayDialogo = proveedorModal || Boolean(compraPago);
    if (!esNuevaCompra && !hayDialogo) return;
    const overflowAnterior = document.body.style.overflow;
    if (hayDialogo) document.body.style.overflow = "hidden";
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape" || guardando) return;
      if (modeloAbierto.current) return;
      if (proveedorModal) { setProveedorModal(false); return; }
      if (compraPago) { setCompraPago(null); return; }
      if (esNuevaCompra) cancelarCompra();
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      if (hayDialogo) document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [esNuevaCompra, compraPago, guardando, proveedorModal]);

  async function guardarCompra(e: FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setError(""); setExito("");
    if (!compra.proveedorPersonaId) { setError("Busca y selecciona un proveedor para continuar."); return; }
    if (!detalleCompra.length || detalleCompra.some((linea) => !lineaValida(linea))) { setError("Completa el modelo, la cantidad y el costo unitario."); return; }
    const pagos = pagosIniciales.map((pago) => ({ cuentaFinancieraId: pago.cuentaFinancieraId, medioPago: pago.medioPago, importePagado: pago.importe || (pagosIniciales.length === 1 ? totalCompra.toFixed(2) : "0") }));
    if (pagosIniciales.some((pago) => !pago.cuentaFinancieraId || !pago.medioPago || Number(pago.importe || (pagosIniciales.length === 1 ? totalCompra : 0)) <= 0) || Math.round(pagos.reduce((suma, pago) => suma + Number(pago.importePagado), 0) * 100) !== Math.round(totalCompra * 100)) { setError("Completa los importes y las cuentas. La suma debe coincidir con el total de la compra."); return; }
    setGuardando(true);
    try {
      const r = await servicioMototaxis.comprar({
        claveIdempotencia: claveCompra.current, proveedorPersonaId: compra.proveedorPersonaId, fecha: compra.fecha, documentoTipo: compra.documentoTipo, documentoNumero: compra.documentoTipo === "SIN_DOCUMENTO" ? "" : compra.documentoNumero,
        moneda: "PEN", importePagoInicial: totalCompra.toFixed(2), pagosIniciales: pagos, medioPago: pagos.length === 1 ? pagos[0].medioPago : undefined, cuentaFinancieraId: pagos.length === 1 ? pagos[0].cuentaFinancieraId : undefined, observacion: compra.observacion,
        detalles: detalleCompra.map(({ modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia }) => ({ modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia })),
      });
      setExito(`Compra ${r.codigo} registrada. Se agregaron ${r.unidades} unidades al inventario por modelo.`);
      limpiarCompra(); setBusquedaCompras(""); await cargar();
      if (esNuevaCompra) navegar("/mototaxis/compras");
    } catch (e) { manejarError(e); } finally { setGuardando(false); }
  }

  function enviarCompra(e: FormEvent<HTMLFormElement>) {
    if (compraPaso === "datos") {
      e.preventDefault();
      if (!compra.proveedorPersonaId) { setError("Busca y selecciona un proveedor para continuar."); return; }
      if (!detalleCompra.length || detalleCompra.some((linea) => !lineaValida(linea))) { setError("Completa el modelo, la cantidad y el costo unitario."); return; }
      setError(""); setCompraPaso("revision"); return;
    }
    void guardarCompra(e);
  }

  function limpiarCompra() {
    claveCompra.current = crypto.randomUUID();
    setCompraPaso("datos"); setLineasAgregadas([]);
    setProveedorBusquedaCompra(""); setModeloBusquedaCompra(""); setCompra(nuevaCompra());
    setPagosIniciales([{ clave: crypto.randomUUID(), cuentaFinancieraId: "", medioPago: "", importe: "" }]);
  }

  function cancelarCompra() {
    if (guardando) return;
    limpiarCompra(); setError("");
    if (esNuevaCompra) navegar("/mototaxis/compras");
  }

  function agregarModeloCompra() {
    if (!lineaValida(compra)) { setError("Completa el modelo, la cantidad y el costo unitario."); return; }
    if (lineasAgregadas.length >= 29) { setError("Una compra permite registrar hasta 30 líneas."); return; }
    const { modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia } = compra;
    setLineasAgregadas((actuales) => [...actuales, { modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia }]);
    setCompra((actual) => ({ ...actual, ...nuevaLinea() }));
    setError("");
  }

  function nombreModelo(id: string) {
    const modelo = modelos.find((item) => item.id === id);
    return modelo ? [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ") : "Modelo seleccionado";
  }

  async function guardarProveedor(e: FormEvent) {
    e.preventDefault(); setError(""); setGuardando(true);
    try { const p = await servicioMototaxis.crearProveedor(nuevoProveedor); setProveedores((prev) => [p, ...prev]); setCompra((prev) => ({ ...prev, proveedorPersonaId: p.id })); setNuevoProveedor({ tipoDocumento: "RUC", numeroDocumento: "", razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", nombreComercial: "" }); setProveedorBusquedaCompra(""); setProveedorModal(false); setExito("Proveedor registrado para esta compra."); }
    catch (e) { manejarError(e); } finally { setGuardando(false); }
  }
  async function buscarIdentidadProveedor() {
    const tipoDocumento = nuevoProveedor.tipoDocumento as "DNI" | "RUC";
    const longitud = tipoDocumento === "DNI" ? 8 : 11;
    if (nuevoProveedor.numeroDocumento.length !== longitud) { setError(`Ingresa los ${longitud} dígitos del ${tipoDocumento}.`); return; }
    setError(""); setBuscandoIdentidadProveedor(true);
    try {
      const identidad = await servicioIdentidad.consultar(tipoDocumento, nuevoProveedor.numeroDocumento);
      setNuevoProveedor((actual) => ({ ...actual, razonSocial: identidad.razonSocial ?? "", nombres: identidad.nombres ?? "", apellidoPaterno: identidad.apellidoPaterno ?? "", apellidoMaterno: identidad.apellidoMaterno ?? "", nombreComercial: actual.nombreComercial || identidad.razonSocial || "" }));
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo consultar el documento del proveedor."); }
    finally { setBuscandoIdentidadProveedor(false); }
  }

  return <>
    {error && <NotificacionFlotante tipo="error" mensaje={error} duracionMs={0} onCerrar={() => setError("")} />}{exito && <NotificacionFlotante tipo="exito" mensaje={exito} duracionMs={4000} onCerrar={() => setExito("")} />}
    {esNuevaCompra && <CompraMototaxisEditor
      compra={compra} actualizarCompra={(cambios) => setCompra((actual) => ({ ...actual, ...cambios }))}
      enRevision={compraPaso === "revision"} guardando={guardando}
      proveedores={proveedores} busquedaProveedor={proveedorBusquedaCompra}
      alBuscarProveedor={setProveedorBusquedaCompra} alAgregarProveedor={() => setProveedorModal(true)}
      modelos={modelosParaCompra} totalModelos={modelos.length}
      busquedaModelo={modeloBusquedaCompra} alBuscarModelo={setModeloBusquedaCompra} alSeleccionarModelo={seleccionarModeloCompra}
      modelosRecientes={catalogoRecienteModelos.recientes} alSeleccionarReciente={seleccionarModeloReciente}
      alCrearModelo={() => setModal(true)} nombreModelo={nombreModelo} lineasAgregadas={lineasAgregadas}
      alAgregarLinea={agregarModeloCompra} alQuitarLinea={(indice) => setLineasAgregadas((lineas) => lineas.filter((_, i) => i !== indice))}
      totalCompra={totalCompra} pagos={pagosIniciales} setPagos={setPagosIniciales}
      alCancelar={cancelarCompra} alEditar={() => setCompraPaso("datos")} onSubmit={enviarCompra}
    />}
    {proveedorModal && (
      <Dialogo
        kicker="NUEVO PROVEEDOR"
        titulo="Agregar proveedor"
        subtitulo="Completa sus datos para seleccionarlo en esta compra."
        ancho="md"
        cerrable={!guardando}
        onCerrar={() => setProveedorModal(false)}
        pie={
          <>
            <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={() => setProveedorModal(false)}>Cancelar</button>
            <button type="submit" form="moto-provider-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando || buscandoIdentidadProveedor}><span aria-hidden="true">+</span>Guardar y usar en esta compra</button>
          </>
        }
      >
        <form id="moto-provider-form" className="grid gap-4" onSubmit={(e) => void guardarProveedor(e)}>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Tipo de documento<select className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" disabled={buscandoIdentidadProveedor} value={nuevoProveedor.tipoDocumento} onChange={(e) => setNuevoProveedor((p) => ({ ...p, tipoDocumento: e.target.value, numeroDocumento: "", razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", nombreComercial: "" }))}><option value="RUC">RUC</option><option value="DNI">DNI</option></select></label>
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">{nuevoProveedor.tipoDocumento} del proveedor<span className="flex gap-2"><input className="h-11 min-w-0 flex-1 rounded-xl border border-[#c5d1db] px-3 text-sm" required disabled={buscandoIdentidadProveedor} inputMode="numeric" maxLength={nuevoProveedor.tipoDocumento === "RUC" ? 11 : 8} value={nuevoProveedor.numeroDocumento} onChange={(e) => setNuevoProveedor((p) => ({ ...p, numeroDocumento: e.target.value.replace(/\D/g, "").slice(0, p.tipoDocumento === "RUC" ? 11 : 8), razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "" }))} /><button type="button" className="h-11 rounded-xl border border-[#c7d8e7] bg-[#f4f8fb] px-3 text-sm font-bold text-[#174f88] disabled:opacity-50" disabled={buscandoIdentidadProveedor || nuevoProveedor.numeroDocumento.length !== (nuevoProveedor.tipoDocumento === "RUC" ? 11 : 8)} onClick={() => void buscarIdentidadProveedor()}>{buscandoIdentidadProveedor ? "Consultando…" : "Buscar"}</button></span></label>
            {nuevoProveedor.tipoDocumento === "RUC" && nuevoProveedor.numeroDocumento.startsWith("20") ? <label className="grid gap-1.5 text-xs font-bold text-[#52697d] sm:col-span-2">Razón social<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" required maxLength={180} value={nuevoProveedor.razonSocial} onChange={(e) => setNuevoProveedor((p) => ({ ...p, razonSocial: e.target.value }))} /></label> : <><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Nombres<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" required maxLength={120} value={nuevoProveedor.nombres} onChange={(e) => setNuevoProveedor((p) => ({ ...p, nombres: e.target.value }))} /></label><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Apellido paterno<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" required maxLength={120} value={nuevoProveedor.apellidoPaterno} onChange={(e) => setNuevoProveedor((p) => ({ ...p, apellidoPaterno: e.target.value }))} /></label><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Apellido materno<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" maxLength={120} value={nuevoProveedor.apellidoMaterno} onChange={(e) => setNuevoProveedor((p) => ({ ...p, apellidoMaterno: e.target.value }))} /></label></>}
            <label className="grid gap-1.5 text-xs font-bold text-[#52697d] sm:col-span-2">Nombre comercial (opcional)<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" maxLength={180} value={nuevoProveedor.nombreComercial} onChange={(e) => setNuevoProveedor((p) => ({ ...p, nombreComercial: e.target.value }))} /></label>
          </div>
        </form>
      </Dialogo>
    )}
    {!esNuevaCompra && <section className={`mototaxis-page ${mototaxisClasses.page}`}>
    {seccion === "compras" && <ComprasMototaxisListado compras={comprasFiltradas} cargando={cargando}
      busqueda={busquedaCompras} filtroPago={filtroPagoCompra} alBuscar={setBusquedaCompras} alFiltrarPago={setFiltroPagoCompra}
      alCrear={() => navegar("/mototaxis/compras/nueva")} alPagar={(compra) => void abrirPago(compra)} alAnular={puedeAnularCompra ? setCompraPorAnular : undefined} />}
    {compraPorAnular && <ConfirmarAnulacion titulo={`¿Anular la compra ${compraPorAnular.codigo}?`} descripcion="Se descontarán sus unidades del inventario, quedarán sin efecto sus garantías con el proveedor y su pago dejará de contar en las cuentas. No se puede deshacer." etiquetaConfirmar="Anular compra" onCancelar={() => setCompraPorAnular(null)} onConfirmar={anularCompra} />}

    {seccion === "garantias" && <GarantiasMototaxis garantias={garantias} reclamos={reclamos} cargando={cargando} puedeCrear={puedeCrearReclamo} puedeEditar={puedeAjustarInventario} alActualizar={cargar} />}
    {seccion === "movimientos" && <AjusteInventarioMototaxis puedeAjustar={puedeAjustarInventario} />}
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
    </section>}
    {modal && <FormularioModeloMototaxi marcas={marcas} alCerrar={() => setModal(false)} alGuardar={(modelo) => {
      setModal(false);
      seleccionarModeloCompra(modelo);
      setExito("Modelo agregado al catálogo.");
      void cargar();
    }} />}
  </>;
}
