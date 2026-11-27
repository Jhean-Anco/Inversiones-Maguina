import { columnas, EscPos, envolver } from "./escpos";
import { fechaCorta, montoSoles } from "./formato";
import type { LogoTicket } from "./logo-ticket";
import { muestraDesglose, rotuloCliente } from "./ticket-html";
import { COLUMNAS_TICKET, type DocumentoImprimible } from "./tipos";

/** Genera los bytes ESC/POS del ticket de 80 mm para impresión directa por Bluetooth/serial. */
export function ticketEscPos(documento: DocumentoImprimible, logo: LogoTicket | null = null): Uint8Array {
  const ancho = COLUMNAS_TICKET;
  const p = new EscPos().iniciar();
  const separador = "-".repeat(ancho);
  const parrafo = (texto: string) => { for (const renglon of envolver(texto, ancho)) p.linea(renglon); };
  const par = (izquierda: string, derecha: string) => p.linea(columnas(izquierda, derecha, ancho));
  const { emisor } = documento;

  p.alinear("centro");
  if (logo) p.imagen(logo.ancho, logo.alto, logo.bytes).saltos(1);
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

  const t = documento.totales;
  const desglose = Boolean(t) && muestraDesglose(documento);
  p.negrita(true).linea(rotuloCliente(documento).toUpperCase()).negrita(false);
  parrafo(documento.cliente.nombre);
  if (documento.cliente.numeroDocumento) p.linea(`${documento.cliente.tipoDocumento ?? "DOC."}: ${documento.cliente.numeroDocumento}`);
  if (documento.cliente.direccion) parrafo(`DIRECCIÓN: ${documento.cliente.direccion}`);
  for (const dato of documento.datosExtra ?? []) parrafo(`${dato.etiqueta.toUpperCase()}: ${dato.valor}`);
  if (documento.documentoModificado) {
    p.linea(`DOC. MODIFICADO: ${documento.documentoModificado.serieNumero}`);
    parrafo(`MOTIVO: ${documento.documentoModificado.motivo}`);
  }
  par("FECHA EMISIÓN:", `${fechaCorta(documento.fechaEmision)}${documento.horaEmision ? ` ${documento.horaEmision}` : ""}`);
  if (documento.fechaVencimiento) par("FECHA DE VENC:", fechaCorta(documento.fechaVencimiento));
  if (t) par("MONEDA:", "SOLES");
  if (desglose && t) par("IGV:", `${Number(t.tasaIgv).toFixed(2)} %`);

  if (documento.items.length) {
    const conPrecios = documento.items.some((item) => item.precioUnitario !== null);
    // Columnas fijas: CANT (5) · DESCRIPCIÓN · P/U (10) · TOTAL (10), todo en 48 caracteres.
    const anchoCant = 5;
    const anchoNumero = 10;
    const anchoDescripcion = ancho - anchoCant - anchoNumero * (conPrecios ? 2 : 1) - (conPrecios ? 3 : 2);
    const celda = (cant: string, descripcion: string, pu: string, total: string) =>
      `${cant.padEnd(anchoCant).slice(0, anchoCant)} ${descripcion.padEnd(anchoDescripcion).slice(0, anchoDescripcion)}${conPrecios ? ` ${pu.padStart(anchoNumero).slice(-anchoNumero)}` : ""} ${total.padStart(anchoNumero).slice(-anchoNumero)}`;
    p.linea(separador).negrita(true).linea(celda("CANT", "DESCRIPCIÓN", "P/U", documento.totales ? "TOTAL" : "")).negrita(false);
    for (const item of documento.items) {
      const renglones = envolver(item.descripcion, anchoDescripcion);
      p.linea(celda(item.cantidad, renglones[0] ?? "", item.precioUnitario !== null ? montoSoles(item.precioUnitario) : "", item.total !== null ? montoSoles(item.total) : ""));
      for (const renglon of renglones.slice(1)) p.linea(celda("", renglon, "", ""));
      if (item.descuento) par("", `Dsct. ${montoSoles(item.descuento)}`);
    }
  }
  p.linea(separador);

  if (t) {
    if (desglose) {
      if (Number(t.gravada) > 0) par("OP. GRAVADA", montoSoles(t.gravada));
      if (Number(t.exonerada) > 0) par("OP. EXONERADA", montoSoles(t.exonerada));
      if (Number(t.inafecta) > 0) par("OP. INAFECTA", montoSoles(t.inafecta));
      if (Number(t.descuento) > 0) par("DESCUENTOS", montoSoles(t.descuento));
      par(`IGV (${Number(t.tasaIgv)}%)`, montoSoles(t.igv));
    }
    p.negrita(true).tamano(1, 2);
    par("TOTAL", montoSoles(t.total));
    p.tamano(1, 1).negrita(false);
    if (documento.montoEnLetras) { p.negrita(true).linea("IMPORTE EN LETRAS:").negrita(false); parrafo(documento.montoEnLetras); }
  }
  if (documento.condicionPago === "CREDITO") {
    p.linea("FORMA DE PAGO: CRÉDITO");
    for (const cuota of documento.cuotas) par(`Cuota ${cuota.cuota} · ${fechaCorta(cuota.fecha)}`, montoSoles(cuota.importe));
  } else if (documento.medioPago) p.linea(`FORMA DE PAGO: ${documento.medioPago}`);
  if (documento.observacion) parrafo(`OBSERVACIONES: ${documento.observacion}`);
  for (const advertencia of documento.advertencias) parrafo(`** ${advertencia}`);

  p.alinear("centro");
  if (documento.cadenaQr) p.saltos(1).qr(documento.cadenaQr, 6).saltos(1);
  parrafo(documento.leyenda);
  if (documento.electronico && emisor?.urlConsultaComprobantes) parrafo(`Consulta en ${emisor.urlConsultaComprobantes}`);
  if (documento.hash) parrafo(`Resumen: ${documento.hash}`);
  if (emisor?.mensajePie) { p.saltos(1); parrafo(emisor.mensajePie); }
  return p.saltos(4).cortar().resultado();
}
