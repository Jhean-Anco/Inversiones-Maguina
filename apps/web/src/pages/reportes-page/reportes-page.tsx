import { useEffect, useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { clasesTablaDialogo } from "../../components/inventario/dialogo-catalogo";
import { ErrorApi } from "../../services/api-cliente";
import { servicioReportes, type FiltroReporte, type ReporteIngresos, type ReporteInventario } from "../../services/reportes.service";
import { fechaCorta, hoy, medioPago, numero, primerDiaMes, soles } from "./reportes-formatters";

type TipoReporte = "inventario" | "ingresos";
type VistaInventario = "repuestos" | "mototaxis";
type Resultado = { tipo: "inventario"; datos: ReporteInventario } | { tipo: "ingresos"; datos: ReporteIngresos };

function Indicadores({ datos }: { datos: { titulo: string; valor: string; detalle?: string }[] }) {
  return <dl className="m-0 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-border)] lg:grid-cols-4">
    {datos.map(({ titulo, valor, detalle }) => <div key={titulo} className="bg-[var(--erp-surface-muted)] px-3 py-4 text-center">
      <dt className="text-sm">{titulo}</dt><dd className="m-0 text-xl font-bold tabular-nums text-[var(--erp-focus)]">{valor}</dd>
      {detalle && <dd className="m-0 text-xs">{detalle}</dd>}
    </div>)}
  </dl>;
}

function TablaReporte({ titulo, columnas, filas, vacio }: {
  titulo: string;
  columnas: string[];
  filas: { id: string; celdas: ReactNode[] }[];
  vacio: string;
}) {
  return <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)]">
    <h3 className="m-0 border-s-4 border-[var(--erp-accent)] bg-[var(--erp-brand)] px-4 py-3 text-base font-semibold text-white">{titulo}</h3>
    {filas.length ? <div className="max-h-[38rem] overflow-auto" tabIndex={0} role="region" aria-label={titulo}>
      <table className={`reporte-tabla ${clasesTablaDialogo}`}>
        <thead className="sticky top-0 bg-[var(--erp-surface-muted)]"><tr>{columnas.map((columna) => <th scope="col" key={columna}>{columna}</th>)}</tr></thead>
        <tbody>{filas.map((fila) => <tr key={fila.id}>{fila.celdas.map((celda, indice) => <td key={columnas[indice]}>
          <span className="hidden text-xs font-semibold text-[var(--erp-ink-muted)] mobile-portrait:block" aria-hidden="true">{columnas[indice]}</span>
          {celda}
        </td>)}</tr>)}</tbody>
      </table>
    </div> : <p className="m-0 p-5 text-sm">{vacio}</p>}
  </section>;
}

function ResumenIngresos({ datos }: { datos: ReporteIngresos }) {
  return <div className="grid min-w-0 gap-4">
    <Indicadores datos={[
      { titulo: "Boletas registradas", valor: numero(datos.resumen.ventas) },
      { titulo: "Importe en boletas", valor: soles(datos.resumen.total) },
      { titulo: "Promedio por boleta", valor: soles(datos.resumen.promedio) },
      { titulo: "Notas de venta internas", valor: soles(datos.notasInternas.total), detalle: `${numero(datos.notasInternas.notas)} notas · importe referencial` },
    ]} />
    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <TablaReporte titulo="Boletas por medio de pago" columnas={["Medio", "Boletas", "Importe"]} vacio="No hay boletas en el periodo."
        filas={datos.porMedioPago.map((p) => ({ id: p.medioPago, celdas: [medioPago(p.medioPago), numero(p.ventas), soles(p.total)] }))} />
      <TablaReporte titulo="Importe registrado por artículo" columnas={["Artículo", "Tipo", "Unidades", "Importe"]} vacio="No hay artículos registrados en el periodo."
        filas={datos.productosMasVendidos.map((p) => ({ id: `${p.tipo}-${p.descripcion}`, celdas: [p.descripcion, p.tipo === "PRODUCTO" ? "Repuesto" : p.tipo === "MOTOTAXI" ? "Mototaxi" : "Servicio", numero(p.unidades), soles(p.total)] }))} />
    </div>
    <TablaReporte titulo="Boletas por día" columnas={["Fecha", "Boletas", "Importe"]} vacio="No hay boletas en el periodo."
      filas={datos.porDia.map((p) => ({ id: p.fecha, celdas: [fechaCorta(p.fecha), numero(p.ventas), soles(p.total)] }))} />
  </div>;
}

function ResumenInventario({ datos, vista, alCambiarVista }: { datos: ReporteInventario; vista: VistaInventario; alCambiarVista: (vista: VistaInventario) => void }) {
  const motos = vista === "mototaxis" ? datos.mototaxis : undefined;
  return <div className="grid min-w-0 gap-4">
    {datos.mototaxis && <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de inventario">
      <Button variant={vista === "repuestos" ? "default" : "outline"} aria-pressed={vista === "repuestos"} onClick={() => alCambiarVista("repuestos")}>Repuestos</Button>
      <Button variant={vista === "mototaxis" ? "default" : "outline"} aria-pressed={vista === "mototaxis"} onClick={() => alCambiarVista("mototaxis")}>Mototaxis</Button>
    </div>}
    <Indicadores datos={[
      { titulo: motos ? "Modelos activos" : "Repuestos activos", valor: numero(motos?.resumen.modelos ?? datos.resumen.productos) },
      { titulo: "Con stock", valor: numero(motos?.resumen.modelosConStock ?? datos.resumen.productosConStock) },
      { titulo: "Sin stock", valor: numero(motos?.resumen.sinStock ?? datos.resumen.sinStock) },
      { titulo: "Con movimiento en el periodo", valor: numero(motos?.resumen.modelosConMovimiento ?? datos.resumen.productosConMovimiento) },
    ]} />
    {motos ? <TablaReporte titulo="Existencias por modelo de mototaxi" columnas={["Código", "Modelo", "Marca", "Stock actual", "Entradas", "Salidas"]} vacio="No hay modelos activos."
      filas={motos.items.map((m) => ({ id: m.id, celdas: [m.codigo, m.nombre, m.marca, numero(m.stockActual), numero(m.entradasPeriodo), numero(m.salidasPeriodo)] }))} />
      : <TablaReporte titulo="Existencias por repuesto" columnas={["Código", "Repuesto", "Marca", "Categoría", "Stock actual", "Entradas", "Salidas"]} vacio="No hay repuestos activos."
        filas={datos.items.map((p) => ({ id: p.id, celdas: [p.codigo, p.nombre, p.marca, p.categoria || "—", `${numero(p.stockActual)} ${p.unidad}`, `${numero(p.entradasPeriodo)} ${p.unidad}`, `${numero(p.salidasPeriodo)} ${p.unidad}`] }))} />}
  </div>;
}

export function ReportesPage({ tipo }: { tipo: TipoReporte }) {
  const [rango, setRango] = useState<FiltroReporte>(() => ({ desde: primerDiaMes(), hasta: hoy() }));
  const [filtro, setFiltro] = useState(rango);
  const [vistaInventario, setVistaInventario] = useState<VistaInventario>("repuestos");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setCargando(true); setError("");
    const solicitud: Promise<Resultado> = tipo === "ingresos"
      ? servicioReportes.ingresos(filtro).then((datos) => ({ tipo, datos }))
      : servicioReportes.inventario(filtro).then((datos) => ({ tipo, datos }));
    void solicitud.then((datos) => { if (vigente) setResultado(datos); })
      .catch((problema: unknown) => {
        if (!vigente) return;
        setResultado(null);
        setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar este reporte."
          : problema instanceof Error ? problema.message : "No se pudo cargar el reporte.");
      })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [filtro, tipo]);

  return <section className="grid min-w-0 gap-4">
    <form className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4 [&_input]:rounded-md [&_input]:border [&_input]:border-[var(--erp-border)] [&_input]:bg-[var(--erp-surface)] [&_input]:px-2 [&_input]:py-1.5 [&_label]:grid [&_label]:gap-1 [&_label]:text-sm"
      onSubmit={(e) => { e.preventDefault(); setFiltro({ ...rango }); }}>
      <label>Desde<input type="date" value={rango.desde} max={rango.hasta} onChange={(e) => setRango({ ...rango, desde: e.target.value })} required /></label>
      <label>Hasta<input type="date" value={rango.hasta} min={rango.desde} max={hoy()} onChange={(e) => setRango({ ...rango, hasta: e.target.value })} required /></label>
      <Button type="submit" disabled={cargando}>Consultar</Button>
    </form>
    {cargando ? <p role="status">Cargando reporte…</p> : error ? <p role="alert" className="text-[var(--erp-accent)]">{error}</p> : resultado?.tipo === tipo && <>
      <p className="m-0 text-sm">Periodo del {fechaCorta(filtro.desde)} al {fechaCorta(filtro.hasta)}</p>
      {resultado.tipo === "inventario" ? <ResumenInventario datos={resultado.datos} vista={vistaInventario} alCambiarVista={setVistaInventario} /> : <ResumenIngresos datos={resultado.datos} />}
    </>}
  </section>;
}
