import { useCallback, useEffect, useState } from "react";
import { servicioDocumentosRecibidos, type DocumentoRecibido } from "../../../services/documentos-recibidos.service";
import "./selector-comprobante-proveedor.css";

export type DestinoComprobante = "REPUESTOS" | "MOTOTAXI" | "GASTO_OPERATIVO" | "ACTIVO_HERRAMIENTA";

const periodoActual = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
};
const tipoLegible = (tipo: string) => ({ "01": "Factura", "03": "Boleta", "07": "Nota de crédito", "08": "Nota de débito" }[tipo] ?? "Comprobante");
const importe = (documento: DocumentoRecibido) => documento.total == null ? "Importe no disponible" : `${documento.moneda === "USD" ? "US$" : documento.moneda === "EUR" ? "€" : "S/"} ${Number(documento.total).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function SelectorComprobanteProveedor({ destino, bloqueado, alSeleccionar }: { destino: DestinoComprobante; bloqueado?: boolean; alSeleccionar: (documento: DocumentoRecibido) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [periodo, setPeriodo] = useState(periodoActual);
  const [registros, setRegistros] = useState<DocumentoRecibido[]>([]);
  const [cargando, setCargando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await servicioDocumentosRecibidos.listar(1, 100, busqueda, { estado: "", periodo: "", destino: "", tipoDocumento: "" });
      setRegistros(respuesta.registros.filter((documento) => !["REGISTRADO", "DESCARTADO"].includes(documento.estado) && (!documento.destino || documento.destino === destino)));
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron buscar comprobantes.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, destino]);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    void servicioDocumentosRecibidos.configuracion().then((respuesta) => { if (vigente) setConfigurado(respuesta.configurado); }).catch(() => { if (vigente) setConfigurado(null); });
    return () => { vigente = false; };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const temporizador = window.setTimeout(() => { void cargar(); }, busqueda ? 250 : 0);
    return () => window.clearTimeout(temporizador);
  }, [abierto, busqueda, cargar]);

  async function importarPeriodo() {
    setImportando(true); setError(""); setMensaje("Solicitando comprobantes del periodo a SUNAT…");
    try {
      const periodoSire = periodo.replace("-", "");
      const solicitud = await servicioDocumentosRecibidos.solicitar(periodoSire);
      let ticket: Awaited<ReturnType<typeof servicioDocumentosRecibidos.consultarTicket>> | null = null;
      for (let intento = 0; intento < 24; intento++) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        ticket = await servicioDocumentosRecibidos.consultarTicket(periodoSire, solicitud.ticket);
        setMensaje(`SUNAT está preparando los comprobantes… ${ticket.estado}`);
        if (ticket.listo) break;
      }
      const archivo = ticket?.archivos.find((item) => item.nombre?.toLowerCase().endsWith(".zip"));
      if (!ticket?.listo || !archivo?.nombre) throw new Error("El archivo de SUNAT aún no está disponible. Puedes volver a intentarlo más tarde.");
      const resultado = await servicioDocumentosRecibidos.importar(periodoSire, solicitud.ticket, { nombre: archivo.nombre, tipo: archivo.tipo ?? "null" });
      setMensaje(`${resultado.documentosGuardados} comprobantes listos para seleccionar.`);
      setBusqueda("");
      await cargar();
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudieron importar los comprobantes.");
    } finally {
      setImportando(false);
    }
  }

  async function seleccionar(documento: DocumentoRecibido) {
    setCargando(true); setError("");
    try {
      const resultado = await servicioDocumentosRecibidos.clasificar(documento.id, destino);
      alSeleccionar({ ...documento, destino: resultado.destino, estado: resultado.estado });
      setAbierto(false); setMensaje("");
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo asociar el comprobante a esta operación.");
    } finally {
      setCargando(false);
    }
  }

  return <section className="selector-comprobante">
    <button className="selector-comprobante-trigger" type="button" disabled={bloqueado} aria-expanded={abierto} onClick={() => { setAbierto((actual) => !actual); setError(""); setMensaje(""); }}>
      {abierto ? "Cerrar búsqueda" : "Buscar factura o boleta para cargar sus datos"}
    </button>
    {abierto && <div className="selector-comprobante-panel">
      <div className="selector-comprobante-toolbar">
        <span className={`selector-comprobante-estado${configurado === true ? " is-ready" : configurado === false ? " is-missing" : ""}`} role="status">{configurado === true ? "SIRE conectado" : configurado === false ? "SIRE sin credenciales" : "Consultando SIRE…"}</span>
        <label>Periodo<input type="month" value={periodo} disabled={importando || configurado !== true} onChange={(evento) => setPeriodo(evento.target.value)} /></label>
        <button type="button" disabled={importando || configurado !== true || !periodo} onClick={() => void importarPeriodo()}>{importando ? "Buscando…" : "Actualizar desde SUNAT"}</button>
      </div>
      <label className="selector-comprobante-busqueda">Buscar por proveedor, RUC o número<input autoComplete="off" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Razón social, RUC, serie o correlativo" /></label>
      {mensaje && <p className="selector-comprobante-mensaje" role="status">{mensaje}</p>}
      {error && <p className="selector-comprobante-error" role="alert">{error}</p>}
      {cargando ? <p className="selector-comprobante-vacio">Cargando comprobantes…</p> : registros.length === 0 ? <p className="selector-comprobante-vacio">No hay comprobantes pendientes. Puedes registrar los datos manualmente en este formulario.</p> : <div className="selector-comprobante-resultados" role="listbox" aria-label="Comprobantes pendientes">
        {registros.map((documento) => <button type="button" role="option" aria-selected="false" key={documento.id} disabled={cargando || importando} onClick={() => void seleccionar(documento)}>
          <span><strong>{documento.emisorNombre || "Proveedor sin identificar"}</strong><small>RUC {documento.emisorRuc} · {tipoLegible(documento.tipoDocumento)} {documento.serie}-{documento.correlativo}</small></span>
          <span className="selector-comprobante-total">{importe(documento)}<small>{documento.fechaEmision || "Fecha no disponible"}</small></span>
        </button>)}
      </div>}
    </div>}
  </section>;
}
