import { Ban, Wallet } from "lucide-react";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import type { CompraMototaxi } from "../../services/mototaxis.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";
import { documentoDeCompraMototaxi } from "./documento-compra-mototaxi";

const soles = (valor: string | number) => `S/ ${Number(valor || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (valor: string) => valor.slice(0, 10).split("-").reverse().join("/");
const documentos: Record<string, string> = { FACTURA: "Factura", BOLETA: "Boleta", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento" };

// Compras ya registradas: sin chips de estado; la píldora muestra el estado del pago.
const tonos = {
  Pagada: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  "Con saldo": { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  Anulada: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
} as const;

const encabezado = <tr><th>Fecha</th><th>Compra</th><th>Proveedor</th><th>Unidades</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>;

type Props = {
  compras: CompraMototaxi[]; cargando: boolean; busqueda: string;
  alBuscar: (valor: string) => void; alCrear: () => void; alPagar: (compra: CompraMototaxi) => void; alAnular?: (compra: CompraMototaxi) => void;
};

export function ComprasMototaxisListado({ compras, cargando, busqueda, alBuscar, alCrear, alPagar, alAnular }: Props) {
  return <section className={c.page} aria-label="Compras de mototaxis">
    <RegistrarAccionPrincipal onClick={alCrear} etiqueta="Crear compra de mototaxi" />
    <div className={c.toolbar}>
      <label className={`${c.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} placeholder="Buscar por código, proveedor o documento" aria-label="Buscar compras de mototaxis"
          onChange={(evento) => alBuscar(evento.target.value)} />
      </label>
    </div>
    <ListadoMaestro<CompraMototaxi>
      variante="tabla" titulo="Compras de mototaxis" registros={compras} paginacion={{ modo: "local" }} cargando={cargando}
      claseCabecera={c.header} centrarCeldas={false} claseTabla={c.table} claseContenedor={c.tableScroll} resetKey={busqueda}
      vacio={<div className={c.empty}><strong>No hay compras para mostrar</strong><span>{busqueda.trim() ? "Prueba con otra búsqueda." : "Registra la primera compra de mototaxis para sumar unidades al inventario."}</span></div>}
      encabezadoTabla={encabezado}
      renderizarFila={(compra) => {
        const saldo = Number(compra.saldo);
        const estado: keyof typeof tonos = compra.estado === "ANULADA" ? "Anulada" : saldo > 0 ? "Con saldo" : "Pagada";
        const tono = tonos[estado];
        const detalleEstado = estado === "Anulada" ? compra.motivoAnulacion || "Compra anulada" : estado === "Con saldo" ? `Saldo pendiente ${soles(saldo)}` : "Pagada";
        return <tr key={compra.id}>
          <td className="[font-variant-numeric:tabular-nums] text-[#142b42]">{fecha(compra.fecha)}</td>
          <td>
            <strong className={c.documentCode}>{compra.codigo}</strong>
            <small className={c.minorText}>{documentos[compra.documentoTipo] ?? compra.documentoTipo}{compra.documentoNumero ? ` · ${compra.documentoNumero}` : ""}</small>
          </td>
          <td><strong className={c.clientName}>{compra.proveedor?.trim() || "Sin proveedor"}</strong></td>
          <td>{compra.unidades} {compra.unidades === 1 ? "unidad" : "unidades"}</td>
          <td><span className={c.total}>{soles(compra.total)}</span></td>
          <td>
            <span className={`${c.status} ${tono.caja}`} title={detalleEstado}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{estado}</span>
            {estado === "Con saldo" && <small className={c.minorText}>Falta pagar {soles(saldo)}</small>}
          </td>
          <td>
            <div className={c.rowActions}>
              <MenuImpresion codigo={compra.codigo} etiqueta={`Imprimir compra ${compra.codigo}`} tono="neutral" obtener={() => documentoDeCompraMototaxi(compra)} />
              {estado === "Con saldo" && <BotonAccion tono="positiva" etiqueta={`Pagar saldo de ${compra.codigo}`} onClick={() => alPagar(compra)} icono={<Wallet aria-hidden="true" size={16} />} />}
              {alAnular && estado !== "Anulada" && <BotonAccion tono="peligro" etiqueta={`Anular compra ${compra.codigo}`} onClick={() => alAnular(compra)} icono={<Ban aria-hidden="true" size={16} />} />}
            </div>
          </td>
        </tr>;
      }}
    />
  </section>;
}
