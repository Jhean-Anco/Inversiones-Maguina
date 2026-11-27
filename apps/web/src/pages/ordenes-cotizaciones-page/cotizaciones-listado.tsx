import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import type { ObtenerDocumento } from "../../impresion/servicio-impresion";
import type { Cotizacion } from "../../services/ingresos.service";
import { cotizacionesListadoClasses as c } from "./cotizaciones-tabla-classes";
import { CotizacionRow } from "./cotizacion-row";
import type { EstadoVisibleCotizacion } from "./use-gestion-listado";

type CotizacionesListadoProps = {
  cotizaciones: Cotizacion[];
  cargando: boolean;
  hayFiltros: boolean;
  resetKey: string;
  estadoVisible: (cotizacion: Cotizacion) => EstadoVisibleCotizacion;
  documentoCompletado: (cotizacion: Cotizacion) => boolean;
  mensajeWhatsApp: (cotizacion: Cotizacion) => string;
  documentoImprimible: (cotizacion: Cotizacion) => ObtenerDocumento;
  prepararDocumento: (cotizacion: Cotizacion, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeCrear: boolean;
  editar: (cotizacion: Cotizacion) => void;
};

export function CotizacionesListado({ cotizaciones, cargando, hayFiltros, resetKey, estadoVisible, documentoCompletado, mensajeWhatsApp, documentoImprimible, prepararDocumento, puedeCrear, editar }: CotizacionesListadoProps) {
  return <ListadoMaestro
    variante="tabla"
    titulo="Cotizaciones"
    descripcion="Propuestas comerciales y su conversión en ventas."
    registros={cotizaciones}
    cargando={cargando}
    error={null}
    claseCabecera={c.header}
    claseTabla={`${c.table} cotizaciones-tabla`}
    claseContenedor={c.tableScroll}
    centrarCeldas={false}
    vacio={<div className={c.empty}><strong>{hayFiltros ? "No hay cotizaciones para mostrar" : "Aún no hay cotizaciones"}</strong><span>{hayFiltros ? "Prueba con otra búsqueda, otra vigencia o con otro estado." : "Cuando prepares una propuesta para un cliente, aparecerá aquí."}</span></div>}
    paginacion={{ modo: "local" }}
    resetKey={resetKey}
    encabezadoTabla={<tr><th>Cotización</th><th>Cliente</th><th>Emisión / vigencia</th><th>Estado</th><th className={c.number}>Total</th><th>Acciones</th></tr>}
    renderizarFila={(cotizacion) => {
      const estado = estadoVisible(cotizacion);
      const puedeEditarCotizacion = puedeCrear && !cotizacion.ingresoId && ["BORRADOR", "ENVIADA", "ACEPTADA"].includes(cotizacion.estado);
      return <CotizacionRow key={cotizacion.id} cotizacion={cotizacion} estado={estado} mensajeWhatsApp={mensajeWhatsApp(cotizacion)} mostrarMenuDocumento={!cotizacion.ingresoId && estado !== "EMITIDA"} documentoPendiente={Boolean(cotizacion.ingresoId) && !documentoCompletado(cotizacion)} documentoImprimible={documentoImprimible(cotizacion)} onPrepararDocumento={(tipo) => prepararDocumento(cotizacion, tipo)} puedeEditar={puedeEditarCotizacion} onEditar={() => editar(cotizacion)} />;
    }}
  />;
}
