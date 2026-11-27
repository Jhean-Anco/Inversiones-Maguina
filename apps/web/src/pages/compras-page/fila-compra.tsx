import type { EntradaStock } from "../../services/inventario/entradas-stock.service";
import { Etiqueta } from "../../components/ui/etiqueta";
import {
  egresosRowButtonClasses,
  egresosTableNumberClasses,
} from "../../styles/egresos-tabla-classes";
import { anchoMinimoColumnaRelacionClasses, nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

const soles = (valor: string | number) =>
  `S/ ${Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const documentosCompra: Record<string, string> = {
  FACTURA: "Factura",
  BOLETA: "Boleta",
  GUIA_REMISION: "Guía de remisión",
  NOTA: "Nota",
  SIN_DOCUMENTO: "Sin documento",
  OTRO: "Otro",
};

export function FilaCompra({ entrada, alAbrir }: { entrada: EntradaStock; alAbrir: (id: string) => void }) {
  const total = Number(entrada.totalDocumento ?? entrada.total);
  const pagado = entrada.montoPagado == null ? null : Number(entrada.montoPagado);
  const saldo = pagado == null ? null : Math.max(0, total - pagado);

  return (
    <tr>
      <td>{new Date(`${entrada.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}</td>
      <td><strong>{entrada.codigo}</strong><small>{documentosCompra[entrada.tipoDocumento] ?? entrada.tipoDocumento} · {entrada.numeroDocumento || "Registro interno"}</small></td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}>
        <strong className={nombreRelacionListadoClasses}>{entrada.proveedor || "No especificado"}</strong>
        {entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento && <small>{entrada.proveedorTipoDocumento} · {entrada.proveedorNumeroDocumento}</small>}
      </td>
      <td>{entrada.cantidadProductos ?? 0} {(entrada.cantidadProductos ?? 0) === 1 ? "producto" : "productos"}</td>
      <td>
        {entrada.medioPago || "Sin registrar"}
        <small>{pagado == null ? "Pago no registrado" : saldo === 0 ? "Pagada" : `Pagado ${soles(pagado)}`}</small>
      </td>
      <td className={egresosTableNumberClasses}><strong>{soles(total)}</strong></td>
      <td>
        {entrada.estado === "ANULADA" ? <Etiqueta tono="neutral">Anulada</Etiqueta> : <Etiqueta tono={saldo === null ? "neutral" : saldo > 0 ? "advertencia" : "positiva"}>
          {saldo === null ? "Sin pago" : saldo > 0 ? `Saldo ${soles(saldo)}` : "Pagada"}
        </Etiqueta>}
      </td>
      <td><button className={egresosRowButtonClasses} type="button" onClick={() => alAbrir(entrada.id)}>Ver detalle</button></td>
    </tr>
  );
}
