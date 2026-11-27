import { columnas, EscPos, envolver } from "./escpos";
import { fechaCorta, montoSoles } from "./formato";
import { muestraDesglose } from "./ticket-html";
import { COLUMNAS_TICKET, type DocumentoImprimible } from "./tipos";

/** Genera los bytes ESC/POS del ticket de 80 mm para impresión directa por Bluetooth/serial. */
export function ticketEscPos(documento: DocumentoImprimible): Uint8Array {
  const ancho = COLUMNAS_TICKET;
  const p = new EscPos().iniciar();
  const separador = "-".repeat(ancho);
  const parrafo = (texto: string) => { for (const renglon of envolver(texto, ancho)) p.linea(renglon); };
  const par = (izquierda: string, derecha: string) => p.linea(columnas(izquierda, derecha, ancho));
  const { emisor } = documento;

  p.alinear("centro");
  if (emisor) {
    p.negrita(true).tamano(1, 2);
    parrafo(emisor.nombreComercial || emisor.razonSocial);
    p.tamano(1, 1).negrita(false);
    if (emisor.nombreComercial) parrafo(emisor.razonSocial);
    p.linea(`RUC ${emisor.ruc}`);
    parrafo(emisor.direccion);
    if (emisor.telefono) p.linea(`Tel. ${emisor.telefono}`);
  }
  p.linea(separador).negrita(true);
  parrafo(documento.titulo);
  p.tamano(1, 2).linea(documento.serieNumero).tamano(1, 1).negrita(false).linea(separador).alinear("izquierda");

  par("Fecha:", `${fechaCorta(documento.fechaEmision)}${documento.horaEmision ? ` ${documento.horaEmision}` : ""}`);
  if (documento.fechaVencimiento) par("Vence:", fechaCorta(documento.fechaVencimiento));
  parrafo(`${documento.etiquetaCliente ?? "Cliente"}: ${documento.cliente.nombre}`);
  if (documento.cliente.numeroDocumento) p.linea(`${documento.cliente.tipoDocumento ?? "Doc."}: ${documento.cliente.numeroDocumento}`);
  if (documento.cliente.direccion) parrafo(`Dir.: ${documento.cliente.direccion}`);
  for (const dato of documento.datosExtra ?? []) parrafo(`${dato.etiqueta}: ${dato.valor}`);
  if (documento.documentoModificado) {
    p.linea(`Doc. modificado: ${documento.documentoModificado.serieNumero}`);
    parrafo(`Motivo: ${documento.documentoModificado.motivo}`);
  }

  if (documento.items.length) {
    p.linea(separador).negrita(true).linea(columnas("CANT  DESCRIPCIÓN", documento.totales ? "TOTAL" : "", ancho)).negrita(false);
    for (const item of documento.items) {
      parrafo(`${item.cantidad} x ${item.descripcion}`);
      if (item.precioUnitario !== null || item.total !== null) {
        par(item.precioUnitario !== null ? `   P.U. ${montoSoles(item.precioUnitario)}${item.descuento ? ` Dsct. ${montoSoles(item.descuento)}` : ""}` : "", item.total !== null ? montoSoles(item.total) : "");
      }
    }
  }
  p.linea(separador);

  const t = documento.totales;
  if (t) {
    if (muestraDesglose(documento)) {
      if (Number(t.gravada) > 0) par("Op. gravada", montoSoles(t.gravada));
      if (Number(t.exonerada) > 0) par("Op. exonerada", montoSoles(t.exonerada));
      if (Number(t.inafecta) > 0) par("Op. inafecta", montoSoles(t.inafecta));
      if (Number(t.descuento) > 0) par("Descuentos", montoSoles(t.descuento));
      par(`IGV (${Number(t.tasaIgv)}%)`, montoSoles(t.igv));
    }
    p.negrita(true).tamano(1, 2);
    par("TOTAL", montoSoles(t.total));
    p.tamano(1, 1).negrita(false);
    if (documento.montoEnLetras) parrafo(documento.montoEnLetras);
  }
  if (documento.condicionPago === "CREDITO") {
    p.linea("Condición: CRÉDITO");
    for (const cuota of documento.cuotas) par(`Cuota ${cuota.cuota} · ${fechaCorta(cuota.fecha)}`, montoSoles(cuota.importe));
  } else if (documento.medioPago) p.linea(`Pago: ${documento.medioPago}`);
  if (documento.observacion) parrafo(`Obs.: ${documento.observacion}`);
  for (const advertencia of documento.advertencias) parrafo(`** ${advertencia}`);

  p.alinear("centro");
  if (documento.cadenaQr) p.saltos(1).qr(documento.cadenaQr, 6).saltos(1);
  if (documento.hash) p.linea(`Hash: ${documento.hash}`);
  parrafo(documento.leyenda);
  if (emisor?.mensajePie) { p.saltos(1); parrafo(emisor.mensajePie); }
  return p.saltos(4).cortar().resultado();
}
