import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentoEjemplo, emisorEjemplo as emisor } from "../test/documento-ejemplo";
import { codificarTexto, columnas, EscPos, envolver, trocear } from "./escpos";
import { escaparHtml, fechaCorta, montoSoles } from "./formato";
import { guardarDirecto, guardarFormato, leerDirecto, leerFormato } from "./memoria-impresion";
import { matrizQr, qrSvg } from "./qr";
import { a4Html, altoPaginaMm, ticketHtml } from "./ticket-html";
import { ticketEscPos } from "./ticket-escpos";
import type { DocumentoImprimible } from "./tipos";

const base = documentoEjemplo(emisor);
const electronico: DocumentoImprimible = {
  ...base, tipo: "FACTURA", titulo: "FACTURA ELECTRÓNICA", electronico: true, fechaVencimiento: "2026-12-25", condicionPago: "CREDITO",
  cuotas: [{ cuota: 1, fecha: "2026-12-25", importe: "110.00" }], cliente: { tipoDocumento: "RUC", numeroDocumento: "20100066603", nombre: "<Cliente & Cía>", direccion: "Jr. Dos" },
  documentoModificado: { serieNumero: "F001-000001", motivo: "Ajuste" }, totales: { ...base.totales!, exonerada: "1.00", inafecta: "2.00" }, advertencias: ["SUNAT aún no confirma"],
};
const texto = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);

describe("formato y QR", () => {
  it("formatea fechas, montos y escapa HTML", () => {
    expect(fechaCorta("2026-01-02")).toBe("02/01/2026");
    expect(fechaCorta("x")).toBe("x");
    expect(montoSoles("1250.5")).toMatch(/^S\/ 1.250[.,]50$/);
    expect(montoSoles("abc")).toBe("S/ 0.00");
    expect(escaparHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
    expect(escaparHtml(null)).toBe("");
  });
  it("genera matriz y SVG del QR", () => {
    expect(matrizQr("20100066603|01|F001|1|").length).toBeGreaterThanOrEqual(21);
    expect(qrSvg("hola", 100)).toContain("width=\"100\"");
  });
});

describe("memoria de impresión del equipo", () => {
  beforeEach(() => { window.localStorage.clear(); });
  it("recuerda el último tamaño (Ticket por defecto)", () => {
    expect(leerFormato()).toBe("TICKET");
    guardarFormato("A4");
    expect(leerFormato()).toBe("A4");
    window.localStorage.setItem("magina.impresion.formato.v2", "58");
    expect(leerFormato()).toBe("TICKET");
  });
  it("recuerda la impresora directa y descarta datos corruptos", () => {
    expect(leerDirecto()).toBeNull();
    guardarDirecto({ tipo: "bluetooth", id: "d1", nombre: "MPT" });
    expect(leerDirecto()).toEqual({ tipo: "bluetooth", id: "d1", nombre: "MPT" });
    guardarDirecto({ tipo: "serial" });
    expect(leerDirecto()).toEqual({ tipo: "serial" });
    guardarDirecto({ tipo: "sistema" });
    expect(leerDirecto()).toEqual({ tipo: "sistema" });
    window.localStorage.setItem("magina.impresion.directo.v2", JSON.stringify({ tipo: "bluetooth", id: 1 }));
    expect(leerDirecto()).toBeNull();
    window.localStorage.setItem("magina.impresion.directo.v2", "{no-json");
    expect(leerDirecto()).toBeNull();
    guardarDirecto(null);
    expect(window.localStorage.getItem("magina.impresion.directo.v2")).toBeNull();
  });
  it("tolera almacenamiento bloqueado", () => {
    const lectura = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("bloqueado"); });
    const escritura = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("lleno"); });
    expect(leerFormato()).toBe("TICKET");
    expect(leerDirecto()).toBeNull();
    expect(() => guardarFormato("A4")).not.toThrow();
    lectura.mockRestore();
    escritura.mockRestore();
  });
});

describe("ESC/POS", () => {
  it("codifica acentos en PC850 y translitera lo desconocido", () => {
    expect(codificarTexto("Ñañá\t")).toEqual([0xa5, 0x61, 0xa4, 0xa0, 0x20]);
    expect(codificarTexto("ç✓")).toEqual([0x63, 0x3f]);
  });
  it("construye comandos de formato, QR y corte", () => {
    const bytes = Array.from(new EscPos().iniciar().alinear("derecha").alinear("centro").alinear("izquierda").negrita(true).tamano(9, 0).linea("A").qr("Q", 99).cortar().resultado());
    expect(bytes.slice(0, 5)).toEqual([0x1b, 0x40, 0x1b, 0x74, 2]);
    expect(bytes).toContain(0x70);
    expect(bytes.slice(-4)).toEqual([0x1d, 0x56, 0x42, 3]);
  });
  it("envuelve, alinea columnas y trocea", () => {
    expect(envolver("uno dos tres", 7)).toEqual(["uno dos", "tres"]);
    expect(envolver("abcdefghij", 4)).toEqual(["abcd", "efgh", "ij"]);
    expect(envolver("a\nb", 5)).toEqual(["a", "b"]);
    expect(columnas("Total", "S/ 1", 10)).toBe("Total S/ 1");
    expect(columnas("Descripción larga", "S/ 10", 12)).toBe("Descri S/ 10");
    expect(trocear(new Uint8Array(5), 2).map((b) => b.length)).toEqual([2, 2, 1]);
    expect(() => trocear(new Uint8Array(1), 0)).toThrow(RangeError);
  });
  it("arma el ticket con emisor, totales, crédito y QR", () => {
    const ticket = texto(ticketEscPos(electronico));
    expect(ticket).toContain("FACTURA ELECTR");
    expect(ticket).toContain("Cuota 1");
    expect(ticket).toContain("Doc. modificado: F001-000001");
    expect(ticket).toContain("Op. exonerada");
    expect(texto(ticketEscPos({ ...base, emisor: { ...emisor!, nombreComercial: null, telefono: null, mensajePie: null }, hash: null, observacion: null, medioPago: null }))).not.toContain("Hash:");
    expect(ticketEscPos({ ...base, emisor: null, cadenaQr: null, cliente: { ...base.cliente, numeroDocumento: null } }).length).toBeGreaterThan(50);
  });
  it("imprime documentos sin totales, con datos extra y sin precios", () => {
    const guia: DocumentoImprimible = { ...base, tipo: "GUIA_REMISION", titulo: "GUÍA", totales: null, cadenaQr: null, hash: null, etiquetaCliente: "Destinatario", datosExtra: [{ etiqueta: "Estado", valor: "Emitida" }], items: [{ codigo: null, descripcion: "Bien", unidad: null, cantidad: "3", precioUnitario: null, descuento: null, total: null }] };
    const ticket = texto(ticketEscPos(guia));
    expect(ticket).toContain("Destinatario: ");
    expect(ticket).toContain("Estado: Emitida");
    expect(ticket).toContain("3 x Bien");
    expect(ticket).not.toContain("TOTAL");
    expect(texto(ticketEscPos({ ...guia, items: [] }))).not.toContain("CANT");
    expect(texto(ticketEscPos({ ...guia, items: [{ ...guia.items[0], precioUnitario: null, total: "5.00" }] }))).toContain("S/ 5.00");
  });
});

describe("ticket y A4 HTML", () => {
  it("genera ticket de 80 mm y A4 escapando datos", () => {
    const html80 = ticketHtml(electronico);
    expect(html80).toContain("@page{size:80mm");
    expect(html80).toContain("&lt;Cliente &amp; Cía&gt;");
    expect(html80).toContain("Op. exonerada");
    expect(html80).toContain("CRÉDITO");
    expect(ticketHtml({ ...base, emisor: null, cadenaQr: null, hash: null, medioPago: null })).toContain("width:72mm");
    expect(a4Html(base)).toContain("A4 portrait");
    expect(altoPaginaMm(10)).toBe(60);
    expect(altoPaginaMm(3780)).toBe(1007);
  });
  it("detalla IGV en órdenes y cotizaciones solo si lo hay, y omite totales en guías", () => {
    const orden: DocumentoImprimible = { ...base, tipo: "ORDEN_SERVICIO" };
    expect(ticketHtml(orden)).toContain("IGV (18%)");
    expect(ticketHtml({ ...orden, totales: { ...base.totales!, tasaIgv: "0.00" } })).not.toContain("IGV (");
    expect(ticketHtml(base)).not.toContain("IGV (");
    const guia: DocumentoImprimible = { ...base, tipo: "GUIA_REMISION", totales: null, items: [], datosExtra: [{ etiqueta: "Estado", valor: "Emitida" }], etiquetaCliente: "Destinatario" };
    const html = a4Html(guia);
    expect(html).not.toContain("TOTAL");
    expect(html).not.toContain("<table>");
    expect(html).toContain("Destinatario:");
    expect(html).toContain("Estado:");
    expect(ticketHtml({ ...base, items: [{ ...base.items[0], precioUnitario: null, total: null }] })).toContain("<td class=\"num\"></td>");
  });
});
