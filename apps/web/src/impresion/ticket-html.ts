import { escaparHtml as e, fechaCorta, montoSoles } from "./formato";
import type { LogoTicket } from "./logo-ticket";
import { qrSvg } from "./qr";
import type { DocumentoImprimible } from "./tipos";

/** Ancho del rollo y área realmente imprimible (los cabezales no imprimen el borde del papel). */
export const ANCHO_TICKET_MM = 80;
export const AREA_IMPRIMIBLE_MM = 72;

/** Rótulo de la contraparte: los comprobantes electrónicos usan "Adquiriente", como NubeFact. */
export const rotuloCliente = (d: DocumentoImprimible) => (d.etiquetaCliente ?? (d.electronico ? "Adquiriente" : "Cliente")).toUpperCase();

/** Órdenes y cotizaciones con IGV detallan subtotal e IGV aunque no sean comprobantes electrónicos. */
export const muestraDesglose = (d: DocumentoImprimible) =>
  d.electronico || ((d.tipo === "ORDEN_SERVICIO" || d.tipo === "COTIZACION") && Number(d.totales?.tasaIgv) > 0);

const fila = (izquierda: string, derecha: string, clase = "") => `<div class="fila ${clase}"><span>${izquierda}</span><span>${derecha}</span></div>`;

function totalesHtml(d: DocumentoImprimible) {
  const t = d.totales;
  if (!t) return "";
  const filas = muestraDesglose(d) ? [
    Number(t.gravada) > 0 ? fila("OP. GRAVADA", montoSoles(t.gravada)) : "",
    Number(t.exonerada) > 0 ? fila("OP. EXONERADA", montoSoles(t.exonerada)) : "",
    Number(t.inafecta) > 0 ? fila("OP. INAFECTA", montoSoles(t.inafecta)) : "",
    Number(t.descuento) > 0 ? fila("DESCUENTOS", montoSoles(t.descuento)) : "",
    fila(`IGV (${Number(t.tasaIgv)}%)`, montoSoles(t.igv)),
  ] : [];
  return `${filas.join("")}${fila("TOTAL", montoSoles(t.total), "total")}${d.montoEnLetras ? `<p class="letras"><b>IMPORTE EN LETRAS:</b><br>${e(d.montoEnLetras)}</p>` : ""}`;
}

function pagoHtml(d: DocumentoImprimible) {
  if (d.condicionPago === "CREDITO") return `<p><b>FORMA DE PAGO:</b> CRÉDITO</p>${d.cuotas.map((c) => fila(`Cuota ${c.cuota} · ${e(fechaCorta(c.fecha))}`, montoSoles(c.importe))).join("")}`;
  return d.medioPago ? `<p><b>FORMA DE PAGO:</b> ${e(d.medioPago)}</p>` : "";
}

function itemsHtml(d: DocumentoImprimible) {
  if (!d.items.length) return "";
  const conPrecios = d.items.some((i) => i.precioUnitario !== null);
  const filas = d.items.map((i) => {
    const descuento = i.descuento ? `<small>Dsct. ${montoSoles(i.descuento)}</small>` : "";
    return `<tr><td class="cant">${e(i.cantidad)}</td><td>${e(i.descripcion)}${descuento}</td>${conPrecios ? `<td class="num">${i.precioUnitario !== null ? montoSoles(i.precioUnitario) : ""}</td>` : ""}<td class="num">${i.total !== null ? montoSoles(i.total) : ""}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th class="cant">CANT.</th><th>DESCRIPCIÓN</th>${conPrecios ? '<th class="num">P/U</th>' : ""}<th class="num">${d.totales ? "TOTAL" : ""}</th></tr></thead><tbody>${filas}</tbody></table>`;
}

/** Cuerpo del documento (sin estilos), reutilizado por ticket y A4 propio. */
export function cuerpoComprobanteHtml(d: DocumentoImprimible, logo: LogoTicket | null = null) {
  const em = d.emisor;
  const cabecera = em
    ? `${logo ? `<img class="logo" src="${logo.dataUrl}" width="${logo.ancho / 2}" alt="">` : ""}<h1>${e(em.nombreComercial || em.razonSocial)}</h1>${em.nombreComercial ? `<p>${e(em.razonSocial)}</p>` : ""}<p>RUC ${e(em.ruc)}</p><p>${e(em.direccion)}</p>${em.telefono ? `<p>Tel. ${e(em.telefono)}</p>` : ""}${em.correo ? `<p>${e(em.correo)}</p>` : ""}`
    : "";
  const cliente = [
    `<p class="rotulo">${e(rotuloCliente(d))}</p>`,
    `<p>${e(d.cliente.nombre)}</p>`,
    d.cliente.numeroDocumento ? `<p>${e(d.cliente.tipoDocumento ?? "DOC.")}: ${e(d.cliente.numeroDocumento)}</p>` : "",
    d.cliente.direccion ? `<p>DIRECCIÓN: ${e(d.cliente.direccion)}</p>` : "",
    ...(d.datosExtra ?? []).map((x) => `<p><b>${e(x.etiqueta.toUpperCase())}:</b> ${e(x.valor)}</p>`),
    d.documentoModificado ? `<p><b>DOC. MODIFICADO:</b> ${e(d.documentoModificado.serieNumero)}</p><p><b>MOTIVO:</b> ${e(d.documentoModificado.motivo)}</p>` : "",
  ].join("");
  const desglose = d.totales && muestraDesglose(d);
  const datos = [
    fila("FECHA EMISIÓN:", `${e(fechaCorta(d.fechaEmision))}${d.horaEmision ? ` ${e(d.horaEmision)}` : ""}`),
    d.fechaVencimiento ? fila("FECHA DE VENC:", e(fechaCorta(d.fechaVencimiento))) : "",
    d.totales ? fila("MONEDA:", "SOLES") : "",
    desglose ? fila("IGV:", `${Number(d.totales?.tasaIgv).toFixed(2)} %`) : "",
  ].join("");
  return `<header class="emisor">${cabecera}</header>
<section class="titulo"><h2>${e(d.titulo)}</h2><p class="numero">${e(d.serieNumero)}</p></section>
<section class="datos">${cliente}</section>
<section class="datos">${datos}</section>
${itemsHtml(d)}
<section class="totales">${totalesHtml(d)}${pagoHtml(d)}${d.observacion ? `<p><b>Obs.:</b> ${e(d.observacion)}</p>` : ""}</section>
${d.advertencias.map((a) => `<p class="aviso">${e(a)}</p>`).join("")}
<footer>${d.cadenaQr ? `<div class="qr">${qrSvg(d.cadenaQr)}</div>` : ""}<p>${e(d.leyenda)}</p>${d.electronico && em?.urlConsultaComprobantes ? `<p>Consulta en ${e(em.urlConsultaComprobantes)}</p>` : ""}${d.hash ? `<p class="hash"><b>Resumen:</b> ${e(d.hash)}</p>` : ""}${em?.mensajePie ? `<p class="pie">${e(em.mensajePie)}</p>` : ""}</footer>`;
}

const ESTILO_BASE = `*{box-sizing:border-box;margin:0;padding:0}html,body{background:#fff;color:#000}body{font:600 11px/1.35 "Arial Narrow",Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
h1{font-size:15px;font-weight:900;text-transform:uppercase}h2{font-size:12px;font-weight:900}p{margin:1px 0;overflow-wrap:anywhere}small{display:block;font-weight:500;font-size:10px}
.emisor,.titulo,footer{text-align:center}.titulo{border-block:1px dashed #000;margin:6px 0;padding:5px 0}.numero{font-size:15px;font-weight:900;letter-spacing:.04em}
.fila{display:flex;justify-content:space-between;gap:6px}.fila span:last-child{white-space:nowrap;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;margin:6px 0;border-block:1px dashed #000}th{font-size:10px;text-align:left;border-bottom:1px dashed #000;padding:3px 0}td{padding:3px 0;vertical-align:top}
.logo{display:block;margin:0 auto 4px;max-width:100%;height:auto;image-rendering:pixelated}.rotulo{font-weight:900;margin-top:2px}.datos+.datos{margin-top:4px}.cant{width:11%;padding-right:4px}.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.total{font-size:15px;font-weight:900;border-top:1px solid #000;margin-top:3px;padding-top:3px}.letras{font-size:10px;margin-top:3px}
.aviso{border:1px solid #000;padding:3px;margin:5px 0;font-weight:900;text-align:center}.qr{margin:8px auto 4px;width:max-content}.qr svg{display:block}.hash{font-size:9px;font-weight:500;overflow-wrap:anywhere}.pie{margin-top:6px}`;

/** Documento HTML completo para ticket térmico de 80 mm vía diálogo del sistema. */
export function ticketHtml(d: DocumentoImprimible, logo: LogoTicket | null = null) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${e(d.titulo)} ${e(d.serieNumero)}</title><style>${ESTILO_BASE}
@page{size:${ANCHO_TICKET_MM}mm 297mm;margin:0}body{width:${AREA_IMPRIMIBLE_MM}mm;margin:0 auto;padding:2mm 0 4mm}</style></head><body class="ticket">${cuerpoComprobanteHtml(d, logo)}</body></html>`;
}

/** Representación propia en A4 (respaldo cuando no hay PDF de NubeFact: notas de venta, órdenes, cotizaciones, compras…). */
export function a4Html(d: DocumentoImprimible, logo: LogoTicket | null = null) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${e(d.titulo)} ${e(d.serieNumero)}</title><style>${ESTILO_BASE}
@page{size:A4 portrait;margin:14mm}body{font-size:12px;font-weight:500;max-width:182mm;margin:0 auto}h1{font-size:20px}h2{font-size:16px}.numero{font-size:20px}
.emisor{text-align:left}.titulo{border:2px solid #000;border-radius:6px;padding:10px;margin:14px 0}th,td{padding:6px 4px}.totales{width:70mm;margin-left:auto}.qr{margin:16px auto 6px}</style></head><body class="a4">${cuerpoComprobanteHtml(d, logo)}</body></html>`;
}

/** Alto de página (mm) ajustado al contenido medido, para que la térmica no avance papel en blanco. */
export function altoPaginaMm(altoContenidoPx: number) {
  return Math.max(60, Math.ceil((altoContenidoPx * 25.4) / 96) + 6);
}
