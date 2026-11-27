import type { ReactNode } from "react";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { estilosDashboard } from "./dashboard-classes";
import { useDashboardDatos } from "./use-dashboard-datos";
import { IndicadoresClave } from "./dashboard-indicadores";
import { ParetoArticulosChart, RitmoChart, VariacionPorTipoChart } from "./dashboard-comparativas";
import { etiquetaComparacion, textosPeriodo } from "./dashboard-periodos";
import { CascadaCajaChart, IngresosEgresosChart, MapaVentasChart, MediosPagoChart, MezclaVentasChart } from "./dashboard-composicion";
import { MapaCalorHorarios } from "./dashboard-horarios";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);

// Las clases deben escribirse completas para que Tailwind las detecte.
const columnas = { 4: "col-span-4", 5: "col-span-5", 6: "col-span-6", 7: "col-span-7", 8: "col-span-8", 12: "col-span-full" } as const;

function Panel({ rotulo, titulo, descripcion, columnas: ancho, children }: { rotulo: string; titulo: string; descripcion: string; columnas: keyof typeof columnas; children: ReactNode }) {
  return (
    <article className={`${estilosDashboard.panel} inicio-panel ${columnas[ancho]} mobile-landscape:col-span-1 mobile-portrait:col-span-1`}>
      <header className={`${estilosDashboard.heading} inicio-panel-heading`}>
        <div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>{rotulo}</span><h2>{titulo}</h2><p>{descripcion}</p></div>
      </header>
      {children}
    </article>
  );
}


export function DashboardPage({ puedeVerIngresos = true, permisos = [] }: { nombre: string; rol: string; puedeVerIngresos?: boolean; permisos?: string[] }) {
  const datos = useDashboardDatos(puedeVerIngresos, permisos);
  const { resumen, cargando, error, reporte, indicadores, ritmo, cascada, ingresosEgresos, horarios, periodo, comparar } = datos;
  const tp = textosPeriodo(periodo);
  const comparacion = etiquetaComparacion(periodo, comparar);
  const hayVentas = puedeVerIngresos && reporte.listo;

  return <section className={`${estilosDashboard.root} ${estilosDashboard.extra} inicio-dashboard`}>
    {error && <NotificacionFlotante mensaje={error} />}
    {reporte.error && <NotificacionFlotante mensaje={reporte.error} titulo="No se pudo cargar la actividad" accion={{ etiqueta: "Actualizar resumen", ejecutar: datos.reintentar }} />}
    {!reporte.error && datos.hayFallos && <NotificacionFlotante mensaje="Algunos gráficos no se pudieron cargar. Puedes intentarlo de nuevo." titulo="Resumen incompleto" accion={{ etiqueta: "Actualizar resumen", ejecutar: datos.reintentar }} />}
    {cargando ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Preparando el panel del negocio...</span></div> : resumen && (
      <div className={`${estilosDashboard.grid} inicio-chart-grid`}>
        <div className="col-span-full">
          <IndicadoresClave soles={soles} ingresos={indicadores.ingresos} textos={{ periodo: tp.del, comparacion }} ticket={indicadores.ticket} saldo={indicadores.saldo} margen={indicadores.margen} mostrarMargen={indicadores.mostrarMargen} mostrarIngresos={puedeVerIngresos && !reporte.error} mostrarFinanzas={indicadores.mostrarSaldo} />
        </div>
        {!puedeVerIngresos && <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty col-span-full`}>Tu usuario no tiene permiso para consultar los reportes de ventas.</div>}
        {puedeVerIngresos && reporte.cargando && <div className={`${estilosDashboard.loading} inicio-loading col-span-full`} role="status"><i /><span>Cargando actividad de ventas...</span></div>}
        {ritmo && (
          <Panel rotulo="RITMO" titulo="Ingresos acumulados" descripcion={`Frente a ${tp.conArticulo} y al año pasado.`} columnas={12}>
            <RitmoChart ritmo={ritmo} soles={soles} textos={{ este: tp.este, anterior: tp.anterior }} />
          </Panel>
        )}
        {cascada && (
          <Panel rotulo="DEL COBRO AL SALDO" titulo="Cascada de caja" descripcion="Del dinero cobrado al saldo neto." columnas={7}>
            <CascadaCajaChart cascada={cascada.datos} soles={soles} nota={cascada.variasMonedas ? `Se muestra la moneda ${cascada.moneda}.` : undefined} />
          </Panel>
        )}
        {hayVentas && (
          <Panel rotulo="QUÉ CAMBIÓ" titulo="Variación por tipo de venta" descripcion={`Frente a ${comparacion}, mismos días.`} columnas={5}>
            <VariacionPorTipoChart datos={datos.variacionConceptos} soles={soles} />
          </Panel>
        )}
        {hayVentas && (
          <Panel rotulo="12 MESES" titulo="Mezcla de ventas" descripcion="Repuestos, servicios y mototaxis." columnas={8}>
            <MezclaVentasChart meses={datos.mezclaVentas} soles={soles} />
          </Panel>
        )}
        {hayVentas && reporte.mediosListos && (
          <Panel rotulo={tp.nombre.toUpperCase()} titulo="Medios de pago" descripcion="Cómo pagaron tus clientes." columnas={4}>
            <MediosPagoChart medios={datos.mediosPago} soles={soles} />
          </Panel>
        )}
        {datos.pareto.length > 0 && (
          <Panel rotulo="QUÉ PRODUCTOS MANDAN" titulo="Artículos más vendidos" descripcion="Importe y % acumulado." columnas={7}>
            <ParetoArticulosChart datos={datos.pareto} soles={soles} />
          </Panel>
        )}
        {datos.mapaVentas.length > 0 && (
          <Panel rotulo="QUÉ CATEGORÍAS PESAN" titulo="Composición de ventas" descripcion="Ventas sin IGV." columnas={5}>
            <MapaVentasChart teselas={datos.mapaVentas} soles={soles} />
          </Panel>
        )}
        {ingresosEgresos && (
          <Panel rotulo="DINERO" titulo="Ingresos y egresos" descripcion="Cobros y pagos por mes, este año." columnas={8}>
            <IngresosEgresosChart meses={ingresosEgresos.meses} moneda={ingresosEgresos.moneda} />
          </Panel>
        )}
        {horarios && (
          <Panel rotulo="CUÁNDO VENDES" titulo="Ventas por día y hora" descripcion="Últimos 90 días." columnas={4}>
            <MapaCalorHorarios horarios={horarios} soles={soles} />
          </Panel>
        )}
      </div>
    )}
  </section>;
}
