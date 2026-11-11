import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { archivosLocales, db } from "@magina/database";
import { and, eq } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";

type TipoComprobante = "BOLETA" | "FACTURA" | "NOTA_VENTA" | "NOTA_CREDITO" | "NOTA_DEBITO";
const destino: Record<string, string> = {
  FOTO_REPUESTO: "imagenes/repuestos", FOTO_CATEGORIA: "imagenes/categorias", FOTO_MARCA: "imagenes/marcas",
  FOTO_MOTOTAXI: "imagenes/mototaxis", EVIDENCIA_COMPRA: "compras/evidencias",
  BOLETA: "ventas/boletas", FACTURA: "ventas/facturas", NOTA_VENTA: "ventas/notas-venta",
  NOTA_CREDITO: "ventas/notas-credito", NOTA_DEBITO: "ventas/notas-debito",
};

@Injectable()
export class ServicioAlmacenamiento {
  private raiz() { return resolve(validarConfiguracionEntorno().carpetaSubidas); }

  async guardarArchivo(_destino: string, tipoArchivo: string, entidadTipo: string, entidadId: string, nombre: string, mime: string, contenido: Buffer, urlFuente?: string) {
    const base = destino[_destino] ?? destino[tipoArchivo] ?? `documentos/${entidadTipo.toLowerCase().replace(/[^a-z0-9-]/g, "-")}`;
    const extension = extname(nombre).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
    const nombreSeguro = `${randomUUID()}${extension}`;
    const relativa = join(base, entidadId, nombreSeguro).replace(/\\/g, "/");
    const absoluta = resolve(this.raiz(), relativa);
    if (!absoluta.startsWith(`${this.raiz()}${sep}`)) throw new BadRequestException("La ruta del archivo no es válida.");
    await mkdir(resolve(absoluta, ".."), { recursive: true });
    await writeFile(absoluta, contenido, { flag: "wx" });
    try {
      const [registro] = await db.insert(archivosLocales).values({
        tipoArchivo, entidadTipo, entidadId, rutaRelativa: relativa, nombre: nombre.slice(0, 240), mimeType: mime || "application/octet-stream",
        tamanoBytes: contenido.length, sha256: createHash("sha256").update(contenido).digest("hex"), urlFuente: urlFuente ?? null,
      }).returning();
      return { ...registro, ruta: `/archivos/${registro.id}/contenido` };
    } catch (error) {
      await unlink(absoluta).catch(() => undefined);
      throw error;
    }
  }

  async descargarArchivoRegistrado(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException("El identificador del archivo no es válido.");
    const [registro] = await db.select().from(archivosLocales).where(eq(archivosLocales.id, id)).limit(1);
    if (!registro) throw new NotFoundException("No se encontró el archivo.");
    const absoluto = resolve(this.raiz(), registro.rutaRelativa);
    if (!absoluto.startsWith(`${this.raiz()}${sep}`)) throw new NotFoundException("No se encontró el archivo.");
    try { return { contenido: await readFile(absoluto), mime: registro.mimeType, nombre: registro.nombre }; }
    catch { throw new NotFoundException("No se encontró el archivo almacenado."); }
  }

  async eliminarArchivoRegistrado(id: string) {
    const [registro] = await db.select().from(archivosLocales).where(eq(archivosLocales.id, id)).limit(1);
    if (!registro) return false;
    await db.delete(archivosLocales).where(eq(archivosLocales.id, id));
    await unlink(resolve(this.raiz(), registro.rutaRelativa)).catch(() => undefined);
    return true;
  }

  async subirImagenCatalogo(tipo: "categorias" | "marcas" | "productos", id: string, nombre: string, mime: string, contenido: Buffer) {
    const tipoArchivo = tipo === "productos" ? "FOTO_REPUESTO" : tipo === "categorias" ? "FOTO_CATEGORIA" : "FOTO_MARCA";
    const entidadTipo = tipo === "productos" ? "PRODUCTO" : tipo === "categorias" ? "CATEGORIA" : "MARCA";
    const archivo = await this.guardarArchivo(tipoArchivo, tipoArchivo, entidadTipo, id, nombre, mime, contenido);
    return { ...archivo, rutaImagen: archivo.ruta };
  }

  async archivarDocumentosNubeFact(entidadTipo: string, entidadId: string, tipoComprobante: string, codigo: string, datos: Record<string, unknown>) {
    const tipoBase = tipoComprobante.replace(/_ANULACION$/, "");
    const campos = [
      { campo: "enlace_del_pdf", sufijo: "PDF", extension: "pdf", mime: "application/pdf" },
      { campo: "enlace_del_xml", sufijo: "XML", extension: "xml", mime: "application/xml" },
      { campo: "enlace_del_cdr", sufijo: "CDR", extension: "zip", mime: "application/zip" },
    ];
    const guardados: { id: string; tipo: string; nombre: string; ruta: string }[] = [];
    const errores: { tipo: string; mensaje: string }[] = [];
    const hostConfigurado = (() => { try { return new URL(process.env.NUBEFACT_RUTA ?? "").hostname.toLowerCase(); } catch { return ""; } })();
    for (const doc of campos) {
      const urlFuente = datos[doc.campo];
      if (typeof urlFuente !== "string" || !urlFuente.trim()) continue;
      try {
        const url = new URL(urlFuente);
        if (url.protocol !== "https:" || url.username || url.password || (url.hostname.toLowerCase() !== hostConfigurado && !["api.nubefact.com", "api.pse.pe", "nubefact.pse.pe"].includes(url.hostname.toLowerCase()))) throw new Error("NubeFact devolvió un enlace de documento no permitido.");
        const tipoArchivo = `${tipoComprobante}_${doc.sufijo}`;
        const [existente] = await db.select({ id: archivosLocales.id, nombre: archivosLocales.nombre }).from(archivosLocales)
          .where(and(eq(archivosLocales.entidadTipo, entidadTipo), eq(archivosLocales.entidadId, entidadId), eq(archivosLocales.tipoArchivo, tipoArchivo))).limit(1);
        if (existente) { guardados.push({ ...existente, tipo: doc.sufijo, ruta: `/archivos/${existente.id}/contenido` }); continue; }
        const respuesta = await fetch(url, { headers: { Authorization: process.env.NUBEFACT_TOKEN ?? "", Accept: "application/pdf, application/xml, application/zip, application/octet-stream" }, signal: AbortSignal.timeout(20000) });
        if (!respuesta.ok) throw new Error(`NubeFact respondió ${respuesta.status} al descargar ${doc.sufijo}.`);
        const contenido = Buffer.from(await respuesta.arrayBuffer());
        if (!contenido.length || contenido.length > 20 * 1024 * 1024) throw new Error(`El archivo ${doc.sufijo} está vacío o supera 20 MB.`);
        const mime = respuesta.headers.get("content-type")?.split(";")[0]?.trim() || doc.mime;
        const nombre = `${codigo.replace(/[^A-Za-z0-9_-]/g, "_")}-${doc.sufijo.toLowerCase()}.${doc.extension}`;
        const guardado = await this.guardarArchivo(tipoBase, tipoArchivo, entidadTipo, entidadId, nombre, mime, contenido, urlFuente);
        guardados.push({ id: guardado.id, tipo: doc.sufijo, nombre, ruta: guardado.ruta });
      } catch (error) { errores.push({ tipo: doc.sufijo, mensaje: error instanceof Error ? error.message : "No se pudo guardar el documento de NubeFact." }); }
    }
    return { guardados, errores };
  }

  async archivarDocumentoNotaVenta(venta: { id: string; codigo: string; fecha: string; clienteNombre: string | null; clienteNumeroDocumento: string | null; clienteDireccion: string | null; medioPago: string; total: string; subtotal: string; igv: string; detalles: { descripcion: string; cantidad: string; precioUnitario: string; total: string }[] }) {
    const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
    const filas = venta.detalles.map((d) => `<tr><td>${escapar(d.descripcion)}</td><td>${escapar(d.cantidad)}</td><td>S/ ${escapar(d.precioUnitario)}</td><td>S/ ${escapar(d.total)}</td></tr>`).join("");
    const html = `<!doctype html><html lang="es"><meta charset="utf-8"><title>Nota de venta ${escapar(venta.codigo)}</title><style>body{font:15px Arial;max-width:820px;margin:40px auto;color:#172033}table{width:100%;border-collapse:collapse;margin:24px 0}td,th{padding:10px;border-bottom:1px solid #ddd;text-align:left}@media print{body{margin:0}}</style><h1>Nota de venta ${escapar(venta.codigo)}</h1><p>${escapar(venta.fecha)} · ${escapar(venta.clienteNombre || "Cliente no especificado")}</p><p>${escapar(venta.clienteNumeroDocumento || "")} · ${escapar(venta.clienteDireccion || "")}</p><table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table><p>Subtotal S/ ${escapar(venta.subtotal)} · IGV S/ ${escapar(venta.igv)} · Total S/ ${escapar(venta.total)}</p><p>Pago: ${escapar(venta.medioPago)}</p></html>`;
    return this.guardarArchivo("NOTA_VENTA", "NOTA_VENTA_HTML", "INGRESO", venta.id, `${venta.codigo}.html`, "text/html", Buffer.from(html));
  }
}
