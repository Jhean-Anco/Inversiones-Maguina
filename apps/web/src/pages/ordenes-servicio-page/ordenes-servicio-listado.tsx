import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useMemo, useState } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import type { OrdenServicio } from "../../services/ingresos.service";
import type { LineaOrden } from "./types";
import { OrdenServicioRow } from "./orden-servicio-row";
import { SelectorDocumentoOrden } from "./orden-servicio-menu-acciones";
import { ordenesListadoClasses as c } from "./ordenes-tabla-classes";

type OrdenesServicioListadoProps = {
  ordenes: OrdenServicio[];
  busqueda: string;
  cargando: boolean;
  error: string;
  puedeCrear: boolean;
  onBuscar: (valor: string) => void;
  onCrear: () => void;
  onEmitir: (orden: OrdenServicio, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  onImprimir: (orden: OrdenServicio, formato: "A4" | "TICKET") => void;
  onEditar: (orden: OrdenServicio) => void;
  formatearFecha: (fecha: string) => string;
  formatearTotal: (lineas: LineaOrden[]) => string;
  formatearDesglose: (lineas: LineaOrden[]) => string;
  etiquetaEstado: (orden: OrdenServicio) => string;
};

export function OrdenesServicioListado({
  ordenes,
  busqueda,
  cargando,
  error,
  puedeCrear,
  onBuscar,
  onCrear,
  onEmitir,
  onImprimir,
  onEditar,
  formatearFecha,
  formatearTotal,
  formatearDesglose,
  etiquetaEstado,
}: OrdenesServicioListadoProps) {
  const [filtroEstado, setFiltroEstado] = useState("TODOS");
  const ordenesVisibles = useMemo(() => {
    const ordenadas = [...ordenes].sort((a, b) => {
      const fechaA = Date.parse(a.fechaRecepcion);
      const fechaB = Date.parse(b.fechaRecepcion);
      const fechaOrdenA = Number.isFinite(fechaA) ? fechaA : Number.NEGATIVE_INFINITY;
      const fechaOrdenB = Number.isFinite(fechaB) ? fechaB : Number.NEGATIVE_INFINITY;
      if (fechaOrdenA !== fechaOrdenB) return fechaOrdenB - fechaOrdenA;
      const numeroA = Number(a.codigo.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
      const numeroB = Number(b.codigo.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
      if (numeroA !== numeroB) return numeroB - numeroA;
      return b.codigo.localeCompare(a.codigo, "es", { numeric: true, sensitivity: "base" });
    });
    return filtroEstado === "TODOS" ? ordenadas : ordenadas.filter((orden) => orden.estado === filtroEstado);
  }, [filtroEstado, ordenes]);
  const controlesCabecera = <>
    <label className={`${c.search} listado-maestro-busqueda-icono`}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
      <input type="search" value={busqueda} placeholder="Buscar por orden, cliente o vehículo" aria-label="Buscar órdenes de servicio" onChange={(evento) => onBuscar(evento.target.value)} />
    </label>
    <label className="listado-maestro-filtro">Estado
      <select aria-label="Filtrar órdenes por estado" value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value)}>
        <option value="TODOS">Todos los estados</option>
        <option value="ABIERTA">Abierta</option>
        <option value="EN_PROCESO">En proceso</option>
        <option value="ESPERANDO_REPUESTOS">Esperando repuestos</option>
        <option value="COMPLETADA">Completada</option>
        <option value="EMITIENDO">Emitiendo</option>
        <option value="FACTURADA">Facturada</option>
        <option value="ANULADA">Anulada</option>
      </select>
    </label>
  </>;

  return <section className={`${c.page} ordenes-page`}>
    {error && <NotificacionFlotante mensaje={error} />}
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear orden de servicio" onClick={onCrear} />}
    <ListadoMaestro
      variante="tabla"
      titulo="Órdenes de servicio"
      descripcion="Seguimiento de las órdenes por vehículo y cliente."
      registros={ordenesVisibles}
      cargando={cargando}
      error={null}
      vacio={<div className={c.empty}><strong>{busqueda || filtroEstado !== "TODOS" ? "No hay órdenes para mostrar" : "Aún no hay órdenes de servicio"}</strong><span>{busqueda || filtroEstado !== "TODOS" ? "Prueba con otra búsqueda o cambia el estado seleccionado." : "Las órdenes registradas para tus clientes aparecerán aquí."}</span></div>}
      controlesCabecera={controlesCabecera}
      claseCabecera={c.header}
      claseControlesCabecera={c.controls}
      clasePaginacion={c.pagination}
      paginacion={{ modo: "local" }}
      resetKey={`${busqueda}|${filtroEstado}`}
      claseTabla={`${c.table} ordenes-table`}
      claseContenedor={c.tableScroll}
      centrarCeldas
      encabezadoTabla={<tr><th>Fecha</th><th>N.° de orden</th><th>Vehículo</th><th>Cliente</th><th>Estado</th><th className={c.number}>Total estimado</th><th>Acciones</th></tr>}
      renderizarFila={(orden) => <OrdenServicioRow
        key={orden.id}
        orden={orden}
        fecha={formatearFecha(orden.fechaRecepcion)}
        estado={etiquetaEstado(orden)}
        total={formatearTotal(orden.detalles as LineaOrden[])}
        desglose={formatearDesglose(orden.detalles as LineaOrden[])}
        puedeCrear={puedeCrear}
        menuDocumento={<SelectorDocumentoOrden onSeleccionar={(tipo) => onEmitir(orden, tipo)} />}
        formatearFecha={formatearFecha}
        alImprimirA4={() => onImprimir(orden, "A4")}
        alImprimirTicket={() => onImprimir(orden, "TICKET")}
        alEditar={() => onEditar(orden)}
      />}
    />
  </section>;
}
