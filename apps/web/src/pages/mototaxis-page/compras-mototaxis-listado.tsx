
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { Etiqueta } from "../../components/ui/etiqueta";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { anchoMinimoColumnaRelacionClasses, nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";
import type { CompraMototaxi } from "../../services/mototaxis.service";
import { egresosPrimaryRowButtonClasses, egresosRowCompleteClasses, egresosTableClasses, egresosTableNumberClasses, egresosTableScrollClasses } from "../../styles/egresos-tabla-classes";

import { documentoDeCompraMototaxi } from "./documento-compra-mototaxi";

const soles = (valor: string) => `S/ ${Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const documentos = { FACTURA: "Factura", BOLETA: "Boleta", NOTA: "Nota", OTRO: "Otro documento", SIN_DOCUMENTO: "Sin documento" };

export function ComprasMototaxisListado({
  compras, cargando, busqueda, filtroPago, alBuscar, alFiltrarPago, alCrear, alPagar, alAnular,
}: {
  compras: CompraMototaxi[]; cargando: boolean; busqueda: string; filtroPago: string;
  alBuscar: (valor: string) => void; alFiltrarPago: (valor: string) => void;
  alCrear: () => void; alPagar: (compra: CompraMototaxi) => void; alAnular?: (compra: CompraMototaxi) => void;
}) {
  return <section className="catalog-content" aria-label="Compras de mototaxis">
    <RegistrarAccionPrincipal onClick={alCrear} etiqueta="Crear compra de mototaxi" />
    <ListadoMaestro
      variante="tabla" titulo="Compras registradas" registros={compras} paginacion={{ modo: "local" }}
      cargando={cargando} claseTabla={egresosTableClasses} claseContenedor={egresosTableScrollClasses}
      claseCabecera="compra-listado-cabecera"
      controlesCabecera={<>
        <input className="catalog-search-input listado-maestro-busqueda" type="search" value={busqueda} onChange={(evento) => alBuscar(evento.target.value)}
          placeholder="Buscar por código, proveedor o documento" aria-label="Buscar compras de mototaxis" />
        <label className="listado-maestro-filtro">Pago
          <select aria-label="Filtrar compras por estado de pago" value={filtroPago} onChange={(evento) => alFiltrarPago(evento.target.value)}>
            <option value="TODOS">Todos</option><option value="PENDIENTES">Con saldo pendiente</option><option value="PAGADAS">Pagadas</option><option value="ANULADAS">Anuladas</option>
          </select>
        </label>
      </>}
      resetKey={`${busqueda}|${filtroPago}`}
      vacio={busqueda.trim() || filtroPago !== "TODOS" ? "No se encontraron compras con esos criterios." : <>
        <strong>Aún no hay compras de mototaxis</strong><span>Las compras registradas aparecerán aquí con sus unidades, documentos y pagos.</span>
      </>}
      encabezadoTabla={<tr><th>Fecha</th><th>Compra y documento</th><th>Proveedor</th><th>Unidades</th><th className={egresosTableNumberClasses}>Total</th><th className={egresosTableNumberClasses}>Pagado</th><th>Estado de pago</th><th>Acciones</th></tr>}
      renderizarFila={(compra) => {
        const anulada = compra.estado === "ANULADA";
        const saldoPendiente = !anulada && Number(compra.saldo) > 0;
        const documento = documentos[compra.documentoTipo as keyof typeof documentos] ?? compra.documentoTipo;
        return <tr key={compra.id}>
          <td className="whitespace-nowrap">{new Date(`${compra.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</td>
          <td><strong>{compra.codigo}</strong><small>{documento}{compra.documentoNumero && ` · ${compra.documentoNumero}`}</small></td>
          <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}><strong className={nombreRelacionListadoClasses}>{compra.proveedor}</strong></td>
          <td>{compra.unidades} {compra.unidades === 1 ? "unidad" : "unidades"}</td>
          <td className={egresosTableNumberClasses}><strong>{soles(compra.total)}</strong></td>
          <td className={egresosTableNumberClasses}>{soles(compra.pagado)}</td>
          <td><Etiqueta tono={anulada ? "neutral" : saldoPendiente ? "advertencia" : "positiva"}>{anulada ? "Anulada" : saldoPendiente ? `Saldo ${soles(compra.saldo)}` : "Pagada"}</Etiqueta></td>
          <td><div className="flex items-center gap-2"><MenuImpresion codigo={compra.codigo} etiqueta={`Imprimir compra ${compra.codigo}`} tono="neutral" obtener={() => documentoDeCompraMototaxi(compra)} />{saldoPendiente ? <button className={egresosPrimaryRowButtonClasses} type="button" onClick={() => alPagar(compra)}>Cancelar saldo completo</button>
            : <span className={egresosRowCompleteClasses}>{anulada ? compra.motivoAnulacion : "Pagada al contado"}</span>}{alAnular && !anulada && <button className="erp-btn erp-btn--secondary" type="button" onClick={() => alAnular(compra)}>Anular compra</button>}</div></td>
        </tr>;
      }}
    />
  </section>;
}
