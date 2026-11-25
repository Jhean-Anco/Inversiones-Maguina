import { Send } from "lucide-react";
import "./formulario-guia-remision.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioIngresos, type DocumentoGuia } from "../../services/ingresos.service";
import { BienesGuia } from "./bienes-guia";
import { CatalogoBienesGuia } from "./catalogo-bienes-guia";
import { claseCampoGuia, claseControlGuia } from "./campos-guia";
import { ComprobanteGuia } from "./comprobante-guia";
import { RutaGuia } from "./ruta-guia";
import { DatosTrasladoGuia, TransporteGuia } from "./transporte-guia";

type Props = {
  alCancelar: () => void;
  alEmitir: (guia: Awaited<ReturnType<typeof servicioIngresos.emitirGuia>>) => void;
};

export function FormularioGuiaRemision({ alCancelar, alEmitir }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const [hoy] = useState(() => new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" }));
  const [serie, setSerie] = useState<{ codigo: string | null; error?: string } | null>(null);
  const [documento, setDocumento] = useState<DocumentoGuia | null>(null);
  const [cambiandoDocumento, setCambiandoDocumento] = useState(false);
  const [cargandoDocumento, setCargandoDocumento] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);
  const alertas = useAlertas();
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCancelar, "la guía de remisión");
  const cantidadBienes = Object.keys(cantidades).length;
  const puedeEmitir = Boolean(serie?.codigo && documento && cantidadBienes && !guardando && !cargandoDocumento && !cambiandoDocumento);

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

  async function emitir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!puedeEmitir || !documento) return;
    const valores = Object.fromEntries(new FormData(evento.currentTarget).entries());
    if (valores.tipoTransporte === "01" && !valores.transportistaId) {
      alertas.error("Selecciona un transportista para el traslado público.");
      return;
    }
    if (valores.tipoTransporte === "02" && !valores.conductorId) {
      alertas.error("Selecciona un conductor para el traslado privado.");
      return;
    }
    setGuardando(true);
    try {
      const guia = await servicioIngresos.emitirGuia({
        ...valores,
        tipo: "REMITENTE",
        ingresoId: documento.id,
        items: Object.entries(cantidades).map(([detalleId, cantidad]) => ({ detalleId, cantidad })),
      });
      alEmitir(guia);
    } catch (problema) {
      alertas.error(problema instanceof Error ? problema.message : "No se pudo enviar la guía a NubeFact.");
    } finally {
      setGuardando(false);
    }
  }

  return <section aria-labelledby="guia-editor-titulo" className="guia-remision-editor print:hidden">
    {serie && !serie.codigo && <NotificacionFlotante mensaje={serie.error || "Configura una serie activa para emitir la guía de remitente."} />}
    <form ref={formulario} onSubmit={emitir} aria-busy={guardando} className="guide-create-layout">
      <CatalogoBienesGuia bienes={documento?.detalles ?? []} cantidades={cantidades} alAgregar={(bien) => cambiarCantidad(bien.id, bien.cantidad)} habilitado={Boolean(documento) && !cambiandoDocumento && !guardando} ocupado={cambiandoDocumento || guardando} />
      <article className="guide-form-pane">
        <header className="guide-form-heading"><div><p>GUÍA DE REMISIÓN · REMITENTE</p><h2 id="guia-editor-titulo">Nueva guía de remisión</h2></div><div className="guide-number-card" aria-live="polite"><span>N° DE GUÍA</span><strong>{serie?.codigo ?? (serie ? serie.error ? "Consulta fallida" : "Serie sin configurar" : "Consultando…")}</strong></div></header>
        <div className="guide-form-scroll">
          <fieldset className="guide-form-fields m-0 min-w-0 border-0 p-0" disabled={guardando}>
            <div className="guide-form-section">
              <ComprobanteGuia
                documento={documento}
                cambiando={cambiandoDocumento}
                alEditar={setCambiandoDocumento}
                alCargar={setCargandoDocumento}
                alCambiar={(siguiente) => { setDocumento(siguiente); setCantidades({}); }}
              />
            </div>
            {documento ? <div key={documento.id} className="grid min-w-0">
              <div className="guide-form-section guide-data-section">
                <div className="guide-section-title"><span>DESTINO DEL TRASLADO</span><h3>Datos del traslado</h3></div>
                <DatosTrasladoGuia key={documento.id} hoy={hoy} />
              </div>
              <div className="guide-form-section">
                <BienesGuia bienes={documento.detalles} cantidades={cantidades} alCambiarCantidad={cambiarCantidad} />
              </div>
              <div className="guide-form-section guide-form-detail">
                <RutaGuia />
                <TransporteGuia hoy={hoy} />
                <label className={`${claseCampoGuia} guide-observations`}>Observaciones (opcional)
                  <textarea className={`${claseControlGuia} min-h-20 resize-y`} name="observaciones" maxLength={1000} rows={3} />
                </label>
              </div>
            </div> : <div className="guide-empty-state"><strong>Selecciona un documento de origen</strong><span>Al elegir la factura, se cargarán el destinatario y los repuestos y mototaxis que puedes trasladar.</span></div>}
          </fieldset>
        </div>
        <footer className="guide-form-actions">
          <span aria-live="polite">{documento && (cantidadBienes === 0 ? "Agrega los bienes que se trasladarán" : cantidadBienes === 1 ? "1 bien seleccionado" : `${cantidadBienes} bienes seleccionados`)}</span>
          <div><Button variant="outline" disabled={guardando} onClick={cancelar.solicitarCancelacion}>Cancelar</Button><Button type="submit" disabled={!puedeEmitir}><Send size={15} aria-hidden="true" />{guardando ? "Enviando guía…" : "Emitir guía"}</Button></div>
        </footer>
      </article>
    </form>
    {cancelar.dialogo}
  </section>;
}
