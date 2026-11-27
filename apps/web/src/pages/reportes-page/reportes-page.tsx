import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { BotonDescargarPdf } from "./boton-descargar-pdf";
import { ErrorApi } from "../../services/api-cliente";
import { servicioReportes, type FiltroReporte, type ReporteInventario } from "../../services/reportes.service";
import { hoy, numero, primerDiaMes, soles } from "./reportes-formatters";
import { descargarReporteInventarioPdf } from "./inventario-pdf";
import { reportesClasses as r } from "./reportes-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

type VistaInventario = "repuestos" | "mototaxis";
type Resultado = { tipo: "inventario"; datos: ReporteInventario };
type FiltroExistencia = "todas" | "con-stock" | "sin-stock";
type FilaInventario = { id: string; codigo: string; nombre: string; marca: string; categoria: string; unidad: string; stock: number; precioPromedioCompra: number; cantidadCompraTotal: number; precioPromedioVenta: number; cantidadVendidaTotal: number; precioVentaActual?: number | null };


function Indicadores({ datos }: { datos: { titulo: string; valor: string; detalle?: string }[] }) {
  return <dl className={r.kpis}>
    {datos.map(({ titulo, valor, detalle }) => <div key={titulo}><dt>{titulo}</dt><dd>{valor}</dd>{detalle && <small>{detalle}</small>}</div>)}
  </dl>;
}

function ResumenInventario({ datos, vista, setVista, busqueda, setBusqueda, existencia, setExistencia, alExportar }: {
  datos: ReporteInventario; vista: VistaInventario; setVista: (vista: VistaInventario) => void;
  busqueda: string; setBusqueda: (busqueda: string) => void; existencia: FiltroExistencia;
  setExistencia: (existencia: FiltroExistencia) => void; alExportar: () => void;
}) {
  const motos = vista === "mototaxis" ? datos.mototaxis : undefined;
  const registros = useMemo<FilaInventario[]>(() => (motos
    ? motos.items.map((m) => ({ id: m.id, codigo: m.codigo, nombre: m.nombre, marca: m.marca, categoria: "Mototaxi", unidad: "", stock: m.stockActual, precioPromedioCompra: Number(m.precioPromedioCompra) || 0, cantidadCompraTotal: Number(m.cantidadCompraTotal) || 0, precioPromedioVenta: Number(m.precioPromedioVenta) || 0, cantidadVendidaTotal: Number(m.cantidadVendidaTotal) || 0, precioVentaActual: m.precioVentaActual == null ? null : Number(m.precioVentaActual) || 0 }))
    : datos.items.map((p) => ({ id: p.id, codigo: p.codigo, nombre: p.nombre, marca: p.marca, categoria: p.categoria || "Sin categoría", unidad: p.unidad, stock: Number(p.stockActual) || 0, precioPromedioCompra: Number(p.precioPromedioCompra) || 0, cantidadCompraTotal: Number(p.cantidadCompraTotal) || 0, precioPromedioVenta: Number(p.precioPromedioVenta) || 0, cantidadVendidaTotal: 0 }))), [datos.items, motos]);
  const conteos = useMemo(() => ({ todas: registros.length, conStock: registros.filter((i) => i.stock > 0).length, sinStock: registros.filter((i) => i.stock <= 0).length }), [registros]);
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
  const columnas = motos ? ["Modelo", "Marca", "Existencias", "Costo promedio", "Precio vigente"] : ["Código", "Repuesto", "Marca", "Categoría", "Stock actual", "Precio promedio de compra", "Precio promedio de venta"];
  const existencias = (item: FilaInventario) => <span className={`${r.stock} ${item.stock > 0 ? r.conStock : r.sinStock}`}>
    <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${item.stock > 0 ? "bg-[#1b5e40]" : "bg-[#8a9bab]"}`} />
    {numero(item.stock)}{motos ? " unidades" : item.unidad && ` ${item.unidad}`}
  </span>;
  return <div className={v.page}>
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
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código, nombre o marca" aria-label="Buscar producto" />
      </label>
      <label className={v.selectField}><select aria-label="Existencias" value={existencia} onChange={(e) => setExistencia(e.target.value as FiltroExistencia)}>
        <option value="todas">Todas las existencias ({conteos.todas})</option><option value="con-stock">Con stock ({conteos.conStock})</option><option value="sin-stock">Sin stock ({conteos.sinStock})</option>
      </select><ChevronDown aria-hidden="true" /></label>
      {datos.mototaxis && <div className={v.filters} role="group" aria-label="Inventario">
        {([["repuestos", "Repuestos", datos.items.length], ["mototaxis", "Mototaxis", datos.mototaxis.items.length]] as const).map(([valor, etiqueta, cantidad]) =>
          <button key={valor} type="button" className={v.chip} aria-pressed={vista === valor} onClick={() => setVista(valor)}>{etiqueta}<span className={v.chipCount}>{cantidad}</span></button>)}
      </div>}
      <BotonDescargarPdf onClick={alExportar} />
    </div>
    <ListadoMaestro<FilaInventario> variante="tabla" titulo={motos ? "Existencias por modelo de mototaxi" : "Existencias por repuesto"}
      registros={visibles} paginacion={{ modo: "local" }} resetKey={`${vista}|${busqueda}|${existencia}|${datos.rango.desde}|${datos.rango.hasta}`}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      vacio={<div className={v.empty}><strong>No hay productos para mostrar</strong><span>{busqueda || existencia !== "todas" ? "Prueba con otra búsqueda o filtro de existencias." : "Aún no hay productos en el inventario."}</span></div>}
      encabezadoTabla={<tr>{columnas.map((columna) => <th key={columna}>{columna}</th>)}</tr>}
      renderizarFila={(item) => motos
        ? <tr key={item.id}><td><strong className="text-[#142b42]">{item.nombre}</strong></td><td>{item.marca}</td><td>{existencias(item)}</td><td className="tabular-nums">{item.precioPromedioCompra > 0 ? soles(item.precioPromedioCompra) : "—"}</td><td className={v.total}>{item.precioVentaActual != null && item.precioVentaActual > 0 ? soles(item.precioVentaActual) : "Sin precio"}</td></tr>
        : <tr key={item.id}><td><span className={v.documentCode}>{item.codigo}</span></td><td><strong className="text-[#142b42]">{item.nombre}</strong></td><td>{item.marca}</td><td>{item.categoria}</td><td>{existencias(item)}</td><td className="tabular-nums">{item.precioPromedioCompra > 0 ? soles(item.precioPromedioCompra) : "—"}</td><td className={v.total}>{item.precioPromedioVenta > 0 ? soles(item.precioPromedioVenta) : "—"}</td></tr>} />
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

  return <section className={v.page}>
    {cargando ? <p role="status" className={r.mensaje}>Cargando reporte…</p> : error ? <p role="alert" className={`${r.mensaje} ${r.mensajeError}`}>{error}</p> : resultado?.tipo === "inventario" && <ResumenInventario datos={resultado.datos} vista={vistaInventario} setVista={setVistaInventario} busqueda={busqueda} setBusqueda={setBusqueda} existencia={existencia} setExistencia={setExistencia}
      alExportar={() => {
        if (!window.confirm("¿Deseas descargar el reporte actual de inventario en PDF?")) return;
        void descargarReporteInventarioPdf(resultado.datos, filtro, vistaInventario)
          .catch((problema: unknown) => alertas.error(problema instanceof Error ? problema.message : "No se pudo exportar el reporte."));
      }} />}
  </section>;
}
