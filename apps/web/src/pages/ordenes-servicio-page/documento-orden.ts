import { documentoInterno, emisorParaImpresion } from "../../impresion/documentos-internos";
import { fechaCorta } from "../../impresion/formato";
import type { DocumentoImprimible } from "../../impresion/tipos";
import type { OrdenServicio } from "../../services/ingresos.service";
import { importesOrden } from "./importes-orden";
import type { LineaOrden } from "./types";

/** Documento imprimible (A4 o ticket) de una orden de servicio, armado con los datos ya cargados en el listado. */
export async function documentoDeOrden(orden: OrdenServicio): Promise<DocumentoImprimible> {
  const detalles = orden.detalles as LineaOrden[];
  const importes = importesOrden(detalles);
  const adelanto = Number(orden.adelanto);
  return documentoInterno({
    tipo: "ORDEN_SERVICIO", titulo: "ORDEN DE SERVICIO", codigo: orden.codigo, fecha: orden.fechaRecepcion, contraparte: orden.clienteNombre?.trim() || "Clientes varios",
    datosExtra: [
      { etiqueta: "Vehículo", valor: orden.vehiculoPlaca },
      ...(orden.condicionRecepcion ? [{ etiqueta: "Condición de recepción", valor: orden.condicionRecepcion }] : []),
      ...(orden.fechaAcabado ? [{ etiqueta: "Entrega estimada", valor: fechaCorta(orden.fechaAcabado.slice(0, 10)) }] : []),
      { etiqueta: "Motivo", valor: orden.motivo },
    ].filter((dato) => dato.valor),
    lineas: detalles.map((linea) => {
      const cantidad = Number(linea.cantidad ?? 1);
      const precio = Number(linea.precioUnitario ?? 0);
      const descuento = Number(linea.descuento ?? 0);
      return { descripcion: linea.nombreVisible || linea.descripcion || "Servicio", cantidad, precioUnitario: precio, descuento, total: Math.max(0, cantidad * precio - descuento) };
    }),
    // Sin desglose de IGV: la orden solo muestra el total.
    importes: { total: importes.total },
    adelanto: adelanto > 0 ? { monto: adelanto, saldo: Math.max(0, Math.round((importes.total - adelanto) * 100) / 100) } : null,
    leyenda: "",
    emisor: await emisorParaImpresion(),
  });
}
