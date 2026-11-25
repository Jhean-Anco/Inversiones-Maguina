import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useMemo, useState } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import type { OrdenServicio } from "../../services/ingresos.service";
import type { LineaOrden } from "./types";
import { OrdenServicioRow } from "./orden-servicio-row";
import { SelectorDocumentoOrden, type TipoDocumentoOrden } from "./orden-servicio-menu-acciones";
import { ordenesListadoClasses as c } from "./ordenes-tabla-classes";

type OrdenesServicioListadoProps = {
  ordenes: OrdenServicio[];
  busqueda: string;
  cargando: boolean;
  error: string;
  puedeCrear: boolean;
  tiposDocumentoDisponibles: TipoDocumentoOrden[];
  onBuscar: (valor: string) => void;
  onCrear: () => void;
  onEmitir: (orden: OrdenServicio, tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  onImprimir: (orden: OrdenServicio, formato: "A4" | "TICKET") => void;
  onEditar: (orden: OrdenServicio) => void;
  formatearFecha: (fecha: string) => string;
  formatearTotal: (lineas: LineaOrden[]) => string;
  etiquetaEstado: (orden: OrdenServicio) => string;
};

type FiltroEstado = "TODAS" | OrdenServicio["estado"];

const filtrosEstado: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "ABIERTA", etiqueta: "Abiertas" },
  { valor: "EN_PROCESO", etiqueta: "En proceso" },
  { valor: "ESPERANDO_REPUESTOS", etiqueta: "Esperando repuestos" },
  { valor: "COMPLETADA", etiqueta: "Completadas" },
  { valor: "FACTURADA", etiqueta: "Facturadas" },
  { valor: "ANULADA", etiqueta: "Anuladas" },
];

export function OrdenesServicioListado({
  ordenes,
  busqueda,
  cargando,
  error,
  puedeCrear,
  tiposDocumentoDisponibles,
  onBuscar,
  onCrear,
  onEmitir,
  onImprimir,
  onEditar,
  formatearFecha,
  formatearTotal,
  etiquetaEstado,
}: OrdenesServicioListadoProps) {
  const [filtro, setFiltro] = useState<FiltroEstado>("TODAS");
  const ordenesOrdenadas = useMemo(() => {
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
    return ordenadas;
  }, [ordenes]);
  const conteos = useMemo(() => {
    const porEstado = new Map<FiltroEstado, number>([["TODAS", ordenes.length]]);
    for (const orden of ordenes) porEstado.set(orden.estado, (porEstado.get(orden.estado) ?? 0) + 1);
    return porEstado;
  }, [ordenes]);
  // Un filtro sin órdenes se oculta, salvo "Todas" y el que está seleccionado.
  const filtrosVisibles = filtrosEstado.filter(({ valor }) => valor === "TODAS" || valor === filtro || (conteos.get(valor) ?? 0) > 0);
  const ordenesVisibles = useMemo(
    () => filtro === "TODAS" ? ordenesOrdenadas : ordenesOrdenadas.filter((orden) => orden.estado === filtro),
    [filtro, ordenesOrdenadas],
  );
  const hayFiltros = Boolean(busqueda) || filtro !== "TODAS";

  return <section className={`${c.page} ordenes-page`}>
    {error && <NotificacionFlotante mensaje={error} />}
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear orden de servicio" onClick={onCrear} />}
    <div className={c.toolbar}>
      <label className={`${c.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/></svg>
        <input type="search" value={busqueda} placeholder="Buscar por orden, cliente o vehículo" aria-label="Buscar órdenes de servicio" onChange={(evento) => onBuscar(evento.target.value)} />
      </label>
      <div className={c.filters} role="group" aria-label="Filtrar por estado">
        {filtrosVisibles.map(({ valor, etiqueta }) => <button key={valor} className={c.chip} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)}>
          {etiqueta}<span className={c.chipCount}>{conteos.get(valor) ?? 0}</span>
        </button>)}
      </div>
    </div>
    <ListadoMaestro
      variante="tabla"
      titulo="Órdenes de servicio"
      descripcion="Seguimiento de las órdenes por vehículo y cliente."
      registros={ordenesVisibles}
      cargando={cargando}
      error={null}
      vacio={<div className={c.empty}><strong>{hayFiltros ? "No hay órdenes para mostrar" : "Aún no hay órdenes de servicio"}</strong><span>{hayFiltros ? "Prueba con otra búsqueda o con otro estado." : "Las órdenes registradas para tus clientes aparecerán aquí."}</span></div>}
      claseCabecera={c.header}
      claseControlesCabecera={c.controls}
      clasePaginacion={c.pagination}
      paginacion={{ modo: "local" }}
      resetKey={`${busqueda}|${filtro}`}
      claseTabla={`${c.table} ordenes-table`}
      claseContenedor={c.tableScroll}
      centrarCeldas={false}
      encabezadoTabla={<tr><th>Orden</th><th>Vehículo</th><th>Cliente</th><th>Recepción / entrega</th><th>Estado</th><th className={c.number}>Total estimado</th><th className="!text-right">Acciones</th></tr>}
      renderizarFila={(orden) => <OrdenServicioRow
        key={orden.id}
        orden={orden}
        fecha={formatearFecha(orden.fechaRecepcion)}
        estado={etiquetaEstado(orden)}
        total={formatearTotal(orden.detalles as LineaOrden[])}
        puedeCrear={puedeCrear}
        menuDocumento={<SelectorDocumentoOrden tiposDisponibles={tiposDocumentoDisponibles} onSeleccionar={(tipo) => onEmitir(orden, tipo)} />}
        formatearFecha={formatearFecha}
        alImprimirA4={() => onImprimir(orden, "A4")}
        alImprimirTicket={() => onImprimir(orden, "TICKET")}
        alEditar={() => onEditar(orden)}
      />}
    />
  </section>;
}
