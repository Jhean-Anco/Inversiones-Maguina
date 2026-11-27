import "../ordenes-servicio-page/orden-servicio-editor.css";
import "./formulario-guia-remision.css";
import { CheckCircle2, MessageSquareText, Printer, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import type { ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { servicioIngresos, type DocumentoGuia, type GuiaRemision } from "../../services/ingresos.service";
import { BienesGuia } from "./bienes-guia";
import { SeccionGuia } from "./campos-guia";
import { ComprobanteGuia } from "./comprobante-guia";
import { documentoDeGuia } from "./documento-guia";
import { RutaGuia } from "./ruta-guia";
import { DatosTrasladoGuia, TransporteGuia } from "./transporte-guia";

type GuiaEmitida = Awaited<ReturnType<typeof servicioIngresos.emitirGuia>>;
type Props = {
  alCancelar: () => void;
  alEmitir: (guia: GuiaEmitida) => void;
};

type DatosResumenGuia = { motivo: string; peso: string; bultos: string; partida: string; llegada: string; modalidad: string; placa: string };
const LIMITE_OBSERVACIONES = 1000;
const resumenInicial: DatosResumenGuia = { motivo: "Venta", peso: "", bultos: "1", partida: "", llegada: "", modalidad: "Público", placa: "" };

/** Guía de remisión remitente con la estructura `os-*` de Órdenes de servicio. */
export function FormularioGuiaRemision({ alCancelar, alEmitir }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const alertas = useAlertas();
  const imprimirAlEmitir = useImprimirAlEmitir(alertas);
  const [hoy] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
  const [serie, setSerie] = useState<{ codigo: string | null; error?: string } | null>(null);
  const [documento, setDocumento] = useState<DocumentoGuia | null>(null);
  const [cambiandoDocumento, setCambiandoDocumento] = useState(false);
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [emitida, setEmitida] = useState<GuiaRemision | null>(null);
  const [datosResumen, setDatosResumen] = useState<DatosResumenGuia>(resumenInicial);
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCancelar, "la guía de remisión");
  const cantidadBienes = Object.keys(cantidades).length;
  const puedeEmitir = Boolean(serie?.codigo && documento && cantidadBienes && !guardando && !cargandoDocumento && !cambiandoDocumento && !emitida);

  function actualizarResumen() {
    const form = formulario.current;
    if (!form) return;
    const datos = new FormData(form);
    const textoOpcion = (ariaLabel: string) => {
      const select = form.querySelector<HTMLSelectElement>(`select[aria-label="${ariaLabel}"]`);
      return select?.value ? select.selectedOptions[0]?.textContent?.trim() ?? "" : "";
    };
    setDatosResumen({
      motivo: form.querySelector<HTMLSelectElement>('select[name="motivoTraslado"]')?.selectedOptions[0]?.textContent?.trim() ?? "",
      peso: String(datos.get("pesoBrutoTotal") ?? ""),
      bultos: String(datos.get("numeroBultos") ?? ""),
      partida: textoOpcion("Distrito de partida"),
      llegada: textoOpcion("Distrito de llegada"),
      modalidad: datos.get("tipoTransporte") === "02" ? "Privado" : "Público",
      placa: String(datos.get("placa") ?? "").trim().toLocaleUpperCase("es-PE"),
    });
  }

  useEffect(() => {
    let vigente = true;
    void servicioIngresos.numeraciones().then((numeraciones) => {
      if (vigente) setSerie({ codigo: numeraciones.GUIA_REMITENTE.codigo });
    }).catch(() => {
      if (vigente) setSerie({ codigo: null, error: "No se pudo consultar la serie de la guía." });
    });
    return () => { vigente = false; };
  }, []);

  function cambiarCantidad(id: string, cantidad: string | null) {
    setCantidades((actuales) => {
      const siguiente = { ...actuales };
      if (cantidad === null) delete siguiente[id];
      else siguiente[id] = cantidad;
      return siguiente;
    });
  }

  function imprimir(guia: GuiaRemision) {
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    void preparacion.then((preparada) => imprimirAlEmitir.imprimir(() => documentoDeGuia(guia), preparada))
      .catch((problema) => alertas.error(mensajeErrorImpresion(problema)));
  }

  function emitir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeEmitir || !documento) return;
    const valores = Object.fromEntries(new FormData(evento.currentTarget).entries());
    if (valores.tipoTransporte === "01" && !valores.transportistaId) { alertas.error("Selecciona un transportista para el traslado público."); return; }
    if (valores.tipoTransporte === "02" && !valores.conductorId) { alertas.error("Selecciona un conductor para el traslado privado."); return; }
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    const origen = documento;
    setGuardando(true);
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { alertas.error(mensajeErrorImpresion(problema)); setGuardando(false); return; }
      try {
        const respuesta = await servicioIngresos.emitirGuia({
          ...valores,
          tipo: "REMITENTE",
          ingresoId: origen.id,
          items: Object.entries(cantidades).map(([detalleId, cantidad]) => ({ detalleId, cantidad })),
        });
        const guia: GuiaRemision = {
          id: respuesta.id, tipo: respuesta.tipo, codigo: respuesta.codigo, estado: respuesta.estado, fecha: hoy,
          ingresoId: origen.id, clienteNombre: origen.clienteNombreCompleto, comprobanteOrigen: { codigo: origen.codigo, tipo: origen.tipoComprobante },
          detalle: respuesta.mensaje ?? null, enlacePdf: null, enlaceXml: null, enlaceCdr: null,
        };
        setEmitida(guia);
        // Es un documento electrónico: solo se imprime cuando SUNAT lo acepta.
        if (respuesta.estado === "EMITIDO") void imprimirAlEmitir.imprimir(() => documentoDeGuia(guia), preparada);
        alEmitir(respuesta);
      } catch (problema) {
        alertas.error(problema instanceof Error ? problema.message : "No se pudo enviar la guía a NubeFact.");
      } finally {
        setGuardando(false);
      }
    })();
  }

  const aceptada = emitida?.estado === "EMITIDO";
  const numero = emitida?.codigo ?? serie?.codigo ?? (serie ? serie.error ? "Consulta fallida" : "Serie sin configurar" : "Consultando…");

  return <div className="os-editor guia-remision-editor">
    {serie && !serie.codigo && <NotificacionFlotante mensaje={serie.error || "Configura una serie activa para emitir la guía de remitente."} />}
    <form ref={formulario} className="os-formulario" onSubmit={emitir} onChange={actualizarResumen} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />Guía de remisión · remitente</span>
        <div className="os-numero" aria-live="polite"><span>N.° DE GUÍA</span><strong>{numero}</strong></div>
      </div>

      <div className="os-disposicion">
          <fieldset className="os-columna guia-campos-formulario" disabled={guardando || Boolean(emitida)}>
            <ComprobanteGuia
              documento={documento}
              cambiando={cambiandoDocumento}
              alEditar={setCambiandoDocumento}
              alCargar={setCargandoDocumento}
              alCambiar={(siguiente) => { setDocumento(siguiente); setCantidades({}); }}
            />
            {documento ? <div key={documento.id} className="os-columna">
              <DatosTrasladoGuia hoy={hoy} />
              <BienesGuia bienes={documento.detalles} cantidades={cantidades} alCambiarCantidad={cambiarCantidad} />
              <RutaGuia />
              <TransporteGuia hoy={hoy} />
              <SeccionGuia paso={6} id="guia-titulo-observaciones" titulo="Observaciones">
                <div className="os-revision">
                  <label className="os-campo">
                    <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observaciones de la guía <em className="os-opcional">Opcional</em></span>
                    <textarea name="observaciones" maxLength={LIMITE_OBSERVACIONES} rows={3} value={observaciones} onChange={(evento) => setObservaciones(evento.target.value)}
                      placeholder="Ej. Entregar en el almacén posterior; el cliente recibe de 8:00 a 13:00." />
                    <small className="os-ayuda os-contador">{observaciones.length}/{LIMITE_OBSERVACIONES}</small>
                  </label>
                </div>
              </SeccionGuia>
            </div> : <div className="os-vacio"><strong>Selecciona un documento de origen</strong><span>Al elegir la boleta, factura o nota de venta se cargarán el destinatario y los bienes que puedes trasladar.</span></div>}
          </fieldset>

          <aside className="os-resumen" aria-label="Resumen de la guía">
            <h3>Resumen de la guía</h3>
            <dl className="os-importes">
              <div><dt>Documento</dt><dd>{documento?.codigo ?? "Sin seleccionar"}</dd></div>
              <div><dt>Destinatario</dt><dd className="guia-resumen-texto">{documento ? documento.clienteNombreCompleto?.trim() || "Clientes varios" : "Pendiente"}</dd></div>
              <div><dt>Motivo</dt><dd>{datosResumen.motivo || "Pendiente"}</dd></div>
              <div><dt>Peso bruto</dt><dd>{datosResumen.peso ? `${datosResumen.peso} kg` : "Pendiente"}</dd></div>
              <div><dt>Bultos</dt><dd>{datosResumen.bultos || "Pendiente"}</dd></div>
              <div><dt>Ruta</dt><dd className="guia-resumen-texto">{datosResumen.partida && datosResumen.llegada ? `${datosResumen.partida} → ${datosResumen.llegada}` : "Pendiente"}</dd></div>
              <div><dt>Transporte</dt><dd>{datosResumen.modalidad}{datosResumen.placa ? ` · ${datosResumen.placa}` : ""}</dd></div>
              <div className="es-total"><dt>Bienes</dt><dd aria-live="polite">{cantidadBienes}</dd></div>
            </dl>
            {emitida && <div className={`guia-confirmacion${aceptada ? "" : " es-pendiente"}`} role="status">
              <strong>{aceptada ? <CheckCircle2 aria-hidden="true" size={18} /> : <TriangleAlert aria-hidden="true" size={18} />}{aceptada ? `Guía ${emitida.codigo} aceptada por SUNAT` : `Guía ${emitida.codigo} enviada`}</strong>
              <span>{aceptada ? "Se envió a la impresora." : emitida.detalle || "Falta la confirmación de SUNAT. Consúltala desde el listado para imprimirla."}</span>
              {aceptada && <button type="button" className="os-cancelar" onClick={() => imprimir(emitida)}><Printer aria-hidden="true" size={16} />Reimprimir</button>}
            </div>}
            <div className="os-acciones">
              {!emitida && <button className="os-guardar" type="submit" disabled={!puedeEmitir}><Printer aria-hidden="true" size={18} />{guardando ? "Emitiendo guía…" : "Imprimir guía"}</button>}
              <button className="os-cancelar" type="button" disabled={guardando} onClick={emitida ? alCancelar : cancelar.solicitarCancelacion}>{emitida ? "Volver al listado" : "Cancelar"}</button>
            </div>
          </aside>
      </div>
    </form>
    {cancelar.dialogo}
  </div>;
}
