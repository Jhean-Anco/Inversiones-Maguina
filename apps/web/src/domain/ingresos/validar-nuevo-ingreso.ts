import { precioRepuestoEnLinea } from "./importes-venta";
import type { EstadoNubefact, LineaIngreso } from "../../services/ingresos.service";
import type { LineaCarrito, TipoVenta } from "../../types/nuevo-ingreso";

type ValidarNuevoIngresoInput = {
  tipoVenta: TipoVenta;
  tipoComprobante: "BOLETA" | "FACTURA" | "NOTA_VENTA";
  estadoNubefact: EstadoNubefact | null;
  fecha: string;
  hoy: string;
  clienteSeleccionado: boolean;
  camposNubefact: Record<string, string | number | boolean | null>;
  total: number;
  ordenServicioId: string | null;
  lineas: LineaCarrito[];
};

type ResultadoValidacion =
  | { valida: true; detalles: LineaIngreso[]; tipoDocInterno?: string }
  | { valida: false; error: string };

const redondear = (monto: number) => Math.round((monto + Number.EPSILON) * 100) / 100;

export function validarNuevoIngreso({ tipoVenta, tipoComprobante, estadoNubefact, fecha, hoy, clienteSeleccionado, camposNubefact, total, ordenServicioId, lineas }: ValidarNuevoIngresoInput): ResultadoValidacion {
  if (tipoComprobante === "FACTURA" && !estadoNubefact?.emisionFacturaHabilitada) {
    return { valida: false, error: "Completa las credenciales y la serie de factura de NubeFact." };
  }

  const diasAntiguedadComprobante = Math.floor((Date.parse(`${hoy}T00:00:00.000Z`) - Date.parse(`${fecha}T00:00:00.000Z`)) / 86_400_000);
  const limiteDiasRetroactivo = tipoComprobante === "FACTURA" ? 3 : 5;
  if (tipoComprobante !== "NOTA_VENTA" && diasAntiguedadComprobante > limiteDiasRetroactivo) {
    return { valida: false, error: `La fecha supera el plazo de envío de ${tipoComprobante === "FACTURA" ? "3 días para facturas" : "5 días para boletas enviadas individualmente por OSE"}.` };
  }

  const tipoDocumentoCliente = String(camposNubefact.cliente_tipo_de_documento ?? "");
  const numeroDocumentoCliente = String(camposNubefact.cliente_numero_de_documento ?? "");
  const denominacionCliente = String(camposNubefact.cliente_denominacion ?? "").trim();
  const direccionCliente = String(camposNubefact.cliente_direccion ?? "").trim();

  if (tipoComprobante === "FACTURA" && (!clienteSeleccionado || tipoDocumentoCliente !== "6" || !/^\d{11}$/.test(numeroDocumentoCliente) || !denominacionCliente || denominacionCliente.length > 100 || !direccionCliente || direccionCliente.length > 100)) {
    return { valida: false, error: "La factura requiere un cliente registrado con RUC válido, razón social y dirección fiscal (máximo 100 caracteres cada una)." };
  }
  if (tipoComprobante === "BOLETA" && total > 700 && (!clienteSeleccionado || !tipoDocumentoCliente || !numeroDocumentoCliente)) {
    return { valida: false, error: "Para una boleta mayor a S/ 700.00, busca o registra al comprador con su documento de identidad." };
  }
  if (!lineas.length) {
    return { valida: false, error: tipoVenta === "MOTOTAXIS" ? "Agrega al menos una mototaxi para continuar con esta venta." : "Agrega al menos un repuesto o servicio." };
  }
  if (tipoVenta === "MOTOTAXIS" && !lineas.some((linea) => linea.tipo === "MOTOTAXI")) {
    return { valida: false, error: "Agrega al menos una mototaxi para continuar con esta venta." };
  }
  if (tipoVenta === "MOTOTAXIS" && lineas.some((linea) => linea.tipo !== "MOTOTAXI")) {
    return { valida: false, error: "La venta de mototaxis se registra por separado de los repuestos y servicios." };
  }
  if (tipoVenta === "REPUESTOS" && lineas.some((linea) => linea.tipo === "MOTOTAXI")) {
    return { valida: false, error: "Registra la mototaxi desde el flujo de venta de mototaxis." };
  }

  const detalles: LineaIngreso[] = [];
  for (const [indice, linea] of lineas.entries()) {
    const cantidad = Number(linea.cantidad);
    const descuento = Number(linea.descuento);
    const precioRepuesto = linea.tipo === "PRODUCTO" ? precioRepuestoEnLinea(linea) : null;
    const precio = linea.tipo === "PRODUCTO" ? Number(precioRepuesto) : Number(linea.precio);

    if (!Number.isFinite(cantidad) || cantidad <= 0 || Number(cantidad.toFixed(3)) !== cantidad) {
      return { valida: false, error: `Revisa la cantidad de la línea ${indice + 1}.` };
    }
    if (!Number.isFinite(descuento) || descuento < 0 || Number(descuento.toFixed(2)) !== descuento || descuento > redondear(cantidad * precio)) {
      return { valida: false, error: `El descuento de la línea ${indice + 1} debe ser válido y no superar el importe con IGV.` };
    }

    if (linea.tipo === "PRODUCTO") {
      if (precioRepuesto == null) return { valida: false, error: `No hay precio configurado para la lista y cantidad de ${linea.producto.nombre}.` };
      detalles.push({
        tipo: "PRODUCTO", presentacionId: linea.producto.presentacionId,
        ...(ordenServicioId ? { precioUnitario: precioRepuesto } : linea.listaPrecioCodigo ? { listaPrecioCodigo: linea.listaPrecioCodigo, precioEsperado: precioRepuesto } : {}),
        cantidad: linea.cantidad, descuento: descuento.toFixed(2), afectacionIgv: linea.afectacionIgv,
      });
    } else if (linea.tipo === "MOTOTAXI") {
      if (!Number.isInteger(cantidad) || cantidad > linea.mototaxi.stockDisponible) return { valida: false, error: `Ingresa una cantidad entera dentro del saldo de la línea ${indice + 1}.` };
      if (!Number.isFinite(precio) || precio < 0.01 || Number(precio.toFixed(2)) !== precio) {
        return { valida: false, error: `Ingresa un precio de venta válido para la mototaxi de la línea ${indice + 1}.` };
      }
      detalles.push({ tipo: "MOTOTAXI", mototaxiModeloId: linea.mototaxi.mototaxiModeloId, cantidad: linea.cantidad, precioUnitario: linea.precio, descuento: descuento.toFixed(2), afectacionIgv: linea.afectacionIgv });
    } else {
      if (!linea.descripcion.trim() || !Number.isFinite(precio) || precio < 0 || Number(precio.toFixed(2)) !== precio) {
        return { valida: false, error: `Completa la descripción y un precio válido con IGV para el servicio ${indice + 1}.` };
      }
      detalles.push({ tipo: "SERVICIO", descripcion: linea.descripcion.trim(), cantidad: linea.cantidad, precioUnitario: linea.precio, descuento: descuento.toFixed(2), afectacionIgv: linea.afectacionIgv });
    }
  }

  const tipoDocInterno = tipoDocumentoCliente === "1" ? "DNI" : tipoDocumentoCliente === "6" ? "RUC" : tipoDocumentoCliente === "4" ? "CE" : tipoDocumentoCliente === "7" ? "PASAPORTE" : undefined;
  return { valida: true, detalles, tipoDocInterno };
}
