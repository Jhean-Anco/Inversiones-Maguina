import { Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioIngresos, type DocumentoGuia } from "../../services/ingresos.service";
import { BienesGuia } from "./bienes-guia";
import { claseCampoGuia, claseControlGuia } from "./campos-guia";
import { ComprobanteGuia } from "./comprobante-guia";
import { RutaGuia } from "./ruta-guia";
import { DatosTrasladoGuia, TransporteGuia } from "./transporte-guia";

type Props = {
  alCancelar: () => void;
  alEmitir: (guia: Awaited<ReturnType<typeof servicioIngresos.emitirGuia>>) => void;
};

const espacioDocumento = "w-full px-4 sm:px-6 lg:px-8";

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

  return <section aria-labelledby="guia-editor-titulo" className="guia-remision-editor grid h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-border bg-surface text-foreground shadow-card mobile-portrait:rounded-none print:hidden">
    {serie && !serie.codigo && <NotificacionFlotante mensaje={serie.error || "Configura una serie activa para emitir la guía de remitente."} />}
    <header className="border-l-4 border-l-destructive bg-primary text-white">
      <div className={`${espacioDocumento} flex flex-wrap items-center justify-between gap-x-5 gap-y-2 py-3 sm:py-4`}>
        <div className="min-w-0">
          <h2 id="guia-editor-titulo" className="text-[clamp(18px,2.1vw,25px)] font-bold tracking-[-.025em]">Nueva guía de remisión</h2>
          <p className="text-xs text-[#d5e4f2]">Remitente</p>
        </div>
        <div className="grid min-w-0 gap-0.5 rounded-md border border-[#ffffff35] bg-[#ffffff12] px-3 py-1.5 max-sm:flex max-sm:flex-wrap max-sm:items-baseline max-sm:gap-x-2" aria-live="polite">
          <span className="text-[11px] text-[#d5e4f2]">Correlativo previsto</span>
          <strong className="text-sm tabular-nums">{serie?.codigo ?? (serie ? serie.error ? "Consulta fallida" : "Serie sin configurar" : "Consultando…")}</strong>
        </div>
      </div>
    </header>
    <form className="grid min-h-0 grid-rows-[minmax(0,1fr)]" ref={formulario} onSubmit={emitir} aria-busy={guardando}>
      <div className="@container relative min-h-0 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain">
        <fieldset className="m-0 min-w-0 border-0 p-0" disabled={guardando}>
          <div className={`${espacioDocumento} grid gap-4 border-b border-border py-4 sm:py-5`}>
            <ComprobanteGuia
              documento={documento}
              cambiando={cambiandoDocumento}
              alEditar={setCambiandoDocumento}
              alCargar={setCargandoDocumento}
              alCambiar={(siguiente) => { setDocumento(siguiente); setCantidades({}); }}
            />
            {documento && <DatosTrasladoGuia key={documento.id} hoy={hoy} />}
          </div>
          {documento && <div key={documento.id} className="grid min-w-0">
            <div className={`${espacioDocumento} border-b border-border py-4 sm:py-5`}>
              <BienesGuia bienes={documento.detalles} cantidades={cantidades} alCambiarCantidad={cambiarCantidad} />
            </div>
            <div className={`${espacioDocumento} grid min-w-0 gap-5 py-4 sm:py-5`}>
              <RutaGuia />
              <TransporteGuia hoy={hoy} />
              <label className={`${claseCampoGuia} border-t border-dashed border-input pt-4`}>Observaciones (opcional)
                <textarea className={`${claseControlGuia} min-h-20 resize-y`} name="observaciones" maxLength={1000} rows={3} />
              </label>
            </div>
          </div>}
        </fieldset>
        <footer className="border-t border-border bg-surface">
          <div className={`${espacioDocumento} grid gap-2 py-2.5 sm:py-3`}>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <span className="text-xs font-semibold text-muted-foreground" aria-live="polite">
                {documento && (cantidadBienes === 0 ? "Agrega los bienes que se trasladarán" : cantidadBienes === 1 ? "1 bien seleccionado" : `${cantidadBienes} bienes seleccionados`)}
              </span>
              <div className="flex items-center justify-end gap-2 max-sm:grid max-sm:w-full max-sm:grid-cols-[auto_minmax(0,1fr)]">
                <Button className="max-[375px]:px-2 max-[375px]:text-xs" variant="outline" disabled={guardando} onClick={cancelar.solicitarCancelacion}>Cancelar</Button>
                <Button className="max-[375px]:px-2 max-[375px]:text-xs" type="submit" disabled={!puedeEmitir}>
                  <Send size={15} aria-hidden="true" />{guardando ? "Enviando guía…" : "Emitir guía"}
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </form>
    {cancelar.dialogo}
  </section>;
}
