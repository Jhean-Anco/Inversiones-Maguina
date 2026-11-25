import type { Cotizacion } from "../../services/ingresos.service";
import { CotizacionesListado } from "./cotizaciones-listado";
import { cotizacionClases } from "./cotizacion-clases";
import type { EstadoVisibleCotizacion } from "./use-gestion-listado";

type Props = {
  busqueda: string;
  setBusqueda: (valor: string) => void;
  desde: string;
  setDesde: (valor: string) => void;
  hasta: string;
  setHasta: (valor: string) => void;
  cotizaciones: Cotizacion[];
  cargando: boolean;
  estadoVisible: (cotizacion: Cotizacion) => EstadoVisibleCotizacion;
  documentoCompletado: (cotizacion: Cotizacion) => boolean;
  mensajeWhatsApp: (cotizacion: Cotizacion) => string;
  imprimir: (cotizacion: Cotizacion, formato: "A4" | "TICKET") => unknown;
  prepararDocumento: (cotizacion: Cotizacion, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeCrear: boolean;
  editar: (cotizacion: Cotizacion) => void;
};

export function GestionListadoVista(props: Props) {
  const {
    busqueda, setBusqueda, desde, setDesde, hasta, setHasta,
    cotizaciones, cargando, estadoVisible, documentoCompletado, mensajeWhatsApp,
    imprimir, prepararDocumento, puedeCrear, editar,
  } = props;
  const controles = (
    <div className={`gestion-ingresos-heading cotizaciones-list-filters ${cotizacionClases.listFilters} ${cotizacionClases.filtersMobile}`}>
      <input
        className={cotizacionClases.filterControl}
        aria-label="Buscar"
        placeholder="Buscar código o cliente"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
      />
      <label className={cotizacionClases.filterLabel}>Vigencia desde<input className={cotizacionClases.filterControl} type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} /></label>
      <label className={cotizacionClases.filterLabel}>Vigencia hasta<input className={cotizacionClases.filterControl} type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} /></label>
    </div>
  );

  return <CotizacionesListado
    controlesCabecera={controles}
    cotizaciones={cotizaciones}
    cargando={cargando}
    estadoVisible={estadoVisible}
    documentoCompletado={documentoCompletado}
    mensajeWhatsApp={mensajeWhatsApp}
    imprimirA4={(cotizacion) => () => imprimir(cotizacion, "A4")}
    imprimirTicket={(cotizacion) => () => imprimir(cotizacion, "TICKET")}
    prepararDocumento={prepararDocumento}
    puedeCrear={puedeCrear}
    editar={editar}
  />;
}
