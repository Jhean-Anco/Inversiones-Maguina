import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { servicioIngresos } from "../../services/ingresos.service";
import type { OrdenServicioTransferida } from "../../types/nuevo-ingreso-transferencia";
import { MAX_RESULTADOS_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";

type Venta = ReturnType<typeof useNuevoIngreso>;
type Numeraciones = Awaited<ReturnType<typeof servicioIngresos.numeraciones>> | null;

export function obtenerVistaNuevoIngreso(venta: Venta, numeraciones: Numeraciones, transferenciaOS: OrdenServicioTransferida | null, cobranzaContadoRegistradaId: string | null) {
  const esBoleta = venta.tipoComprobante === "BOLETA";
  const esFactura = venta.tipoComprobante === "FACTURA";
  const esNotaVenta = venta.tipoComprobante === "NOTA_VENTA";
  const mostrarAfectacionIgv = esFactura || esBoleta && venta.estadoNubefact?.regimenTributario !== "NRUS";
  const presentacionComprobante = {
    clase: esBoleta ? "comprobante-boleta" : esFactura ? "comprobante-factura" : "comprobante-nota-venta",
    titulo: esBoleta ? "BOLETA DE VENTA" : esFactura ? "FACTURA DE VENTA" : "NOTA DE VENTA",
  };
  const nombreCliente = String(venta.camposNubefact.cliente_denominacion ?? "");
  const numeroDocumento = String(venta.camposNubefact.cliente_numero_de_documento ?? "");
  const tipoDocumento = String(venta.camposNubefact.cliente_tipo_de_documento ?? "0");
  const direccionFiscalFactura = String(venta.camposNubefact.cliente_direccion ?? "").trim();
  const identificacionFacturaPendiente = esFactura && (!venta.clienteSeleccionado || tipoDocumento !== "6" || !/^\d{11}$/.test(numeroDocumento) || !nombreCliente.trim() || nombreCliente.trim().length > 100 || !direccionFiscalFactura || direccionFiscalFactura.length > 100);
  const identificacionBoletaPendiente = esBoleta && venta.totales.total > 700 && (!venta.clienteSeleccionado || !tipoDocumento || tipoDocumento === "0" || !numeroDocumento);
  const cantidadTotal = venta.lineas.reduce((suma, linea) => suma + (Number(linea.cantidad) || 0), 0);
  const lineasOrdenadas = [...venta.lineas].sort((a, b) => Number(a.tipo === "SERVICIO") - Number(b.tipo === "SERVICIO"));
  const numeracionActual = esNotaVenta ? venta.exito?.codigo ?? numeraciones?.NOTA_VENTA.codigo : venta.exito?.nubefact?.codigo ?? numeraciones?.[esFactura ? "FACTURA" : "BOLETA"].codigo;
  const cpeEmitido = venta.exito?.nubefact?.estado === "EMITIDO";
  const enlaceNotaVenta = venta.exito?.archivos?.guardados.find((archivo) => archivo.tipo === "HTML")?.ruta;
  const contadoEmitido = Boolean(venta.exito && cpeEmitido && venta.exito.condicionPago === "CONTADO");
  const pagoInicialCreditoPendiente = Boolean(venta.exito && venta.exito.condicionPago === "CREDITO" && Number(venta.exito.importePagoInicial) > 0);
  const cobranzaContadoPendiente = Boolean(!transferenciaOS && cpeEmitido && venta.exito && (contadoEmitido || pagoInicialCreditoPendiente) && cobranzaContadoRegistradaId !== venta.exito.id);
  const consultaCatalogo = venta.busqueda.trim();

  return {
    esBoleta, esFactura, esNotaVenta, mostrarAfectacionIgv, presentacionComprobante,
    nombreCliente, numeroDocumento, tipoDocumento,
    identificacionFacturaPendiente, identificacionBoletaPendiente,
    identificacionComprobantePendiente: identificacionFacturaPendiente || identificacionBoletaPendiente,
    cantidadTotal, lineasOrdenadas, numeracionActual, cpeEmitido, enlaceNotaVenta,
    contadoEmitido, pagoInicialCreditoPendiente, cobranzaContadoPendiente,
    consultaCatalogo, buscandoEnCatalogo: consultaCatalogo.length >= 4,
    productosResultados: venta.resultados.slice(0, MAX_RESULTADOS_CATALOGO),
  };
}
