import "./egreso-registro-page.css";
import "../../styles/egresos-tabla.css";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { ErrorApi } from "../../services/api-cliente";
import { servicioEgresos, type DatosEgreso, type Egreso, type TipoEgreso } from "../../services/egresos.service";
import { servicioIdentidad } from "../../services/identidad.service";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";

const fechaHoy = () => {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};
const soles = (valor: string | number) => `S/ ${Number(valor).toFixed(2)}`;
const categoriasPorTipo: Record<TipoEgreso, string[]> = {
  GASTO_OPERATIVO: ["Alquiler", "Servicios básicos", "Internet y telefonía", "Mantenimiento", "Transporte y flete", "Publicidad", "Suministros", "Gastos bancarios", "Otro"],
  ACTIVO_HERRAMIENTA: ["Herramientas de taller", "Equipos", "Mobiliario", "Equipos informáticos", "Otro"],
  MOTOTAXI: ["Compra de mototaxi"],
};

export function EgresoRegistroPage({ tipo, contexto = "egresos" }: { tipo: TipoEgreso; contexto?: "egresos" | "inventario" }) {
  const navegar = useNavigate();
  const esMototaxi = tipo === "MOTOTAXI";
  const esVistaInventario = esMototaxi && contexto === "inventario";
  const consultaActual = useRef(0);
  const [items, setItems] = useState<Egreso[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(12);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [fecha, setFecha] = useState(fechaHoy());
  const [categoria, setCategoria] = useState(categoriasPorTipo[tipo][0]);
  const [concepto, setConcepto] = useState("");
  const [beneficiario, setBeneficiario] = useState("");
  const [documentoTipo, setDocumentoTipo] = useState("");
  const [documentoNumero, setDocumentoNumero] = useState("");
  const [proveedorRuc, setProveedorRuc] = useState("");
  const [buscandoIdentidadProveedor, setBuscandoIdentidadProveedor] = useState(false);
  const [medioPago, setMedioPago] = useState("EFECTIVO");
  const [cuentaFinancieraId, setCuentaFinancieraId] = useState("");
  const [monto, setMonto] = useState("");
  const [importeInicial, setImporteInicial] = useState("");
  const [identificadorActivo, setIdentificadorActivo] = useState("");
  const [mototaxiMarca, setMototaxiMarca] = useState("");
  const [mototaxiModelo, setMototaxiModelo] = useState("");
  const [mototaxiNumeroMotor, setMototaxiNumeroMotor] = useState("");
  const [mototaxiNumeroChasis, setMototaxiNumeroChasis] = useState("");
  const [observacion, setObservacion] = useState("");
  const [abono, setAbono] = useState<Egreso | null>(null);
  const [fechaAbono, setFechaAbono] = useState(fechaHoy());
  const [importeAbono, setImporteAbono] = useState("");
  const [medioAbono, setMedioAbono] = useState("TRANSFERENCIA");
  const [cuentaAbonoId, setCuentaAbonoId] = useState("");

  const manejarError = useCallback((problema: unknown) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : "No se pudo completar la operación.");
  }, [navegar]);

  const cargar = useCallback(async () => {
    const id = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioEgresos.listar(tipo, pagina, porPagina, busqueda, esVistaInventario);
      if (id !== consultaActual.current) return;
      setItems(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      if (pagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
    } catch (problema) { if (id === consultaActual.current) manejarError(problema); }
    finally { if (id === consultaActual.current) setCargando(false); }
  }, [tipo, pagina, porPagina, busqueda, manejarError, esVistaInventario]);

  useEffect(() => { const timer = window.setTimeout(() => { void cargar(); }, busqueda ? 200 : 0); return () => window.clearTimeout(timer); }, [cargar, busqueda]);

  function abrirFormulario() {
    setFecha(fechaHoy()); setCategoria(categoriasPorTipo[tipo][0]); setConcepto(""); setBeneficiario("");
    setDocumentoTipo(""); setDocumentoNumero(""); setProveedorRuc(""); setMedioPago("EFECTIVO"); setCuentaFinancieraId("");
    setMonto(""); setImporteInicial(""); setIdentificadorActivo(""); setMototaxiMarca(""); setMototaxiModelo("");
    setMototaxiNumeroMotor(""); setMototaxiNumeroChasis(""); setObservacion(""); setError(""); setModal(true);
  }

  async function buscarIdentidadProveedor() {
    if (!/^\d{11}$/.test(proveedorRuc)) { setError("Ingresa los 11 dígitos del RUC para consultar al proveedor."); return; }
    setBuscandoIdentidadProveedor(true); setError("");
    try {
      const identidad = await servicioIdentidad.consultar("RUC", proveedorRuc);
      setBeneficiario(identidad.razonSocial || [identidad.nombres, identidad.apellidoPaterno, identidad.apellidoMaterno].filter(Boolean).join(" "));
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el RUC del proveedor."); }
    finally { setBuscandoIdentidadProveedor(false); }
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    const importe = Number(monto); const inicial = importeInicial ? Number(importeInicial) : importe;
    if (!Number.isFinite(importe) || importe <= 0 || Number(importe.toFixed(2)) !== importe) { setError("Ingresa un importe mayor que cero con hasta dos decimales."); return; }
    if (!Number.isFinite(inicial) || inicial <= 0 || inicial > importe || Number(inicial.toFixed(2)) !== inicial) { setError("El primer pago debe ser positivo y no superar el importe registrado."); return; }
    const datos: DatosEgreso = {
      tipo, fecha, categoria, concepto: tipo === "MOTOTAXI" ? "Compra de mototaxi " + mototaxiMarca.trim() + " " + mototaxiModelo.trim() : concepto.trim(), beneficiario: beneficiario.trim() || null,
      documentoTipo: documentoTipo || null, documentoNumero: documentoNumero.trim() || null,
      proveedorRuc: proveedorRuc.trim() || null, moneda: "PEN", medioPago, cuentaFinancieraId, monto: importe.toFixed(2),
      importePagoInicial: inicial.toFixed(2), identificadorActivo: tipo === "ACTIVO_HERRAMIENTA" ? identificadorActivo.trim() || null : null,
      mototaxiMarca: tipo === "MOTOTAXI" ? mototaxiMarca.trim() : null,
      mototaxiModelo: tipo === "MOTOTAXI" ? mototaxiModelo.trim() : null,
      mototaxiNumeroMotor: tipo === "MOTOTAXI" ? mototaxiNumeroMotor.trim() : null,
      mototaxiNumeroChasis: tipo === "MOTOTAXI" ? mototaxiNumeroChasis.trim() : null,
      observacion: observacion.trim() || null,
    };
    setGuardando(true);
    try { await servicioEgresos.crear(datos, esVistaInventario); setModal(false); setPagina(1); await cargar(); }
    catch (problema) { manejarError(problema); }
    finally { setGuardando(false); }
  }

  async function guardarAbono(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!abono) return; setError("");
    const importe = Number(importeAbono);
    if (!Number.isFinite(importe) || importe <= 0 || importe > Number(abono.saldoPendiente) || Number(importe.toFixed(2)) !== importe) { setError("El abono debe ser positivo y no superar el saldo pendiente."); return; }
    setGuardando(true);
    try { await servicioEgresos.registrarPago(abono.id, { fechaPago: fechaAbono, importePagado: importe.toFixed(2), medioPago: medioAbono, cuentaFinancieraId: cuentaAbonoId, claveIdempotencia: crypto.randomUUID() }, esVistaInventario); setAbono(null); setImporteAbono(""); setCuentaAbonoId(""); await cargar(); }
    catch (problema) { manejarError(problema); }
    finally { setGuardando(false); }
  }

  return <>
    <CatalogoListado
      titulo={tipo === "GASTO_OPERATIVO" ? "Gastos operativos" : esMototaxi ? (esVistaInventario ? "Mototaxis" : "Compras de mototaxis") : "Activos y herramientas"}
      descripcion={esMototaxi ? (esVistaInventario ? "Consulta las unidades registradas con su identificaci?n y costo de compra." : "Registra cada mototaxi como una unidad identificable, con sus datos y pagos.") : "Registra los pagos y egresos operativos del negocio."}
      etiquetaCrear={esMototaxi ? (esVistaInventario ? "Registrar mototaxi" : "Registrar compra de mototaxi") : "Registrar egreso"}
      tituloListado={esMototaxi ? (esVistaInventario ? "Unidades registradas" : "Historial de mototaxis comprados") : "Historial de egresos"}
      registros={items}
      totalRegistros={total}
      visibles={items}
      cargando={cargando}
      mensajeCarga="Cargando egresos..."
      error={error}
      iconoVacio="S/"
      tituloVacio={tipo === "MOTOTAXI" ? "Aun no hay mototaxis registrados" : "Aun no hay egresos"}
      descripcionVacio={esMototaxi ? "Registra cada unidad con su marca, modelo, motor, chasis y costo." : "Registra un gasto operativo o activo para iniciar el control."}
      pagina={pagina}
      porPagina={porPagina}
      totalPaginas={totalPaginas}
      desde={total === 0 ? 0 : (pagina - 1) * porPagina + 1}
      hasta={Math.min(pagina * porPagina, total)}
      busqueda={busqueda}
      alBuscar={(valor) => { setBusqueda(valor); setPagina(1); }}
      alCrear={abrirFormulario}
      alCambiarPagina={setPagina}
      alCambiarTamanioPagina={(valor) => { setPorPagina(valor); setPagina(1); }}
      contenidoListado={<div className="egresos-table-scroll"><table className="egresos-table"><thead><tr><th>Fecha</th><th>{esMototaxi ? "Mototaxi" : "Concepto"}</th><th>Proveedor o beneficiario</th><th>Documento</th><th>Pagos</th><th className="is-number">Total</th><th>Saldo</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</td><td><strong>{item.tipo === "MOTOTAXI" ? `${item.mototaxiMarca ?? "Mototaxi"} ${item.mototaxiModelo ?? ""}` : item.concepto}</strong><small>{item.categoria}{item.tipo === "MOTOTAXI" ? ` · Motor ${item.mototaxiNumeroMotor || "—"} · Chasis ${item.mototaxiNumeroChasis || "—"}` : item.identificadorActivo ? ` · ${item.identificadorActivo}` : ""}</small></td><td>{item.beneficiario || "No especificado"}{item.proveedorRuc && <small>RUC {item.proveedorRuc}</small>}</td><td>{item.documentoTipo || "Sin documento"}<small>{item.documentoNumero || "—"}</small></td><td><strong>{soles(item.importePagadoAcumulado)}</strong><small>{item.pagos.length} pago{item.pagos.length === 1 ? "" : "s"} · {item.medioPago}</small></td><td className="is-number"><strong>{soles(item.monto)}</strong></td><td><span className={`egresos-status${Number(item.saldoPendiente) > 0 ? " is-pending" : " is-paid"}`}>{Number(item.saldoPendiente) > 0 ? soles(item.saldoPendiente) : "Pagado"}</span></td><td>{Number(item.saldoPendiente) > 0 ? <button className="egresos-row-button is-primary" type="button" onClick={() => { setAbono(item); setFechaAbono(fechaHoy()); setImporteAbono(""); setCuentaAbonoId(""); setError(""); }}><span className="erp-create-icon" aria-hidden="true">+</span>Registrar abono</button> : <span className="egresos-row-complete">Completo</span>}</td></tr>)}</tbody></table></div>}
    />
    {modal && <div className="catalog-modal-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) setModal(false); }}><section className="catalog-modal egreso-modal" role="dialog" aria-modal="true" aria-labelledby="egreso-form-title"><form className="catalog-form egreso-form" onSubmit={(evento) => void guardar(evento)}><div className="egreso-form-scroll"><div className="catalog-form-title"><div><h2 id="egreso-form-title">{tipo === "MOTOTAXI" ? "Registrar compra de mototaxi" : "Registrar egreso"}</h2><p>{tipo === "MOTOTAXI" ? "Una unidad por registro. No se agrega al stock de repuestos." : "Control operativo del negocio"}</p></div></div>{error && <div className="catalog-alert" role="alert">{error}</div>}<div className="egreso-form-grid">
      <label>Fecha<input required type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} /></label>
      {tipo !== "MOTOTAXI" && <label>Categoría<select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>{categoriasPorTipo[tipo].map((item) => <option key={item}>{item}</option>)}</select></label>}
      {tipo === "MOTOTAXI" ? <>
        <label>Marca<input required maxLength={100} value={mototaxiMarca} onChange={(evento) => setMototaxiMarca(evento.target.value)} /></label>
        <label>Modelo<input required maxLength={100} value={mototaxiModelo} onChange={(evento) => setMototaxiModelo(evento.target.value)} /></label>
        <label>Numero de motor<input required maxLength={100} value={mototaxiNumeroMotor} onChange={(evento) => setMototaxiNumeroMotor(evento.target.value)} /></label>
        <label>Numero de chasis<input required maxLength={100} value={mototaxiNumeroChasis} onChange={(evento) => setMototaxiNumeroChasis(evento.target.value)} /></label>
      </> : <label className="egreso-full">Concepto<input required maxLength={240} value={concepto} onChange={(evento) => setConcepto(evento.target.value)} /></label>}
      <label className="egreso-full">Proveedor o beneficiario<input value={beneficiario} onChange={(evento) => setBeneficiario(evento.target.value)} maxLength={180} /></label>
      <label>Documento<select value={documentoTipo} onChange={(evento) => setDocumentoTipo(evento.target.value)}><option value="">Sin documento</option><option value="FACTURA">Factura</option><option value="BOLETA">Boleta</option><option value="NOTA">Nota</option><option value="OTRO">Otro</option></select></label>
      <label>Número de documento<input value={documentoNumero} onChange={(evento) => setDocumentoNumero(evento.target.value)} maxLength={60} /></label>
      {documentoTipo === "FACTURA" && <label>RUC del proveedor<span className="egreso-ruc-search"><input required disabled={buscandoIdentidadProveedor} inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={proveedorRuc} onChange={(evento) => setProveedorRuc(evento.target.value.replace(/\D/g, "").slice(0, 11))} /><button type="button" disabled={buscandoIdentidadProveedor || proveedorRuc.length !== 11} onClick={() => void buscarIdentidadProveedor()}>{buscandoIdentidadProveedor ? "Consultando…" : "Buscar"}</button></span></label>}
      {tipo === "ACTIVO_HERRAMIENTA" && <label className="egreso-full">Modelo o identificación<input required maxLength={100} value={identificadorActivo} onChange={(evento) => setIdentificadorActivo(evento.target.value)} /></label>}
      <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={(id, medio) => { setCuentaFinancieraId(id); setMedioPago(medio); }} />
      <label>Importe total (S/)<input required type="number" min="0.01" step="0.01" value={monto} onChange={(evento) => setMonto(evento.target.value)} /></label>
      <label>Primer pago (S/)<input type="number" min="0.01" max={monto || undefined} step="0.01" value={importeInicial} onChange={(evento) => setImporteInicial(evento.target.value)} placeholder="Vacío: pago completo" /></label>
      <label className="egreso-full">Observación<input maxLength={2000} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
    </div></div><div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={guardando} onClick={() => setModal(false)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar egreso"}</button></div></form></section></div>}
    {abono && <div className="catalog-modal-backdrop" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) setAbono(null); }}><section className="catalog-modal egreso-modal" role="dialog" aria-modal="true" aria-labelledby="egreso-payment-title"><form className="catalog-form egreso-form" onSubmit={(evento) => void guardarAbono(evento)}><div className="egreso-form-scroll"><div className="catalog-form-title"><div><h2 id="egreso-payment-title">Registrar abono</h2><p>{abono.concepto} · saldo {soles(abono.saldoPendiente)}</p></div></div>{error && <div className="catalog-alert" role="alert">{error}</div>}<div className="egreso-form-grid"><label>Fecha<input required type="date" value={fechaAbono} onChange={(evento) => setFechaAbono(evento.target.value)} /></label><label>Importe (S/)<input required type="number" min="0.01" max={abono.saldoPendiente} step="0.01" value={importeAbono} onChange={(evento) => setImporteAbono(evento.target.value)} /></label><div className="egreso-full"><SelectorCuentaFinanciera value={cuentaAbonoId} medioActual={medioAbono} onChange={(id, medio) => { setCuentaAbonoId(id); setMedioAbono(medio); }} /></div></div></div><div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={() => setAbono(null)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar abono"}</button></div></form></section></div>}
  </>;
}
