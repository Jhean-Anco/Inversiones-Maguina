import { useEffect } from "react";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { AjusteStockFormulario } from "../../components/inventario/ajuste-stock-formulario/ajuste-stock-formulario";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useMovimientosStock } from "../../hooks/use-movimientos-stock";
import type { MovimientoStock } from "../../services/inventario/movimientos-stock.service";
import {
  movimientoCantidadClasses,
  movimientoCodigoClasses,
  movimientoDetalleClasses,
  movimientoFechaClasses,
  movimientoNombreProductoClasses,
  movimientoProductoClasses,
  movimientoTableClasses,
  movimientoTableRowClasses,
  movimientoTableScrollClasses,
  movimientoHeaderClasses,
  movimientoControlClasses,
  movimientoPaginacionClasses,
} from "./movimientos-stock-classes";

const numero = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const motivoVisible = (codigo: string | null) => ({ INVENTARIO_FISICO: "Conteo de inventario", MERMA: "Merma", DANIO: "Repuesto dañado", PERDIDA: "Pérdida", DEVOLUCION: "Devolución", CORRECCION: "Corrección de registro", OTRO: "Otro motivo" }[codigo ?? ""] ?? codigo ?? "—");

const encabezadoMovimientos = <tr><th>Fecha y hora</th><th>Repuesto</th><th>Anterior</th><th>Variación</th><th>Final</th><th>Motivo</th><th>Responsable</th><th>Observación</th></tr>;
function filaMovimiento(movimiento: MovimientoStock) {
  const aumento = movimiento.sentido === "INGRESO";
  return <tr className={movimientoTableRowClasses} key={movimiento.id}>
          <td><time className={movimientoFechaClasses} dateTime={movimiento.creadoEn}>{fechaHora.format(new Date(movimiento.creadoEn))}</time></td>
          <td><span className={movimientoProductoClasses}><small className={movimientoCodigoClasses}>{movimiento.codigo}</small><strong className={movimientoNombreProductoClasses}>{movimiento.producto}</strong></span></td>
          <td>{movimiento.saldoAnterior == null ? "—" : numero.format(Number(movimiento.saldoAnterior))}</td>
          <td><strong className={movimientoCantidadClasses(aumento)}>{aumento ? "+" : "−"}{numero.format(Number(movimiento.cantidadBase))} {movimiento.unidad}</strong></td>
          <td>{movimiento.saldoFinal == null ? "—" : numero.format(Number(movimiento.saldoFinal))}</td>
          <td className={movimientoDetalleClasses}>{motivoVisible(movimiento.motivo)}</td>
          <td>{movimiento.usuario}</td>
          <td className={movimientoDetalleClasses}>{movimiento.observacion || "—"}</td>
        </tr>;
}

export function MovimientosStockPage({ puedeAjustar }: { puedeAjustar: boolean }) {
  const modulo = useMovimientosStock();
  useEffect(() => {
    if (!modulo.modalAbierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (evento: KeyboardEvent) => { if (evento.key === "Escape") modulo.cerrarModal(); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", escape); };
  }, [modulo.modalAbierto, modulo.guardando]);

  return <>
    {modulo.mensaje && <NotificacionFlotante tipo="exito" mensaje={modulo.mensaje} onCerrar={() => modulo.setMensaje("")} />}
    <CatalogoListado
      titulo="Ajustes de inventario de repuestos"
      descripcion="Consulta las variaciones de stock y registra correcciones con motivo y trazabilidad."
      etiquetaCrear="Nuevo ajuste de repuestos"
      tituloListado="Historial de ajustes"
      registros={modulo.movimientos}
      totalRegistros={modulo.total}
      cargando={modulo.cargando}
      mensajeCarga="Cargando movimientos…"
      error={modulo.modalAbierto ? "" : modulo.error}
      iconoVacio="↕"
      tituloVacio="Aún no hay ajustes"
      descripcionVacio="Los ajustes manuales que registres aparecerán aquí."
      pagina={modulo.pagina}
      porPagina={modulo.porPagina}
      totalPaginas={modulo.totalPaginas}
      desde={modulo.desde}
      hasta={modulo.hasta}
      busqueda={modulo.busqueda}
      busquedaPlaceholder="Buscar repuesto, código o motivo"
      busquedaAriaLabel="Buscar movimientos de stock"
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={puedeAjustar ? modulo.abrirNuevo : undefined}
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
      variante="tabla"
      encabezadoTabla={encabezadoMovimientos}
      renderizarFila={filaMovimiento}
      claseTabla={movimientoTableClasses}
      claseContenedorTabla={movimientoTableScrollClasses}
      claseCabecera={movimientoHeaderClasses}
      claseControlesCabecera={movimientoControlClasses}
      clasePaginacion={movimientoPaginacionClasses}
    />
    {modulo.modalAbierto && <AjusteStockFormulario {...modulo} />}
  </>;
}
