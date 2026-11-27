import { useMemo, useState } from "react";
import type { ObtenerDocumento } from "../../impresion/servicio-impresion";
import type { Cotizacion } from "../../services/ingresos.service";
import { CotizacionesListado } from "./cotizaciones-listado";
import { cotizacionesListadoClasses as c } from "./cotizaciones-tabla-classes";
import { grupoEstado, type GrupoEstadoCotizacion } from "./estados-cotizacion";
import type { EstadoVisibleCotizacion } from "./use-gestion-listado";

const filtros: { valor: GrupoEstadoCotizacion; etiqueta: string }[] = [
  { valor: "ABIERTA", etiqueta: "Abiertas" },
  { valor: "CERRADA", etiqueta: "Cerradas" },
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
  documentoImprimible: (cotizacion: Cotizacion) => ObtenerDocumento;
  prepararDocumento: (cotizacion: Cotizacion, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeCrear: boolean;
  editar: (cotizacion: Cotizacion) => void;
};

export function GestionListadoVista(props: Props) {
  const { busqueda, setBusqueda, desde, setDesde, hasta, setHasta, cotizaciones, estadoVisible, ...resto } = props;
  const [filtro, setFiltro] = useState<GrupoEstadoCotizacion>("ABIERTA");
  const conteos = useMemo(() => {
    const porGrupo = new Map<GrupoEstadoCotizacion, number>();
    for (const cotizacion of cotizaciones) {
      const grupo = grupoEstado(estadoVisible(cotizacion));
      porGrupo.set(grupo, (porGrupo.get(grupo) ?? 0) + 1);
    }
    return porGrupo;
  }, [cotizaciones, estadoVisible]);
  const visibles = useMemo(
    () => cotizaciones.filter((cotizacion) => grupoEstado(estadoVisible(cotizacion)) === filtro),
    [cotizaciones, estadoVisible, filtro],
  );

  return <section className={c.page}>
    <div className={c.toolbar}>
      <label className={`${c.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" aria-label="Buscar cotizaciones" placeholder="Buscar por código o cliente" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} />
      </label>
      <label className={c.dateField}>Vigencia desde<input type="date" value={desde} onChange={(evento) => setDesde(evento.target.value)} /></label>
      <label className={c.dateField}>Hasta<input type="date" aria-label="Vigencia hasta" value={hasta} onChange={(evento) => setHasta(evento.target.value)} /></label>
      <div className={c.filters} role="group" aria-label="Filtrar por estado">
        {filtros.map(({ valor, etiqueta }) => <button key={valor} className={c.chip} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
          {etiqueta}<span className={c.chipCount}>{conteos.get(valor) ?? 0}</span>
        </button>)}
      </div>
    </div>
    <CotizacionesListado
      {...resto}
      cotizaciones={visibles}
      hayFiltros={Boolean(busqueda || desde || hasta) || cotizaciones.length > 0}
      resetKey={`${busqueda}|${desde}|${hasta}|${filtro}`}
      estadoVisible={estadoVisible}
    />
  </section>;
}
