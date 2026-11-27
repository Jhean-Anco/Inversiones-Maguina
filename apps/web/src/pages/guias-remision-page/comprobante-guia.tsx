import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ArrowRight, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { servicioIngresos, type DocumentoGuia, type DocumentoOrigenGuia } from "../../services/ingresos.service";
import { claseCampoGuia, SeccionGuia, SelectGuia } from "./campos-guia";

const tiposDocumentoVenta = { BOLETA: "Boleta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta" };
const tiposIdentidad: Record<string, string> = { "01": "DNI", "04": "CE", "06": "RUC", "07": "Pasaporte" };
type TipoBusqueda = DocumentoOrigenGuia["tipoComprobante"] | "";
type EstadoBusqueda =
  | { estado: "inicial" | "cargando" }
  | { estado: "resultados"; items: DocumentoOrigenGuia[] }
  | { estado: "error"; mensaje: string };

function BuscadorDocumentoGuia({ cargandoDocumento, alSeleccionar }: { cargandoDocumento: boolean; alSeleccionar: (id: string) => void }) {
  const [consulta, setConsulta] = useState("");
  const [tipo, setTipo] = useState<TipoBusqueda>("");
  const [resultado, setResultado] = useState<EstadoBusqueda>({ estado: "inicial" });
  const solicitud = useRef<AbortController | null>(null);
  const textoConsulta = consulta.trim();
  const mostrandoRecientes = textoConsulta === "";
  useEffect(() => () => solicitud.current?.abort(), []);

  async function buscar(texto: string, tipoBusqueda = tipo) {
    if (texto.length === 1 || cargandoDocumento) return;
    solicitud.current?.abort();
    const control = new AbortController();
    solicitud.current = control;
    setResultado({ estado: "cargando" });
    try {
      const items = await servicioIngresos.buscarDocumentosParaGuia(texto, tipoBusqueda, control.signal);
      if (!control.signal.aborted) setResultado({ estado: "resultados", items });
    } catch (error) {
      if (!control.signal.aborted) setResultado({ estado: "error", mensaje: error instanceof Error ? error.message : "No se pudo buscar el documento." });
    } finally {
      if (solicitud.current === control) solicitud.current = null;
    }
  }

  useEffect(() => {
    const temporizador = window.setTimeout(() => void buscar(textoConsulta), textoConsulta ? 260 : 0);
    return () => window.clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoConsulta, tipo]);

  return <div className="os-buscador">
    <div className="os-cliente-fila">
      <SelectGuia aria-label="Tipo de documento" value={tipo} disabled={cargandoDocumento} onChange={(evento) => setTipo(evento.target.value as TipoBusqueda)}>
        <option value="">Todos</option>
        <option value="BOLETA">Boleta</option>
        <option value="FACTURA">Factura</option>
        <option value="NOTA_VENTA">Nota de venta</option>
      </SelectGuia>
      <label className="os-buscador-campo guia-buscador-documento">
        <Search aria-hidden="true" size={18} />
        <input type="search" value={consulta} maxLength={100} autoComplete="off" aria-label="Buscar documento de venta"
          placeholder="Número, cliente o producto (ej. F001-245)" disabled={cargandoDocumento}
          onChange={(evento) => setConsulta(evento.target.value)}
          onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
      </label>
    </div>
    {textoConsulta.length === 1 && <p className="os-ayuda">Escribe al menos dos caracteres para buscar.</p>}
    {resultado.estado === "resultados" && resultado.items.length > 0 && <>
      {mostrandoRecientes && <span className="os-recientes-titulo">Documentos recientes</span>}
      <div className="os-resultados" role="list" aria-label={mostrandoRecientes ? "Documentos recientes" : "Documentos encontrados"}>
        {resultado.items.map((item) => (
          <button key={item.id} role="listitem" className="os-resultado" type="button" disabled={cargandoDocumento} onClick={() => alSeleccionar(item.id)}>
            <span className="os-resultado-datos">
              <strong>{item.codigo} · {tiposDocumentoVenta[item.tipoComprobante]}</strong>
              <small>{item.clienteNombre?.trim() || "Clientes varios"} · {item.fecha.slice(0, 10)}</small>
            </span>
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        ))}
      </div>
    </>}
    <div role="status" className="os-ayuda empty:hidden">
      {resultado.estado === "cargando" && (mostrandoRecientes ? "Cargando documentos recientes…" : "Buscando documentos de venta…")}
      {resultado.estado === "resultados" && resultado.items.length === 0 && (mostrandoRecientes
        ? "No hay documentos recientes de este tipo disponibles para la guía."
        : `No encontramos «${textoConsulta}» entre los documentos con bienes por trasladar.`)}
      {resultado.estado === "resultados" && resultado.items.length === 30 && "Se muestran hasta 30 coincidencias. Afina tu búsqueda."}
      {cargandoDocumento && "Cargando destinatario y bienes…"}
    </div>
    {resultado.estado === "error" && <NotificacionFlotante mensaje={resultado.mensaje} />}
  </div>;
}

type Props = {
  documento: DocumentoGuia | null;
  cambiando: boolean;
  alEditar: (editando: boolean) => void;
  alCambiar: (documento: DocumentoGuia) => void;
  alCargar: (cargando: boolean) => void;
};

export function ComprobanteGuia({ documento, cambiando, alEditar, alCambiar, alCargar }: Props) {
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [error, setError] = useState("");

  async function seleccionar(id: string) {
    setError("");
    if (id === documento?.id) { alEditar(false); return; }
    setCargandoDocumento(true);
    alCargar(true);
    try {
      alCambiar(await servicioIngresos.obtenerDocumentoParaGuia(id));
      alEditar(false);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo cargar el documento de venta.");
    } finally {
      setCargandoDocumento(false);
      alCargar(false);
    }
  }

  const cambiar = documento && <button type="button" className="guia-cambiar" aria-expanded={cambiando} disabled={cargandoDocumento} onClick={() => { setError(""); alEditar(!cambiando); }}>
    {cambiando ? "Conservar documento" : "Cambiar documento"}
  </button>;

  return <SeccionGuia paso={1} id="guia-titulo-origen" titulo="Documento de origen y destinatario" extra={cambiar}>
    <div className="guia-bloque">
      {(!documento || cambiando) && <>
        {documento && <div className="os-aviso" role="note">Si eliges otro documento, se reiniciarán los bienes y los datos del traslado.</div>}
        <BuscadorDocumentoGuia cargandoDocumento={cargandoDocumento} alSeleccionar={(id) => void seleccionar(id)} />
      </>}
      {documento && <>
        <dl className="guia-datos">
          <div><dt>{tiposDocumentoVenta[documento.tipoComprobante]}</dt><dd>{documento.codigo}</dd></div>
          <div><dt>Destinatario</dt><dd>{documento.clienteNombreCompleto?.trim() || "Clientes varios"}</dd></div>
          <div><dt>Documento</dt><dd>{tiposIdentidad[documento.clienteTipoDocumento] ?? documento.clienteTipoDocumento} {documento.clienteNumeroDocumento}</dd></div>
          <div><dt>Fecha</dt><dd>{documento.fecha.slice(0, 10)}</dd></div>
        </dl>
        <label className={claseCampoGuia}>Dirección del destinatario *
          <input key={documento.id} name="clienteDireccion" maxLength={100} defaultValue={documento.clienteDireccion} placeholder="Ej. Av. Los Incas 245, Huancayo" required />
        </label>
      </>}
    </div>
    {error && <NotificacionFlotante mensaje={error} />}
  </SeccionGuia>;
}
