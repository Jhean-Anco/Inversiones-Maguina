import "./egreso-registro-page.css";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { ErrorApi } from "../../services/api-cliente";
import { servicioEgresos, type DatosEgreso, type Egreso, type TipoEgreso } from "../../services/egresos.service";

const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"];
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

export function EgresoRegistroPage({ tipo }: { tipo: TipoEgreso }) {
  const navegar = useNavigate();
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
  const [medioPago, setMedioPago] = useState("EFECTIVO");
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

  const manejarError = useCallback((problema: unknown) => {
    if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
    setError(problema instanceof Error ? problema.message : "No se pudo completar la operación.");
  }, [navegar]);

  const cargar = useCallback(async () => {
    const id = ++consultaActual.current;
    setCargando(true);
    try {
      const resultado = await servicioEgresos.listar(tipo, pagina, porPagina, busqueda);
      if (id !== consultaActual.current) return;
      setItems(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      if (pagina > resultado.totalPaginas) setPagina(resultado.totalPaginas);
    } catch (problema) { if (id === consultaActual.current) manejarError(problema); }
    finally { if (id === consultaActual.current) setCargando(false); }
  }, [tipo, pagina, porPagina, busqueda, manejarError]);

  useEffect(() => { const timer = window.setTimeout(() => { void cargar(); }, busqueda ? 200 : 0); return () => window.clearTimeout(timer); }, [cargar, busqueda]);

  function abrirFormulario() {
    setFecha(fechaHoy()); setCategoria(categoriasPorTipo[tipo][0]); setConcepto(""); setBeneficiario("");
    setDocumentoTipo(""); setDocumentoNumero(""); setProveedorRuc(""); setMedioPago("EFECTIVO");
    setMonto(""); setImporteInicial(""); setIdentificadorActivo(""); setMototaxiMarca(""); setMototaxiModelo("");
    setMototaxiNumeroMotor(""); setMototaxiNumeroChasis(""); setObservacion(""); setError(""); setModal(true);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError("");
    const importe = Number(monto); const inicial = importeInicial ? Number(importeInicial) : importe;
    if (!Number.isFinite(importe) || importe <= 0 || Number(importe.toFixed(2)) !== importe) { setError("Ingresa un importe mayor que cero con hasta dos decimales."); return; }
    if (!Number.isFinite(inicial) || inicial <= 0 || inicial > importe || Number(inicial.toFixed(2)) !== inicial) { setError("El primer pago debe ser positivo y no superar el importe registrado."); return; }
    const datos: DatosEgreso = {
      tipo, fecha, categoria, concepto: tipo === "MOTOTAXI" ? "Compra de mototaxi " + mototaxiMarca.trim() + " " + mototaxiModelo.trim() : concepto.trim(), beneficiario: beneficiario.trim() || null,
      documentoTipo: documentoTipo || null, documentoNumero: documentoNumero.trim() || null,
      proveedorRuc: proveedorRuc.trim() || null, moneda: "PEN", medioPago, monto: importe.toFixed(2),
      importePagoInicial: inicial.toFixed(2), identificadorActivo: tipo === "ACTIVO_HERRAMIENTA" ? identificadorActivo.trim() || null : null,
      mototaxiMarca: tipo === "MOTOTAXI" ? mototaxiMarca.trim() : null,
      mototaxiModelo: tipo === "MOTOTAXI" ? mototaxiModelo.trim() : null,
      mototaxiNumeroMotor: tipo === "MOTOTAXI" ? mototaxiNumeroMotor.trim() : null,
      mototaxiNumeroChasis: tipo === "MOTOTAXI" ? mototaxiNumeroChasis.trim() : null,
      observacion: observacion.trim() || null,
    };
    setGuardando(true);
    try { await servicioEgresos.crear(datos); setModal(false); setPagina(1); await cargar(); }
    catch (problema) { manejarError(problema); }
    finally { setGuardando(false); }
  }

  async function guardarAbono(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!abono) return; setError("");
    const importe = Number(importeAbono);
    if (!Number.isFinite(importe) || importe <= 0 || importe > Number(abono.saldoPendiente) || Number(importe.toFixed(2)) !== importe) { setError("El abono debe ser positivo y no superar el saldo pendiente."); return; }
    setGuardando(true);
    try { await servicioEgresos.registrarPago(abono.id, { fechaPago: fechaAbono, importePagado: importe.toFixed(2), medioPago: medioAbono, claveIdempotencia: crypto.randomUUID() }); setAbono(null); setImporteAbono(""); await cargar(); }
    catch (problema) { manejarError(problema); }
    finally { setGuardando(false); }
  }

  return <>
    <CatalogoListado
      titulo={tipo === "GASTO_OPERATIVO" ? "Gastos operativos" : tipo === "MOTOTAXI" ? "Compras de mototaxis" : "Activos y herramientas"}
      descripcion={tipo === "MOTOTAXI" ? "Registra cada mototaxi como una unidad identificable, con sus datos y pagos." : "Registra los pagos y egresos operativos del negocio."}
      etiquetaCrear={tipo === "MOTOTAXI" ? "Registrar compra de mototaxi" : "Registrar egreso"}
      entidadSingular={tipo === "MOTOTAXI" ? "compra de mototaxi" : "egreso"}
      tituloListado={tipo === "MOTOTAXI" ? "Historial de mototaxis comprados" : "Historial de egresos"}
      registros={items}
      totalRegistros={total}
      visibles={items}
      cargando={cargando}
      mensajeCarga="Cargando egresos..."
      error={error}
      iconoVacio="S/"
      tituloVacio={tipo === "MOTOTAXI" ? "Aun no hay mototaxis registrados" : "Aun no hay egresos"}
      descripcionVacio={tipo === "MOTOTAXI" ? "Registra cada unidad con su marca, modelo, motor, chasis y costo." : "Registra un gasto operativo o activo para iniciar el control."}
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
      renderizarTarjeta={(item) => <article className="egreso-card" key={item.id}>
      <div className="egreso-card-top"><span>{item.categoria}</span><time>{new Date(`${item.fecha}T00:00:00`).toLocaleDateString("es-PE")}</time></div>
      <h3>{item.tipo === "MOTOTAXI" ? (item.mototaxiMarca ?? "Mototaxi") + " " + (item.mototaxiModelo ?? "") : item.concepto}</h3>
      {item.tipo === "MOTOTAXI" && <p className="egreso-beneficiario">Motor: {item.mototaxiNumeroMotor} - Chasis: {item.mototaxiNumeroChasis}</p>}{item.beneficiario && <p className="egreso-beneficiario">{item.beneficiario}</p>}
      {item.documentoTipo && <div className="egreso-documento">{item.documentoTipo}{item.documentoNumero ? ` · ${item.documentoNumero}` : ""}</div>}
      <div className="egreso-documento">Pagado {soles(item.importePagadoAcumulado)} · saldo {soles(item.saldoPendiente)}</div>
      {item.pagos.map((pago) => <div className="egreso-documento" key={pago.id}>Pago {new Date(`${pago.fechaPago}T00:00:00`).toLocaleDateString("es-PE")} · {soles(pago.importePagado)}</div>)}
      {Number(item.saldoPendiente) > 0 && <button className="egreso-registrar-abono" type="button" onClick={() => { setAbono(item); setFechaAbono(fechaHoy()); setImporteAbono(""); setError(""); }}>Registrar abono · saldo {soles(item.saldoPendiente)}</button>}
      <footer><span>{item.medioPago}</span><strong>{soles(item.monto)}</strong></footer>
    </article>}
    />
    {modal && <div className="catalog-modal-backdrop"><section className="catalog-modal egreso-modal" role="dialog" aria-modal="true" aria-labelledby="egreso-form-title"><form className="catalog-form egreso-form" onSubmit={(evento) => void guardar(evento)}><div className="egreso-form-scroll"><div className="catalog-form-title"><div><h2 id="egreso-form-title">{tipo === "MOTOTAXI" ? "Registrar compra de mototaxi" : "Registrar egreso"}</h2><p>{tipo === "MOTOTAXI" ? "Una unidad por registro. No se agrega al stock de repuestos." : "Control operativo del negocio"}</p></div></div>{error && <div className="catalog-alert" role="alert">{error}</div>}<div className="egreso-form-grid">
      <label>Fecha<input required type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} /></label>
      {tipo !== "MOTOTAXI" && <label>Categoría<select value={categoria} onChange={(evento) => setCategoria(evento.target.value)}>{categoriasPorTipo[tipo].map((item) => <option key={item}>{item}</option>)}</select></label>}
      {tipo === "MOTOTAXI" ? <>
        <label>Marca<input required maxLength={100} value={mototaxiMarca} onChange={(evento) => setMototaxiMarca(evento.target.value)} /></label>
        <label>Modelo<input required maxLength={100} value={mototaxiModelo} onChange={(evento) => setMototaxiModelo(evento.target.value)} /></label>
        <label>Numero de motor<input required maxLength={100} value={mototaxiNumeroMotor} onChange={(evento) => setMototaxiNumeroMotor(evento.target.value)} /></label>
        <label>Numero de chasis<input required maxLength={100} value={mototaxiNumeroChasis} onChange={(evento) => setMototaxiNumeroChasis(evento.target.value)} /></label>
      </> : <label className="egreso-full">Concepto<input required maxLength={240} value={concepto} onChange={(evento) => setConcepto(evento.target.value)} /></label>}
      <label className="egreso-full">Proveedor o beneficiario<input value={beneficiario} onChange={(evento) => setBeneficiario(evento.target.value)} maxLength={180} /></label>
      <label>Documento<select value={documentoTipo} onChange={(evento) => setDocumentoTipo(evento.target.value)}><option value="">Sin documento</option><option value="FACTURA">Factura</option><option value="BOLETA">Boleta</option><option value="OTRO">Otro</option></select></label>
      <label>Número de documento<input value={documentoNumero} onChange={(evento) => setDocumentoNumero(evento.target.value)} maxLength={60} /></label>
      {documentoTipo === "FACTURA" && <label>RUC del proveedor<input required inputMode="numeric" pattern="[0-9]{11}" maxLength={11} value={proveedorRuc} onChange={(evento) => setProveedorRuc(evento.target.value.replace(/\D/g, "").slice(0, 11))} /></label>}
      {tipo === "ACTIVO_HERRAMIENTA" && <label className="egreso-full">Modelo o identificación<input required maxLength={100} value={identificadorActivo} onChange={(evento) => setIdentificadorActivo(evento.target.value)} /></label>}
      <label>Medio de pago<select value={medioPago} onChange={(evento) => setMedioPago(evento.target.value)}>{mediosPago.map((item) => <option value={item} key={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
      <label>Importe total (S/)<input required type="number" min="0.01" step="0.01" value={monto} onChange={(evento) => setMonto(evento.target.value)} /></label>
      <label>Primer pago (S/)<input type="number" min="0.01" max={monto || undefined} step="0.01" value={importeInicial} onChange={(evento) => setImporteInicial(evento.target.value)} placeholder="Vacío: pago completo" /></label>
      <label className="egreso-full">Observación<input maxLength={2000} value={observacion} onChange={(evento) => setObservacion(evento.target.value)} /></label>
    </div></div><div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={guardando} onClick={() => setModal(false)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar egreso"}</button></div></form></section></div>}
    {abono && <div className="catalog-modal-backdrop"><section className="catalog-modal egreso-modal" role="dialog" aria-modal="true" aria-labelledby="egreso-payment-title"><form className="catalog-form egreso-form" onSubmit={(evento) => void guardarAbono(evento)}><div className="egreso-form-scroll"><div className="catalog-form-title"><div><h2 id="egreso-payment-title">Registrar abono</h2><p>{abono.concepto} · saldo {soles(abono.saldoPendiente)}</p></div></div>{error && <div className="catalog-alert" role="alert">{error}</div>}<div className="egreso-form-grid"><label>Fecha<input required type="date" value={fechaAbono} onChange={(evento) => setFechaAbono(evento.target.value)} /></label><label>Importe (S/)<input required type="number" min="0.01" max={abono.saldoPendiente} step="0.01" value={importeAbono} onChange={(evento) => setImporteAbono(evento.target.value)} /></label><label className="egreso-full">Medio de pago<select value={medioAbono} onChange={(evento) => setMedioAbono(evento.target.value)}>{mediosPago.map((item) => <option key={item}>{item}</option>)}</select></label></div></div><div className="catalog-form-actions"><button className="catalog-cancel" type="button" onClick={() => setAbono(null)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar abono"}</button></div></form></section></div>}
  </>;
}
