import type { ReactNode } from "react";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import type { Cotizacion } from "../../services/ingresos.service";
import { cotizacionClases } from "./cotizacion-clases";
import { CotizacionRow } from "./cotizacion-row";

type EstadoVisibleCotizacion = "EMITIDA" | "INACTIVA" | "ACTIVA";
type CotizacionesListadoProps = {
  controlesCabecera: ReactNode;
  cotizaciones: Cotizacion[];
  cargando: boolean;
  filtroEstadoActivo: boolean;
  resetKey: string;
  estadoVisible: (cotizacion: Cotizacion) => EstadoVisibleCotizacion;
  documentoCompletado: (cotizacion: Cotizacion) => boolean;
  mensajeWhatsApp: (cotizacion: Cotizacion) => string;
  imprimirA4: (cotizacion: Cotizacion) => () => void;
  imprimirTicket: (cotizacion: Cotizacion) => () => void;
  prepararDocumento: (cotizacion: Cotizacion, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeCrear: boolean;
  editar: (cotizacion: Cotizacion) => void;
};

export function CotizacionesListado({ controlesCabecera, cotizaciones, cargando, filtroEstadoActivo, resetKey, estadoVisible, documentoCompletado, mensajeWhatsApp, imprimirA4, imprimirTicket, prepararDocumento, puedeCrear, editar }: CotizacionesListadoProps) {
  return <ListadoMaestro
    controlesCabecera={controlesCabecera}
    claseCabecera={`${cotizacionClases.listHeader} ${cotizacionClases.listHeaderMobile}`}
    claseControlesCabecera={`${cotizacionClases.listControls} ${cotizacionClases.controlsMobile}`}
    titulo="Cotizaciones"
    descripcion="Propuestas comerciales y su conversión en ventas."
    registros={cotizaciones}
    cargando={cargando}
    error={null}
    claseTabla={`${cotizacionClases.table} cotizaciones-tabla`}
    vacio={<div className={cotizacionClases.empty}><span className={cotizacionClases.emptyIcon} aria-hidden="true">+</span><strong className={cotizacionClases.emptyTitle}>{filtroEstadoActivo ? "No hay cotizaciones para este estado" : "Aún no hay cotizaciones"}</strong><p className={cotizacionClases.emptyDescription}>{filtroEstadoActivo ? "Elige otro estado para ver más resultados." : "Cuando prepares una propuesta para un cliente, aparecerá aquí."}</p></div>}
    clasePaginacion="mr-[72px]"
    paginacion={{ modo: "local" }}
    resetKey={resetKey}
    variante="tabla"
    encabezadoTabla={(
      <tr>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnCode}`}>Cotización</th>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnClient}`}>Cliente</th>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnDates}`}>Emisión → vigencia</th>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnStatus}`}>Estado</th>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnTotal} text-right`}>Total</th>
        <th className={`${cotizacionClases.tableHeader} ${cotizacionClases.columnActions} text-center`}>Acciones</th>
      </tr>
    )}
    renderizarFila={(cotizacion) => {
      const estado = estadoVisible(cotizacion);
      const puedeEditarCotizacion = puedeCrear && !cotizacion.ingresoId && ["BORRADOR", "ENVIADA", "ACEPTADA"].includes(cotizacion.estado);
      return <CotizacionRow key={cotizacion.id} cotizacion={cotizacion} estado={estado} mensajeWhatsApp={mensajeWhatsApp(cotizacion)} mostrarMenuDocumento={!cotizacion.ingresoId && estado !== "EMITIDA"} documentoPendiente={Boolean(cotizacion.ingresoId) && !documentoCompletado(cotizacion)} onImprimirA4={imprimirA4(cotizacion)} onImprimirTicket={imprimirTicket(cotizacion)} onPrepararDocumento={(tipo) => prepararDocumento(cotizacion, tipo)} puedeEditar={puedeEditarCotizacion} onEditar={() => editar(cotizacion)} />;
    }}
  />;
}
