import "./reportes-page.css";
import { useEffect, useState } from "react";
import { ErrorApi } from "../../services/api-cliente";
import { servicioReportes, type FiltroReporte, type ReporteIngresos, type ReporteInventario } from "../../services/reportes.service";

type TipoReporte = "inventario" | "ingresos";
const hoy = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
const primerDiaMes = () => hoy().slice(0, 8) + "01";
const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor) || 0);
const numero = (valor: string | number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);
const fechaCorta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE");
const medioPago = (valor: string) => ({ EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", BILLETERA_DIGITAL: "Billetera digital", OTRO: "Otro" }[valor] ?? valor);

export function ReportesPage({ tipo }: { tipo: TipoReporte }) {
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [ingresos, setIngresos] = useState<ReporteIngresos | null>(null);
  const [inventario, setInventario] = useState<ReporteInventario | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError("");
    const filtro: FiltroReporte = { desde, hasta };
    const solicitud = tipo === "ingresos" ? servicioReportes.ingresos(filtro) : servicioReportes.inventario(filtro);
    void solicitud.then((resultado) => {
      if (!vigente) return;
      if (tipo === "ingresos") setIngresos(resultado as ReporteIngresos);
      else setInventario(resultado as ReporteInventario);
    }).catch((problema: unknown) => {
      if (vigente) setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar este reporte." : problema instanceof Error ? problema.message : "No se pudo cargar el reporte.");
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [desde, hasta, tipo]);

  return <section className="report-page">
    <div className="report-filters">
      <label>Desde<input type="date" value={desde} max={hasta} onChange={(evento) => setDesde(evento.target.value)} required /></label>
      <label>Hasta<input type="date" value={hasta} min={desde} max={hoy()} onChange={(evento) => setHasta(evento.target.value)} required /></label>
      <span>Periodo {fechaCorta(desde)} – {fechaCorta(hasta)}</span>
    </div>
    {error && <div className="venta-alert" role="alert">{error}</div>}
    {cargando ? <div className="emisor-loading">Cargando reporte…</div> : tipo === "ingresos" ? <>
      {ingresos && <>
        <div className="report-kpis">
          <article><span>Ventas registradas</span><strong>{numero(ingresos.resumen.ventas)}</strong></article>
          <article><span>Ingresos totales</span><strong>{soles(ingresos.resumen.total)}</strong></article>
          <article><span>Promedio por venta</span><strong>{soles(ingresos.resumen.promedio)}</strong></article>
          <article><span>Valor referencial en notas internas</span><strong>{soles(ingresos.notasInternas.total)}</strong><small>{numero(ingresos.notasInternas.notas)} notas; no son ingresos por boleta</small></article>
        </div>
        <div className="report-panels">
          <article className="report-panel"><h2>Ingresos por medio de pago</h2>{ingresos.porMedioPago.length ? <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Medio</th><th>Ventas</th><th>Total</th></tr></thead><tbody>{ingresos.porMedioPago.map((item) => <tr key={item.medioPago}><td>{medioPago(item.medioPago)}</td><td>{numero(item.ventas)}</td><td>{soles(item.total)}</td></tr>)}</tbody></table></div> : <p className="report-empty">No hay ventas en este periodo.</p>}</article>
          <article className="report-panel"><h2>Mayores ingresos por artículo</h2>{ingresos.productosMasVendidos.length ? <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Descripción</th><th>Tipo</th><th>Unidades</th><th>Total</th></tr></thead><tbody>{ingresos.productosMasVendidos.map((item) => <tr key={item.tipo + "-" + item.descripcion}><td>{item.descripcion}</td><td>{item.tipo === "PRODUCTO" ? "Repuesto" : item.tipo === "MOTOTAXI" ? "Mototaxi" : "Servicio"}</td><td>{numero(item.unidades)}</td><td>{soles(item.total)}</td></tr>)}</tbody></table></div> : <p className="report-empty">No hay artículos vendidos en este periodo.</p>}</article>
        </div>
        <article className="report-panel"><h2>Resumen diario</h2>{ingresos.porDia.length ? <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Fecha</th><th>Ventas</th><th>Total</th></tr></thead><tbody>{ingresos.porDia.map((item) => <tr key={item.fecha}><td>{fechaCorta(item.fecha)}</td><td>{numero(item.ventas)}</td><td>{soles(item.total)}</td></tr>)}</tbody></table></div> : <p className="report-empty">No hay ventas registradas en este periodo.</p>}</article>
      </>}
    </> : <>
      {inventario && <>
        <div className="report-kpis">
          <article><span>Productos activos</span><strong>{numero(inventario.resumen.productos)}</strong></article>
          <article><span>Productos con stock</span><strong>{numero(inventario.resumen.productosConStock)}</strong></article>
          <article><span>Productos sin stock</span><strong>{numero(inventario.resumen.sinStock)}</strong></article>
          <article><span>Productos con movimiento</span><strong>{numero(inventario.resumen.productosConMovimiento)}</strong></article>
        </div>
        <article className="report-panel"><h2>Existencias por producto</h2>{inventario.items.length ? <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Código</th><th>Producto</th><th>Marca</th><th>Categoría</th><th>Stock actual</th><th>Entradas del periodo</th><th>Salidas del periodo</th></tr></thead><tbody>{inventario.items.map((item) => <tr key={item.id}><td>{item.codigo}</td><td>{item.nombre}</td><td>{item.marca}</td><td>{item.categoria || "—"}</td><td><strong className={Number(item.stockActual) <= 0 ? "report-stock-empty" : ""}>{numero(item.stockActual)} {item.unidad}</strong></td><td>{numero(item.entradasPeriodo)} {item.unidad}</td><td>{numero(item.salidasPeriodo)} {item.unidad}</td></tr>)}</tbody></table></div> : <p className="report-empty">No hay productos activos en el inventario.</p>}</article>
      </>}
    </>}
  </section>;
}
