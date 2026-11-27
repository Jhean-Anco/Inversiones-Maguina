import { Ban, Pencil } from "lucide-react";
import { documentoDeCompra } from "../../components/inventario/entrada-stock-detalle/documento-compra";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { BotonAccion } from "../../components/ui/boton-accion";
import { servicioEntradasStock, type EntradaStock } from "../../services/inventario/entradas-stock.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";

const soles = (valor: number) => `S/ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fecha = (valor: string) => valor.slice(0, 10).split("-").reverse().join("/");

const documentosCompra: Record<string, string> = {
  FACTURA: "Factura", BOLETA: "Boleta", GUIA_REMISION: "Guía de remisión", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento", OTRO: "Otro",
};

// Compras ya registradas: sin chips de estado; la píldora muestra el estado del pago.
const tonos = {
  Pagada: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  "Con saldo": { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  Anulada: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
} as const;

type Props = { entrada: EntradaStock; alEditar?: (entrada: EntradaStock) => void; alAnular?: (entrada: EntradaStock) => void; editando?: boolean };

export function FilaCompra({ entrada, alEditar, alAnular, editando = false }: Props) {
  const total = Number(entrada.totalDocumento ?? entrada.total);
  const pagado = entrada.montoPagado == null ? 0 : Number(entrada.montoPagado);
  const saldo = Math.max(0, total - pagado);
  const estado: keyof typeof tonos = entrada.estado === "ANULADA" ? "Anulada" : saldo > 0 ? "Con saldo" : "Pagada";
  const tono = tonos[estado];
  const detalleEstado = estado === "Anulada" ? entrada.motivoAnulacion || "Compra anulada" : estado === "Con saldo" ? `Saldo pendiente ${soles(saldo)}` : `Pagada${entrada.medioPago ? ` · ${entrada.medioPago}` : ""}`;
  const cantidad = entrada.cantidadProductos ?? 0;

  return (
    <tr>
      <td className="[font-variant-numeric:tabular-nums] text-[#142b42]">{fecha(entrada.fecha)}</td>
      <td>
        <strong className={c.documentCode}>{entrada.codigo}</strong>
        <small className={c.minorText}>{documentosCompra[entrada.tipoDocumento] ?? entrada.tipoDocumento}{entrada.numeroDocumento ? ` · ${entrada.numeroDocumento}` : ""}</small>
      </td>
      <td>
        <strong className={c.clientName}>{entrada.proveedor?.trim() || "Sin proveedor"}</strong>
        {entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento && <small className={c.minorText}>{entrada.proveedorTipoDocumento} · {entrada.proveedorNumeroDocumento}</small>}
      </td>
      <td>{cantidad} {cantidad === 1 ? "repuesto" : "repuestos"}</td>
      <td><span className={c.total}>{soles(total)}</span></td>
      <td>
        <span className={`${c.status} ${tono.caja}`} title={detalleEstado}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{estado}</span>
        {estado === "Con saldo" && <small className={c.minorText}>Falta pagar {soles(saldo)}</small>}
      </td>
      <td>
        <div className={c.rowActions}>
          <MenuImpresion codigo={entrada.codigo} etiqueta={`Imprimir compra ${entrada.codigo}`} tono="neutral" obtener={() => servicioEntradasStock.consultar(entrada.id).then(documentoDeCompra)} />
          {alEditar && estado !== "Anulada" && <BotonAccion tono="informativa" etiqueta={editando ? `Abriendo ${entrada.codigo}…` : `Editar compra ${entrada.codigo}`} disabled={editando} onClick={() => alEditar(entrada)} icono={<Pencil aria-hidden="true" size={16} />} />}
          {alAnular && estado !== "Anulada" && <BotonAccion tono="peligro" etiqueta={`Anular compra ${entrada.codigo}`} onClick={() => alAnular(entrada)} icono={<Ban aria-hidden="true" size={16} />} />}
        </div>
      </td>
    </tr>
  );
}
