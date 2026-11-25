import { useMemo, useState } from "react";
import type { Cotizacion } from "../../services/ingresos.service";
import { CotizacionesListado } from "./cotizaciones-listado";
import { cotizacionClases } from "./cotizacion-clases";
import type { EstadoVisibleCotizacion } from "./use-gestion-listado";

type FiltroCotizacion = "TODAS" | EstadoVisibleCotizacion;

const filtros: { valor: FiltroCotizacion; etiqueta: string }[] = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "ACTIVA", etiqueta: "Activas" },
  { valor: "EMITIDA", etiqueta: "Emitidas" },
  { valor: "INACTIVA", etiqueta: "Inactivas" },
];

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
  const [filtro, setFiltro] = useState<FiltroCotizacion>("TODAS");
  const conteos = useMemo(() => {
    const porEstado = new Map<FiltroCotizacion, number>([["TODAS", cotizaciones.length]]);
    for (const cotizacion of cotizaciones) {
      const estado = estadoVisible(cotizacion);
      porEstado.set(estado, (porEstado.get(estado) ?? 0) + 1);
    }
    return porEstado;
  }, [cotizaciones, estadoVisible]);
  const visibles = useMemo(
    () => filtro === "TODAS" ? cotizaciones : cotizaciones.filter((cotizacion) => estadoVisible(cotizacion) === filtro),
    [cotizaciones, estadoVisible, filtro],
  );

  const controles = (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className={`gestion-ingresos-heading cotizaciones-list-filters ${cotizacionClases.listFilters} ${cotizacionClases.filtersMobile}`}>
        <label className={`${cotizacionClases.searchField} listado-maestro-busqueda-icono`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input
            type="search"
            aria-label="Buscar cotizaciones"
            placeholder="Buscar por código o cliente"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </label>
        <label className={cotizacionClases.filterLabel}>Vigencia desde<input className={cotizacionClases.filterControl} type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} /></label>
        <label className={cotizacionClases.filterLabel}>Vigencia hasta<input className={cotizacionClases.filterControl} type="date" value={hasta} onChange={(evento) => setHasta(evento.target.value)} /></label>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
        {filtros.filter(({ valor }) => valor === "TODAS" || (conteos.get(valor) ?? 0) > 0 || valor === filtro).map(({ valor, etiqueta }) => (
          <button key={valor} className={cotizacionClases.filterChip} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
            {etiqueta}<span className={cotizacionClases.filterChipCount}>{conteos.get(valor) ?? 0}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return <CotizacionesListado
    controlesCabecera={controles}
    cotizaciones={visibles}
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
