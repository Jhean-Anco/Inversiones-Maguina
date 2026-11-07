import "./movimientos-stock-page.css";
import { useEffect } from "react";
import { CatalogoListado } from "../../components/catalogo/catalogo-listado/catalogo-listado";
import { AjusteStockFormulario } from "../../components/inventario/ajuste-stock-formulario/ajuste-stock-formulario";
import { useMovimientosStock } from "../../hooks/use-movimientos-stock";
import type { MovimientoStock } from "../../services/inventario/movimientos-stock.service";

const numero = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });
const motivoVisible = (codigo: string | null) => ({ INVENTARIO_FISICO: "Conteo de inventario", MERMA: "Merma", DANIO: "Repuesto dañado", PERDIDA: "Pérdida", DEVOLUCION: "Devolución", CORRECCION: "Corrección de registro", OTRO: "Otro motivo" }[codigo ?? ""] ?? codigo ?? "—");

function fuenteMovimiento(movimiento: MovimientoStock) {
  if (movimiento.origenTipo === "ENTRADA_STOCK") return movimiento.documentoOrigen ? `Entrada ${movimiento.documentoOrigen}` : "Entrada de stock";
  if (movimiento.origenTipo === "AJUSTE_STOCK") return "Ajuste manual";
  return movimiento.documentoOrigen ?? movimiento.origenTipo;
}

const encabezadoMovimientos = <tr><th>Fecha y hora</th><th>Repuesto</th><th>Tipo</th><th>Variación</th><th>Motivo u origen</th><th>Observación</th></tr>;
function filaMovimiento(movimiento: MovimientoStock) {
  const aumento = movimiento.tipo === "ENTRADA" || (movimiento.tipo === "AJUSTE" && movimiento.sentido === "INGRESO");
  const tipo = movimiento.tipo === "AJUSTE" ? `Ajuste · ${aumento ? "aumento" : "disminución"}` : movimiento.tipo === "ENTRADA" ? "Entrada" : "Salida";
  return <tr key={movimiento.id}>
          <td><time dateTime={movimiento.creadoEn}>{fechaHora.format(new Date(movimiento.creadoEn))}</time></td>
          <td><span className="stock-movement-table-product"><small>{movimiento.codigo}</small><strong>{movimiento.producto}</strong></span></td>
          <td><span className={`stock-movement-badge${aumento ? " is-increase" : " is-decrease"}`}>{tipo}</span></td>
          <td><strong className={aumento ? "is-increase" : "is-decrease"}>{aumento ? "+" : "−"}{numero.format(Number(movimiento.cantidadBase))} {movimiento.unidad}</strong></td>
          <td>{movimiento.motivo ? motivoVisible(movimiento.motivo) : fuenteMovimiento(movimiento)}</td>
          <td>{movimiento.observacion || "—"}</td>
        </tr>;
}

export function MovimientosStockPage() {
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
    <CatalogoListado
      titulo="Movimientos y ajustes"
      descripcion="Consulta las variaciones de stock y registra correcciones con motivo y trazabilidad."
      etiquetaCrear="Crear ajuste de stock"
      tituloListado="Historial de movimientos"
      registros={modulo.movimientos}
      totalRegistros={modulo.total}
      cargando={modulo.cargando}
      mensajeCarga="Cargando movimientos…"
      error={modulo.modalAbierto ? "" : modulo.error}
      iconoVacio="↕"
      tituloVacio="Aún no hay movimientos"
      descripcionVacio="Las compras registradas y los ajustes que registres aparecerán aquí."
      pagina={modulo.pagina}
      porPagina={modulo.porPagina}
      totalPaginas={modulo.totalPaginas}
      desde={modulo.desde}
      hasta={modulo.hasta}
      busqueda={modulo.busqueda}
      busquedaPlaceholder="Buscar repuesto, código o motivo"
      busquedaAriaLabel="Buscar movimientos de stock"
      controlesFiltro={<select className="catalog-filter-select" value={modulo.tipo} onChange={(evento) => modulo.filtrarTipo(evento.target.value)} aria-label="Filtrar por tipo de movimiento"><option value="">Todos los movimientos</option><option value="ENTRADA">Entradas</option><option value="SALIDA">Salidas</option><option value="AJUSTE">Ajustes</option></select>}
      alBuscar={(valor) => { modulo.setBusqueda(valor); modulo.cambiarPagina(1); }}
      alCrear={modulo.abrirNuevo}
      alCambiarPagina={modulo.cambiarPagina}
      alCambiarTamanioPagina={modulo.cambiarPorPagina}
      variante="tabla"
      encabezadoTabla={encabezadoMovimientos}
      renderizarFila={filaMovimiento}
      claseTabla="stock-movement-table"
      claseContenedorTabla="stock-movement-table-wrap"
    />
    {modulo.modalAbierto && <AjusteStockFormulario {...modulo} />}
  </>;
}
