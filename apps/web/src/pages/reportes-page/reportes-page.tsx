import { useEffect, useMemo, useState } from "react";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ErrorApi } from "../../services/api-cliente";
import { servicioReportes, type FiltroReporte, type ReporteInventario } from "../../services/reportes.service";
import { hoy, numero, primerDiaMes, soles } from "./reportes-formatters";
import { descargarReporteInventarioPdf } from "./inventario-pdf";
import { useViewportProfile } from "../../utilidades/use-viewport-profile";

type VistaInventario = "repuestos" | "mototaxis";
type Resultado = { tipo: "inventario"; datos: ReporteInventario };
type FiltroExistencia = "todas" | "con-stock" | "sin-stock";
type FilaInventario = { id: string; codigo: string; nombre: string; marca: string; categoria: string; unidad: string; stock: number; precioPromedioCompra: number; cantidadCompraTotal: number; precioPromedioVenta: number; cantidadVendidaTotal: number; precioVentaActual?: number | null };

function Indicadores({ datos }: { datos: { titulo: string; valor: string; detalle?: string }[] }) {
  return <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-border)] lg:grid-cols-4">
    {datos.map(({ titulo, valor, detalle }) => <div key={titulo} className="bg-[var(--erp-surface-muted)] px-3 py-4 text-center">
      <dt className="text-sm">{titulo}</dt><dd className="m-0 text-xl font-bold tabular-nums text-[var(--erp-focus)]">{valor}</dd>
      {detalle && <dd className="m-0 text-xs">{detalle}</dd>}
    </div>)}
  </dl>;
}

function ResumenInventario({ datos, vista, setVista, busqueda, setBusqueda, existencia, setExistencia, alExportar }: {
  datos: ReporteInventario; vista: VistaInventario; setVista: (vista: VistaInventario) => void;
  busqueda: string; setBusqueda: (busqueda: string) => void; existencia: FiltroExistencia;
  setExistencia: (existencia: FiltroExistencia) => void; alExportar: () => void;
}) {
  const perfilViewport = useViewportProfile();
  const usarTarjetasMoviles = Boolean(vista === "mototaxis" && (perfilViewport === "mobile-portrait" || perfilViewport === "mobile-landscape"));
  const motos = vista === "mototaxis" ? datos.mototaxis : undefined;
  const registros = useMemo<FilaInventario[]>(() => (motos
    ? motos.items.map((m) => ({ id: m.id, codigo: m.codigo, nombre: m.nombre, marca: m.marca, categoria: "Mototaxi", unidad: "", stock: m.stockActual, precioPromedioCompra: Number(m.precioPromedioCompra) || 0, cantidadCompraTotal: Number(m.cantidadCompraTotal) || 0, precioPromedioVenta: Number(m.precioPromedioVenta) || 0, cantidadVendidaTotal: Number(m.cantidadVendidaTotal) || 0, precioVentaActual: m.precioVentaActual == null ? null : Number(m.precioVentaActual) || 0 }))
    : datos.items.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, marca: p.marca, categoria: p.categoria || "Sin categoría", unidad: p.unidad, stock: Number(p.stockActual) || 0, precioPromedioCompra: Number(p.precioPromedioCompra) || 0, cantidadCompraTotal: Number(p.cantidadCompraTotal) || 0, precioPromedioVenta: Number(p.precioPromedioVenta) || 0, cantidadVendidaTotal: 0 }))), [datos.items, motos]);
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es-PE");
    return registros.filter((item) => {
      const coincide = !consulta || [item.codigo, item.nombre, item.marca, item.categoria].some((v) => v.toLocaleLowerCase("es-PE").includes(consulta));
      return coincide && (existencia === "todas" || (existencia === "con-stock" ? item.stock > 0 : item.stock <= 0));
    });
  }, [busqueda, existencia, registros]);
  const precioPromedioCompras = useMemo(() => {
    const conCosto = registros.filter((item) => item.precioPromedioCompra > 0 && item.cantidadCompraTotal > 0);
    const cantidad = conCosto.reduce((total, item) => total + item.cantidadCompraTotal, 0);
    return cantidad > 0 ? conCosto.reduce((total, item) => total + item.precioPromedioCompra * item.cantidadCompraTotal, 0) / cantidad : 0;
  }, [registros]);
  const precioVigentes = motos ? registros.filter((item) => item.precioVentaActual != null && item.precioVentaActual > 0 && item.cantidadVendidaTotal > 0) : [];
  const cantidadVentaVigente = precioVigentes.reduce((total, item) => total + item.cantidadVendidaTotal, 0);
  const precioPromedioVentaVigente = cantidadVentaVigente > 0 ? precioVigentes.reduce((total, item) => total + (item.precioVentaActual ?? 0) * item.cantidadVendidaTotal, 0) / cantidadVentaVigente : 0;
  const controles = <>
    <label className="listado-maestro-busqueda">Buscar producto<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Código, nombre o marca" /></label>
    {datos.mototaxis && <label className="listado-maestro-filtro">Inventario<select value={vista} onChange={(e) => setVista(e.target.value as VistaInventario)}><option value="repuestos">Repuestos</option><option value="mototaxis">Mototaxis</option></select></label>}
    <label className="listado-maestro-filtro">Existencia<select value={existencia} onChange={(e) => setExistencia(e.target.value as FiltroExistencia)}><option value="todas">Todos</option><option value="con-stock">Con stock</option><option value="sin-stock">Sin stock</option></select></label>
    <RegistrarAccionPrincipal etiqueta="Descargar inventario en PDF" onClick={alExportar} />
  </>;
  const columnas = motos ? ["Modelo", "Marca", "Existencias", "Costo promedio", "Precio vigente"] : ["Código", "Repuesto", "Marca", "Categoría", "Stock actual", "Precio promedio de compra", "Precio promedio de venta"];
  return <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
    <Indicadores datos={motos ? [
      { titulo: "Modelos activos", valor: numero(motos.resumen.modelos), detalle: "En catálogo" },
      { titulo: "Existencias", valor: numero(motos.resumen.unidades), detalle: "Unidades en almacén" },
      { titulo: "Precio promedio de compras", valor: precioPromedioCompras > 0 ? soles(precioPromedioCompras) : "—" },
      { titulo: "Precio promedio de ventas", valor: precioPromedioVentaVigente > 0 ? soles(precioPromedioVentaVigente) : "—" },
    ] : [
      { titulo: "Repuestos activos", valor: numero(datos.resumen.productos) },
      { titulo: "Con stock", valor: numero(datos.resumen.productosConStock) },
      { titulo: "Sin stock", valor: numero(datos.resumen.sinStock) },
      { titulo: "Precio prom. compras", valor: precioPromedioCompras > 0 ? soles(precioPromedioCompras) : "—" },
    ]} />
    {usarTarjetasMoviles
      ? <ListadoMaestro<FilaInventario> claseRaiz="!h-auto min-h-0 flex-1" variante="tarjetas" titulo="Existencias por modelo de mototaxi"
        registros={visibles} paginacion={{ modo: "local" }} resetKey={`${vista}|${busqueda}|${existencia}|${datos.rango.desde}|${datos.rango.hasta}`}
        controlesCabecera={controles} vacio={busqueda || existencia !== "todas" ? "No hay productos que coincidan con estos filtros." : "No hay productos para mostrar."}
        columnas={1} renderizarTarjeta={(item) => <article key={item.id} className="grid gap-3 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
          <header className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="m-0 break-words text-base font-bold text-[var(--erp-text)]">{item.nombre}</h3><p className="m-0 mt-1 text-sm text-[var(--erp-text-muted)]">{item.marca}</p></div></header>
          <dl className="m-0 grid grid-cols-2 gap-3 border-t border-[var(--erp-border)] pt-3 text-sm"><div><dt className="text-xs text-[var(--erp-text-muted)]">Existencias</dt><dd className="m-0 font-semibold tabular-nums">{numero(item.stock)} unidades</dd></div><div><dt className="text-xs text-[var(--erp-text-muted)]">Costo promedio</dt><dd className="m-0 font-semibold tabular-nums">{item.precioPromedioCompra > 0 ? soles(item.precioPromedioCompra) : "—"}</dd></div><div className="col-span-2"><dt className="text-xs text-[var(--erp-text-muted)]">Precio vigente</dt><dd className="m-0 font-semibold tabular-nums">{item.precioVentaActual != null && item.precioVentaActual > 0 ? soles(item.precioVentaActual) : "Sin precio"}</dd></div></dl>
        </article>} />
      : <ListadoMaestro<FilaInventario> claseRaiz="!h-auto min-h-0 flex-1" variante="tabla" titulo={motos ? "Existencias por modelo de mototaxi" : "Existencias por repuesto"}
        registros={visibles} paginacion={{ modo: "local" }} resetKey={`${vista}|${busqueda}|${existencia}|${datos.rango.desde}|${datos.rango.hasta}`}
        controlesCabecera={controles} vacio={busqueda || existencia !== "todas" ? "No hay productos que coincidan con estos filtros." : "No hay productos para mostrar."}
        encabezadoTabla={<tr>{columnas.map((columna) => <th key={columna}>{columna}</th>)}</tr>}
        renderizarFila={(item) => motos
          ? <tr key={item.id}><td><strong>{item.nombre}</strong></td><td>{item.marca}</td><td>{numero(item.stock)} unidades</td><td>{item.precioPromedioCompra > 0 ? soles(item.precioPromedioCompra) : "—"}</td><td>{item.precioVentaActual != null && item.precioVentaActual > 0 ? soles(item.precioVentaActual) : "Sin precio"}</td></tr>
          : <tr key={item.id}><td><span className="font-mono font-semibold text-[var(--erp-focus)]">{item.codigo}</span></td><td><strong>{item.nombre}</strong></td><td>{item.marca}</td><td>{item.categoria}</td><td>{numero(item.stock)}{item.unidad && ` ${item.unidad}`}</td><td>{item.precioPromedioCompra > 0 ? soles(item.precioPromedioCompra) : "—"}</td><td>{item.precioPromedioVenta > 0 ? soles(item.precioPromedioVenta) : "—"}</td></tr>} />}
  </div>;
}

export function ReportesPage() {
  const alertas = useAlertas();
  const [filtro] = useState<FiltroReporte>(() => ({ desde: primerDiaMes(), hasta: hoy() }));
  const [vistaInventario, setVistaInventario] = useState<VistaInventario>("repuestos");
  const [busqueda, setBusqueda] = useState("");
  const [existencia, setExistencia] = useState<FiltroExistencia>("todas");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError("");
    const solicitud: Promise<Resultado> = servicioReportes.inventario(filtro).then((datos) => ({ tipo: "inventario", datos }));
    void solicitud.then((datos) => { if (vigente) setResultado(datos); })
      .catch((problema: unknown) => {
        if (!vigente) return;
        setResultado(null);
        setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar este reporte."
          : problema instanceof Error ? problema.message : "No se pudo cargar el reporte.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtro]);

  return <section className="flex h-full min-h-0 min-w-0 flex-col gap-3">
    {cargando ? <p role="status">Cargando reporte…</p> : error ? <p role="alert" className="text-[var(--erp-accent)]">{error}</p> : resultado?.tipo === "inventario" && <ResumenInventario datos={resultado.datos} vista={vistaInventario} setVista={setVistaInventario} busqueda={busqueda} setBusqueda={setBusqueda} existencia={existencia} setExistencia={setExistencia}
      alExportar={() => {
        if (!window.confirm("¿Deseas descargar el reporte actual de inventario en PDF?")) return;
        alertas.informacion("Preparando la descarga del PDF…");
        void descargarReporteInventarioPdf(resultado.datos, filtro, vistaInventario)
          .then(() => alertas.exito("El archivo PDF se descargó correctamente."))
          .catch((problema: unknown) => alertas.error(problema instanceof Error ? problema.message : "No se pudo exportar el reporte."));
      }} />}
  </section>;
}
