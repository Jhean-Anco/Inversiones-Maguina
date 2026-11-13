import { useEffect, useState } from "react";
import { servicioDocumentosRecibidos, type ConsultaDocumentoSire } from "../../../services/documentos-recibidos.service";
import "./selector-comprobante-proveedor.css";

export type DestinoComprobante = "REPUESTOS" | "MOTOTAXI" | "GASTO_OPERATIVO" | "ACTIVO_HERRAMIENTA";

const periodoActual = () => {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
};

export function SelectorComprobanteProveedor({ destino, bloqueado, alSeleccionar }: { destino: DestinoComprobante; bloqueado?: boolean; alSeleccionar: (documento: NonNullable<Awaited<ReturnType<typeof servicioDocumentosRecibidos.importar>>["documentoConsultado"]>) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [periodo, setPeriodo] = useState(periodoActual);
  const [documento, setDocumento] = useState<ConsultaDocumentoSire>({ rucProveedor: "", tipoDocumento: "01", serie: "", correlativo: "" });
  const [cargando, setCargando] = useState(false);
  const [configurado, setConfigurado] = useState<boolean | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    void servicioDocumentosRecibidos.configuracion().then((respuesta) => { if (vigente) setConfigurado(respuesta.configurado); }).catch(() => { if (vigente) setConfigurado(null); });
    return () => { vigente = false; };
  }, [abierto]);

  function cambiarDocumento(campo: keyof ConsultaDocumentoSire, valor: string) {
    setDocumento((actual) => ({ ...actual, [campo]: campo === "rucProveedor" ? valor.replace(/\D/g, "").slice(0, 11) : valor.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, campo === "serie" ? 20 : 40) }));
    setError("");
  }

  async function consultarDocumento() {
    if (!/^\d{11}$/.test(documento.rucProveedor) || !documento.serie.trim() || !documento.correlativo.trim() || !periodo) {
      setError("Completa el periodo, RUC, serie y número del comprobante.");
      return;
    }
    setCargando(true); setError(""); setMensaje("Solicitando a SUNAT únicamente el documento indicado…");
    try {
      const periodoSire = periodo.replace("-", "");
      const solicitud = await servicioDocumentosRecibidos.solicitar(periodoSire, documento);
      let ticket: Awaited<ReturnType<typeof servicioDocumentosRecibidos.consultarTicket>> | null = null;
      for (let intento = 0; intento < 24; intento++) {
        await new Promise((resolve) => window.setTimeout(resolve, 5000));
        ticket = await servicioDocumentosRecibidos.consultarTicket(periodoSire, solicitud.ticket);
        setMensaje(`SUNAT está preparando el comprobante… ${ticket.estado}`);
        if (ticket.listo) break;
      }
      const archivo = ticket?.archivos.find((item) => item.nombre?.toLowerCase().endsWith(".zip"));
      if (!ticket?.listo || !archivo?.nombre) throw new Error("El comprobante aún no está disponible en SUNAT. Puedes volver a intentarlo más tarde.");
      const resultado = await servicioDocumentosRecibidos.importar(periodoSire, solicitud.ticket, { nombre: archivo.nombre, tipo: archivo.tipo ?? "null" }, documento);
      const clasificacion = await servicioDocumentosRecibidos.clasificar(resultado.documentoConsultado.id, destino);
      alSeleccionar({ ...resultado.documentoConsultado, destino: clasificacion.destino, estado: clasificacion.estado });
      setMensaje(""); setAbierto(false);
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : "No se pudo consultar el comprobante en SUNAT.");
      setMensaje("");
    } finally {
      setCargando(false);
    }
  }

  return <section className="selector-comprobante">
    <button className="selector-comprobante-trigger" type="button" disabled={bloqueado || cargando} aria-expanded={abierto} onClick={() => { setAbierto((actual) => !actual); setError(""); setMensaje(""); }}>
      {abierto ? "Cerrar consulta" : "Consultar un comprobante en SIRE"}
    </button>
    {abierto && <div className="selector-comprobante-panel">
      <div className="selector-comprobante-heading"><div><span>CONSULTA INDIVIDUAL</span><strong>Busca un comprobante específico</strong><small>SIRE buscará por periodo, tipo, serie y número; verificaremos el RUC antes de asociarlo.</small></div><span className={`selector-comprobante-estado${configurado === true ? " is-ready" : configurado === false ? " is-missing" : ""}`} role="status">{configurado === true ? "Credenciales configuradas; conexión sin verificar" : configurado === false ? "SIRE sin credenciales" : "Comprobando configuración…"}</span></div>
      <div className="selector-comprobante-campos">
        <label>Periodo de emisión<input type="month" value={periodo} disabled={cargando} onChange={(evento) => setPeriodo(evento.target.value)} /></label>
        <label>RUC del proveedor<input inputMode="numeric" value={documento.rucProveedor} maxLength={11} disabled={cargando} onChange={(evento) => cambiarDocumento("rucProveedor", evento.target.value)} placeholder="11 dígitos" /></label>
        <label>Tipo de comprobante<select value={documento.tipoDocumento} disabled={cargando} onChange={(evento) => cambiarDocumento("tipoDocumento", evento.target.value)}><option value="01">Factura</option><option value="03">Boleta</option><option value="07">Nota de crédito</option><option value="08">Nota de débito</option></select></label>
        <label>Serie<input value={documento.serie} maxLength={20} disabled={cargando} onChange={(evento) => cambiarDocumento("serie", evento.target.value)} placeholder="F001" /></label>
        <label>Número<input value={documento.correlativo} maxLength={40} disabled={cargando} onChange={(evento) => cambiarDocumento("correlativo", evento.target.value)} placeholder="00001234" /></label>
      </div>
      {mensaje && <p className="selector-comprobante-mensaje" role="status">{mensaje}</p>}
      {error && <p className="selector-comprobante-error" role="alert">{error}</p>}
      <div className="selector-comprobante-actions"><small>Al encontrarlo, completaremos los datos del documento en esta compra.</small><button type="button" disabled={cargando || configurado !== true} onClick={() => void consultarDocumento()}>{cargando ? "Consultando…" : "Consultar comprobante"}</button></div>
    </div>}
  </section>;
}
