import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ArrowRight, FileText, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/button";
import { servicioIngresos, type DocumentoGuia, type DocumentoOrigenGuia } from "../../services/ingresos.service";
import { claseCampoGuia, claseControlGuia, claseOpcionGuia, claseResultadosGuia, SeccionGuia } from "./campos-guia";

const tiposDocumentoVenta = { BOLETA: "Boleta", FACTURA: "Factura", NOTA_VENTA: "Nota de venta interna" };
const tiposIdentidad: Record<string, string> = { "01": "DNI", "04": "CE", "06": "RUC", "07": "Pasaporte" };
type TipoBusqueda = DocumentoOrigenGuia["tipoComprobante"] | "";
type EstadoBusqueda =
  | { estado: "inicial" | "cargando" }
  | { estado: "resultados"; items: DocumentoOrigenGuia[] }
  | { estado: "error"; mensaje: string };

function BuscadorDocumentoGuia({ cargandoDocumento, seleccionadoId, alSeleccionar }: {
  cargandoDocumento: boolean;
  seleccionadoId?: string;
  alSeleccionar: (id: string) => void;
}) {
  const [consulta, setConsulta] = useState("");
  const [tipo, setTipo] = useState<TipoBusqueda>("");
  const [resultado, setResultado] = useState<EstadoBusqueda>({ estado: "inicial" });
  const solicitud = useRef<AbortController | null>(null);
  const textoConsulta = consulta.trim();
  const mostrandoRecientes = textoConsulta === "";
  useEffect(() => () => solicitud.current?.abort(), []);

  function limpiarResultados() {
    solicitud.current?.abort();
    solicitud.current = null;
    setResultado({ estado: "inicial" });
  }

  async function buscar(texto: string) {
    if (texto.length === 1 || cargandoDocumento || solicitud.current) return;
    const control = new AbortController();
    solicitud.current = control;
    setResultado({ estado: "cargando" });
    try {
      const items = await servicioIngresos.buscarDocumentosParaGuia(texto, tipo, control.signal);
      if (!control.signal.aborted) setResultado({ estado: "resultados", items });
    } catch (error) {
      if (!control.signal.aborted) setResultado({ estado: "error", mensaje: error instanceof Error ? error.message : "No se pudo buscar el documento." });
    } finally {
      if (solicitud.current === control) solicitud.current = null;
    }
  }

  function mostrarRecientes() {
    if (mostrandoRecientes && (resultado.estado === "inicial" || resultado.estado === "error")) {
      void buscar("");
    }
  }

  return <div className="grid min-w-0 gap-2.5">
    <div className="grid items-end gap-2 @[32rem]:grid-cols-[minmax(0,1fr)_auto] @[58rem]:grid-cols-[10rem_minmax(0,1fr)_auto]">
      <div className={`${claseCampoGuia} @[32rem]:col-span-full @[58rem]:col-span-1`}>
        <label htmlFor="guia-tipo-documento-origen">Tipo de documento</label>
        <select id="guia-tipo-documento-origen" className={claseControlGuia} value={tipo} disabled={cargandoDocumento} onChange={(evento) => { setTipo(evento.target.value as TipoBusqueda); limpiarResultados(); }}>
          <option value="">Todos</option>
          <option value="BOLETA">Boleta</option>
          <option value="FACTURA">Factura</option>
          <option value="NOTA_VENTA">Nota de venta interna</option>
        </select>
      </div>
      <label className={claseCampoGuia}>Buscar documento de venta
        <input
          className={claseControlGuia} type="search" value={consulta} maxLength={100} autoComplete="off"
          placeholder="Número, cliente o producto" disabled={cargandoDocumento}
          onFocus={mostrarRecientes}
          onClick={mostrarRecientes}
          onChange={(evento) => {
            const valor = evento.target.value;
            setConsulta(valor);
            if (valor.trim() === textoConsulta) return;
            limpiarResultados();
            if (!valor.trim()) void buscar("");
          }}
          onKeyDown={(evento) => {
            if (evento.key !== "Enter" || evento.nativeEvent.isComposing) return;
            evento.preventDefault();
            if (textoConsulta.length >= 2) void buscar(textoConsulta);
          }}
        />
      </label>
      <Button variant="outline" onClick={() => void buscar(textoConsulta)} disabled={textoConsulta.length < 2 || cargandoDocumento || resultado.estado === "cargando"}>
        <Search size={16} aria-hidden="true" />{resultado.estado === "cargando" && !mostrandoRecientes ? "Buscando…" : "Buscar"}
      </Button>
    </div>
    {textoConsulta.length === 1 && <p className="text-xs text-muted-foreground">Escribe al menos dos caracteres para buscar.</p>}
    {seleccionadoId && <p className="text-xs text-muted-foreground">Si seleccionas otro documento, se reiniciarán los bienes y los datos del traslado.</p>}
    {resultado.estado === "resultados" && resultado.items.length > 0 && (
      <div className="grid min-w-0 gap-1.5">
        {mostrandoRecientes && <p className="text-xs font-semibold text-muted-foreground">Documentos recientes</p>}
        <ul className={`${claseResultadosGuia} m-0 list-none divide-y divide-border p-0`} aria-label={mostrandoRecientes ? "Documentos recientes" : "Documentos encontrados"}>
          {resultado.items.map((item) => (
            <li key={item.id}>
              <button className={claseOpcionGuia} type="button" disabled={cargandoDocumento} onClick={() => alSeleccionar(item.id)}>
                <span className="grid min-w-0 gap-0.5">
                  <strong className="text-sm text-primary tabular-nums [overflow-wrap:anywhere]">{item.codigo}</strong>
                  <span className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{item.clienteNombre || item.clienteNumeroDocumento || "Cliente registrado"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span className="grid justify-items-end gap-0.5">
                    <span>{tiposDocumentoVenta[item.tipoComprobante]}</span>
                    <time dateTime={item.fecha} className="tabular-nums">{item.fecha.slice(0, 10)}</time>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
    <div role="status" className="text-xs text-muted-foreground empty:hidden">
      {resultado.estado === "cargando" && (mostrandoRecientes ? "Cargando documentos recientes…" : "Buscando documentos de venta…")}
      {resultado.estado === "resultados" && resultado.items.length === 0 && (mostrandoRecientes
        ? "No hay documentos recientes de este tipo disponibles para la guía."
        : "No se encontraron documentos con bienes trasladables. Prueba con otro número o cliente.")}
      {resultado.estado === "resultados" && resultado.items.length === 30 && "Se muestran hasta 30 coincidencias. Afina tu búsqueda para encontrar un documento específico."}
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
    if (id === documento?.id) {
      alEditar(false);
      return;
    }
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

  return <SeccionGuia titulo="Documento de origen y destinatario" icono={<FileText />}>
    <div className="grid min-w-0 items-start gap-4 @[42rem]:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] @[42rem]:gap-6">
      <div className="grid min-w-0 gap-3">
        {documento && <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border bg-muted px-3 py-2.5">
          <div className="grid min-w-0 gap-0.5">
            <span className="text-xs text-muted-foreground">{tiposDocumentoVenta[documento.tipoComprobante]}</span>
            <strong className="text-sm text-primary tabular-nums [overflow-wrap:anywhere]">{documento.codigo}</strong>
          </div>
          <Button size="sm" variant="outline" aria-expanded={cambiando} onClick={() => { setError(""); alEditar(!cambiando); }} disabled={cargandoDocumento}>
            {cambiando ? "Conservar documento" : "Cambiar documento"}
          </Button>
        </div>}
        {(!documento || cambiando) && <BuscadorDocumentoGuia cargandoDocumento={cargandoDocumento} seleccionadoId={documento?.id} alSeleccionar={(id) => void seleccionar(id)} />}
        {error && <NotificacionFlotante mensaje={error} />}
      </div>
      {documento ? <div className="grid min-w-0 content-start gap-2.5">
        <div className="grid gap-0.5">
          <span className="text-xs font-semibold text-muted-foreground">Destinatario</span>
          <strong className="text-sm [overflow-wrap:anywhere]">{documento.clienteNombreCompleto}</strong>
          <span className="text-xs text-muted-foreground">{tiposIdentidad[documento.clienteTipoDocumento] ?? documento.clienteTipoDocumento} {documento.clienteNumeroDocumento}</span>
        </div>
        <label className={claseCampoGuia}>Dirección del destinatario
          <input className={claseControlGuia} key={documento.id} name="clienteDireccion" maxLength={100} defaultValue={documento.clienteDireccion} placeholder="Dirección registrada del cliente" required />
        </label>
      </div> : <p className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">Busca y selecciona una boleta, factura o nota de venta interna para cargar el destinatario y los bienes del traslado.</p>}
    </div>
  </SeccionGuia>;
}
