import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { motivoVisible, useMovimientosStock } from "../../hooks/use-movimientos-stock";
import type { MovimientoStock } from "../../services/inventario/movimientos-stock.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";
import { FormularioAjusteRepuestos } from "./formulario-ajuste-repuestos";

const numero = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const saldo = (valor: string | null) => valor == null ? "—" : numero.format(Number(valor));

// Ajustes ya registrados: sin chips de estado; la píldora indica si el stock subió o bajó.
const tonos = {
  INGRESO: { etiqueta: "Aumento", caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  RETIRO: { etiqueta: "Disminución", caja: "border-[#efcfcd] bg-[#fff4f3] text-[#9b2c2c]", punto: "bg-[#9b2c2c]" },
} as const;

const encabezado = <tr><th>Fecha y hora</th><th>Repuesto</th><th>Anterior</th><th>Variación</th><th>Final</th><th>Motivo</th><th>Responsable</th></tr>;

function FilaAjuste({ movimiento }: { movimiento: MovimientoStock }) {
  const tono = tonos[movimiento.sentido === "INGRESO" ? "INGRESO" : "RETIRO"];
  const signo = movimiento.sentido === "INGRESO" ? "+" : "−";
  return <tr>
    <td className="whitespace-nowrap [font-variant-numeric:tabular-nums] text-[#142b42]"><time dateTime={movimiento.creadoEn}>{fechaHora.format(new Date(movimiento.creadoEn))}</time></td>
    <td>
      <strong className={c.clientName}>{movimiento.producto}</strong>
      <small className={c.minorText}>{movimiento.codigo}</small>
    </td>
    <td className="[font-variant-numeric:tabular-nums]">{saldo(movimiento.saldoAnterior)}</td>
    <td>
      <span className={`${c.status} ${tono.caja}`} title={tono.etiqueta}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{signo}{numero.format(Number(movimiento.cantidadBase))} {movimiento.unidad}</span>
    </td>
    <td><span className={c.total}>{saldo(movimiento.saldoFinal)}</span></td>
    <td>
      <span className="block">{motivoVisible(movimiento.motivo)}</span>
      {movimiento.observacion && <small className={c.itemDetail} title={movimiento.observacion}>{movimiento.observacion}</small>}
    </td>
    <td>{movimiento.usuario}</td>
  </tr>;
}

export function MovimientosStockPage({ puedeAjustar }: { puedeAjustar: boolean }) {
  const modulo = useMovimientosStock();
  const notificacion = modulo.mensaje && <NotificacionFlotante tipo="exito" mensaje={modulo.mensaje} onCerrar={() => modulo.setMensaje("")} />;

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (modulo.modalAbierto) return <FormularioAjusteRepuestos modulo={modulo} />;

  return (
    <section className={c.page}>
      {puedeAjustar && <RegistrarAccionPrincipal etiqueta="Nuevo ajuste de repuestos" onClick={modulo.abrirNuevo} />}
      {notificacion}
      {modulo.error && !modulo.cargando && <NotificacionFlotante mensaje={modulo.error} onCerrar={() => modulo.setError("")} />}
      <div className={c.toolbar}>
        <label className={`${c.search} listado-maestro-busqueda-icono`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input type="search" value={modulo.busqueda} placeholder="Buscar repuesto, código o motivo" aria-label="Buscar ajustes de inventario"
            onChange={(evento) => { modulo.setBusqueda(evento.target.value); modulo.cambiarPagina(1); }} />
        </label>
      </div>
      <ListadoMaestro<MovimientoStock>
        variante="tabla"
        titulo="Ajustes de inventario de repuestos"
        registros={modulo.movimientos}
        cargando={modulo.cargando}
        claseCabecera={c.header}
        claseTabla={c.table}
        claseContenedor={c.tableScroll}
        paginacion={{
          modo: "remota", pagina: modulo.pagina, tamanio: modulo.porPagina, total: modulo.total, totalPaginas: modulo.totalPaginas,
          desde: modulo.desde, hasta: modulo.hasta,
          alCambiarPagina: modulo.cambiarPagina,
          alCambiarTamanio: modulo.cambiarPorPagina,
        }}
        vacio={<div className={c.empty}><strong>No hay ajustes para mostrar</strong><span>{modulo.busqueda.trim() ? "Prueba con otra búsqueda." : "Los ajustes manuales que registres aparecerán aquí."}</span></div>}
        encabezadoTabla={encabezado}
        renderizarFila={(movimiento) => <FilaAjuste key={movimiento.id} movimiento={movimiento} />}
      />
    </section>
  );
}
