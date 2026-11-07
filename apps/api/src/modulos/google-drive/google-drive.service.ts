import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { archivosDrive, carpetasDrive, db } from "@magina/database";

const ALCANCE_DRIVE = "https://www.googleapis.com/auth/drive.file";
const ALCANCE_METADATOS_DRIVE = "https://www.googleapis.com/auth/drive.metadata.readonly";
const API_DRIVE = "https://www.googleapis.com/drive/v3";
type ArchivoDrive = { id: string; name: string; mimeType: string; webViewLink?: string; modifiedTime?: string; parents?: string[]; trashed?: boolean };
type TokensDrive = { refresh_token: string; cuenta?: string; alcances?: string[] };
type DestinoArchivoDrive = "FOTO_REPUESTO" | "FOTO_MOTOTAXI" | "FOTO_CATEGORIA" | "FOTO_MARCA" | "BOLETA" | "FACTURA" | "NOTA_VENTA" | "NOTA_CREDITO" | "NOTA_DEBITO" | "EVIDENCIA_COMPRA";
const destinos: Record<DestinoArchivoDrive, { carpetas: { clave: string; nombre: string }[] }> = {
  FOTO_REPUESTO: { carpetas: [{ clave: "IMAGENES", nombre: "06 Imágenes" }, { clave: "IMAGENES_REPUESTOS", nombre: "Repuestos" }] },
  FOTO_MOTOTAXI: { carpetas: [{ clave: "IMAGENES", nombre: "06 Imágenes" }, { clave: "IMAGENES_MOTOTAXIS", nombre: "Mototaxis" }] },
  FOTO_CATEGORIA: { carpetas: [{ clave: "IMAGENES", nombre: "06 Imágenes" }, { clave: "IMAGENES_CATEGORIAS", nombre: "Categorías" }] },
  FOTO_MARCA: { carpetas: [{ clave: "IMAGENES", nombre: "06 Imágenes" }, { clave: "IMAGENES_MARCAS", nombre: "Marcas" }] },
  BOLETA: { carpetas: [{ clave: "BOLETAS", nombre: "02 Boletas" }] },
  FACTURA: { carpetas: [{ clave: "FACTURAS", nombre: "01 Facturas" }] },
  NOTA_VENTA: { carpetas: [{ clave: "NOTAS_VENTA", nombre: "05 Notas de venta" }] },
  NOTA_CREDITO: { carpetas: [{ clave: "NOTAS_CREDITO", nombre: "03 Notas de crédito" }] },
  NOTA_DEBITO: { carpetas: [{ clave: "NOTAS_DEBITO", nombre: "04 Notas de débito" }] },
  EVIDENCIA_COMPRA: { carpetas: [{ clave: "OTROS_DOCUMENTOS", nombre: "07 Otros documentos" }, { clave: "EVIDENCIAS_COMPRAS", nombre: "Evidencias de compras" }] },
};

@Injectable()
export class ServicioGoogleDrive {
  private valor(nombre: string) { return process.env[nombre]?.trim() ?? ""; }
  private requerido(nombre: string) {
    const valor = this.valor(nombre);
    if (!valor) throw new ServiceUnavailableException(`Falta configurar ${nombre} en el servidor.`);
    return valor;
  }
  private rutaToken() { return resolve(process.cwd(), this.valor("GOOGLE_DRIVE_TOKEN_FILE") || "storage/google-drive-token.enc"); }
  private claveToken() {
    const clave = Buffer.from(this.requerido("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY"), "base64");
    if (clave.length !== 32) throw new ServiceUnavailableException("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY debe codificar exactamente 32 bytes en base64.");
    return clave;
  }
  configurado() {
    return Boolean(this.valor("GOOGLE_DRIVE_CLIENT_ID") && this.valor("GOOGLE_DRIVE_CLIENT_SECRET") && this.valor("GOOGLE_DRIVE_REDIRECT_URI") && this.carpetaBovedaId() && this.valor("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY"));
  }
  carpetaBovedaId() { return this.valor("GOOGLE_DRIVE_VAULT_FOLDER_ID") || this.valor("GOOGLE_DRIVE_ROOT_FOLDER_ID"); }
  async conectado() {
    try {
      const cuenta = (await this.leerTokens()).cuenta?.toLowerCase();
      const esperada = this.valor("GOOGLE_DRIVE_ACCOUNT_EMAIL").toLowerCase();
      return Boolean(cuenta && (!esperada || cuenta === esperada));
    } catch { return false; }
  }
  async cuentaConectada() {
    try { return (await this.leerTokens()).cuenta ?? null; } catch { return null; }
  }
  async puedeListarCarpetasExistentes() {
    try {
      return (await this.leerTokens()).alcances?.includes(ALCANCE_METADATOS_DRIVE) ?? false;
    } catch { return false; }
  }
  async guardarTokens(tokens: TokensDrive) {
    const iv = randomBytes(12);
    const cifrador = createCipheriv("aes-256-gcm", this.claveToken(), iv);
    const contenido = Buffer.concat([cifrador.update(JSON.stringify(tokens), "utf8"), cifrador.final()]);
    const sobre = Buffer.concat([iv, cifrador.getAuthTag(), contenido]);
    const ruta = this.rutaToken();
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, sobre, { mode: 0o600 });
  }
  private async leerTokens(): Promise<TokensDrive> {
    const sobre = await readFile(this.rutaToken());
    if (sobre.length < 29) throw new Error("Archivo de conexión de Drive inválido.");
    const descifrador = createDecipheriv("aes-256-gcm", this.claveToken(), sobre.subarray(0, 12));
    descifrador.setAuthTag(sobre.subarray(12, 28));
    return JSON.parse(Buffer.concat([descifrador.update(sobre.subarray(28)), descifrador.final()]).toString("utf8")) as TokensDrive;
  }
  async intercambiarCodigo(codigo: string) {
    const formulario = new URLSearchParams({ code: codigo, client_id: this.requerido("GOOGLE_DRIVE_CLIENT_ID"), client_secret: this.requerido("GOOGLE_DRIVE_CLIENT_SECRET"), redirect_uri: this.requerido("GOOGLE_DRIVE_REDIRECT_URI"), grant_type: "authorization_code" });
    const respuesta = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formulario });
    const datos = await respuesta.json() as TokensDrive & { access_token?: string; scope?: string; error?: string; error_description?: string };
    if (!respuesta.ok) throw new BadRequestException(datos.error_description || "Google no pudo completar la conexión de Drive.");
    if (!datos.access_token) throw new BadRequestException("Google no devolvió el token de acceso esperado.");
    const respuestaCuenta = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${datos.access_token}` } });
    const cuenta = await respuestaCuenta.json() as { email?: string; email_verified?: boolean };
    const cuentaEsperada = this.valor("GOOGLE_DRIVE_ACCOUNT_EMAIL").toLowerCase();
    if (!respuestaCuenta.ok || !cuenta.email || cuenta.email_verified !== true) throw new BadRequestException("Google no pudo verificar la cuenta autorizada.");
    if (cuentaEsperada && cuenta.email.toLowerCase() !== cuentaEsperada) throw new BadRequestException("Autorizaste una cuenta de Google distinta a la cuenta configurada para Inversiones Maguiña.");
    const anterior = await this.leerTokens().catch(() => undefined);
    const refreshToken = datos.refresh_token || anterior?.refresh_token;
    if (!refreshToken) throw new BadRequestException("Google no devolvió una autorización renovable. Vuelve a conectar la cuenta y acepta el acceso.");
    const alcances = datos.scope?.split(" ").filter(Boolean) ?? anterior?.alcances ?? [];
    await this.guardarTokens({ refresh_token: refreshToken, cuenta: cuenta.email, alcances });
  }
  async obtenerTokenAcceso() {
    const tokens = await this.leerTokens();
    const esperada = this.valor("GOOGLE_DRIVE_ACCOUNT_EMAIL").toLowerCase();
    if (!tokens.cuenta || (esperada && tokens.cuenta.toLowerCase() !== esperada)) {
      throw new ServiceUnavailableException("Conecta Google Drive con la cuenta configurada para Inversiones Maguiña.");
    }
    const formulario = new URLSearchParams({ client_id: this.requerido("GOOGLE_DRIVE_CLIENT_ID"), client_secret: this.requerido("GOOGLE_DRIVE_CLIENT_SECRET"), refresh_token: tokens.refresh_token, grant_type: "refresh_token" });
    const respuesta = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: formulario });
    const datos = await respuesta.json() as { access_token?: string; expires_in?: number; error_description?: string };
    if (!respuesta.ok || !datos.access_token) throw new ServiceUnavailableException(datos.error_description || "No se pudo renovar el acceso a Google Drive. Reconecta la cuenta.");
    return { accessToken: datos.access_token, expiresIn: datos.expires_in ?? 3600 };
  }
  private async drive<T>(ruta: string, opciones: RequestInit = {}, base = API_DRIVE): Promise<T> {
    const { accessToken } = await this.obtenerTokenAcceso();
    const respuesta = await fetch(`${base}${ruta}`, { ...opciones, headers: { Authorization: `Bearer ${accessToken}`, ...opciones.headers } });
    const datos = await respuesta.json().catch(() => ({})) as T & { error?: { message?: string } };
    if (!respuesta.ok) throw new BadRequestException(datos.error?.message || `Google Drive respondió ${respuesta.status}.`);
    return datos;
  }
  async listarCarpetas(padreId = this.carpetaBovedaId()) {
    await this.validarCarpeta(padreId);
    const q = encodeURIComponent(`'${padreId.replace(/'/g, "\\'")}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const datos = await this.drive<{ files: ArchivoDrive[] }>(`/files?q=${q}&pageSize=100&orderBy=name&fields=files(id,name,mimeType,modifiedTime,parents)`);
    return datos.files ?? [];
  }
  async listarArchivos(carpetaId: string) {
    await this.validarCarpeta(carpetaId);
    const q = encodeURIComponent(`'${carpetaId.replace(/'/g, "\\'")}' in parents and trashed = false`);
    const datos = await this.drive<{ files: ArchivoDrive[] }>(`/files?q=${q}&pageSize=100&orderBy=modifiedTime desc&fields=files(id,name,mimeType,webViewLink,modifiedTime,parents)`);
    return datos.files ?? [];
  }
  private async validarCarpeta(carpetaId: string) {
    const root = this.carpetaBovedaId();
    if (carpetaId === root) return;
    let actual = carpetaId;
    for (let nivel = 0; nivel < 12; nivel += 1) {
      const carpeta = await this.drive<ArchivoDrive>(`/files/${encodeURIComponent(actual)}?fields=id,name,mimeType,parents`);
      if (carpeta.mimeType !== "application/vnd.google-apps.folder") throw new BadRequestException("El destino no es una carpeta de Drive.");
      if (carpeta.parents?.includes(root)) return;
      actual = carpeta.parents?.[0] ?? "";
      if (!actual) break;
    }
    throw new BadRequestException("Solo puedes trabajar dentro de la Bóveda de información y sus subcarpetas.");
  }
  async crearCarpeta(padreId: string, nombre: string) {
    await this.validarCarpeta(padreId);
    const nombreLimpio = nombre.trim().slice(0, 180);
    if (!nombreLimpio) throw new BadRequestException("Indica el nombre de la carpeta.");
    const consulta = encodeURIComponent(`'${padreId}' in parents and name = '${nombreLimpio.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const existentes = await this.drive<{ files: ArchivoDrive[] }>(`/files?q=${consulta}&pageSize=10&fields=files(id,name,mimeType,webViewLink,modifiedTime,parents)`);
    if (existentes.files?.[0]) return existentes.files[0];
    return this.drive<ArchivoDrive>("/files?fields=id,name,mimeType,webViewLink,modifiedTime,parents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nombreLimpio, mimeType: "application/vnd.google-apps.folder", parents: [padreId] }) });
  }
  private async destino(tipoArchivo: DestinoArchivoDrive) {
    if (!await this.puedeListarCarpetasExistentes()) throw new ServiceUnavailableException("El administrador debe habilitar la lectura de nombres de carpeta de Drive antes de crear los destinos de documentos.");
    let padreId = this.carpetaBovedaId();
    let rutaLogica = "";
    for (const carpeta of destinos[tipoArchivo].carpetas) {
      rutaLogica = `${rutaLogica}/${carpeta.nombre}`;
      const [guardada] = await db.select().from(carpetasDrive).where(eq(carpetasDrive.clave, carpeta.clave)).limit(1);
      if (guardada && guardada.driveFolderId) {
        padreId = guardada.driveFolderId;
        continue;
      }
      const creada = await this.crearCarpeta(padreId, carpeta.nombre);
      const carpetaDrive = { clave: carpeta.clave, nombre: carpeta.nombre, rutaLogica, driveFolderId: creada.id, driveFolderUrl: `https://drive.google.com/drive/folders/${creada.id}` };
      await db.insert(carpetasDrive).values(carpetaDrive).onConflictDoUpdate({ target: carpetasDrive.clave, set: { nombre: carpetaDrive.nombre, rutaLogica: carpetaDrive.rutaLogica, driveFolderId: carpetaDrive.driveFolderId, driveFolderUrl: carpetaDrive.driveFolderUrl, actualizadoEn: new Date() } });
      padreId = creada.id;
    }
    const clave = destinos[tipoArchivo].carpetas.at(-1)!.clave;
    const [carpeta] = await db.select().from(carpetasDrive).where(eq(carpetasDrive.clave, clave)).limit(1);
    if (!carpeta) throw new ServiceUnavailableException("No se pudo registrar el destino de almacenamiento en la base de datos.");
    return carpeta;
  }
  async guardarArchivo(destinoArchivo: DestinoArchivoDrive, tipoArchivo: string, entidadTipo: string, entidadId: string, nombre: string, mime: string, contenido: Buffer, urlFuente?: string) {
    const carpeta = await this.destino(destinoArchivo);
    const creado = await this.subirArchivo(carpeta.driveFolderId, nombre, mime, contenido);
    try {
      const [registro] = await db.insert(archivosDrive).values({ tipoArchivo, entidadTipo, entidadId, carpetaClave: carpeta.clave, driveFolderId: carpeta.driveFolderId, driveFileId: creado.id, nombre: creado.name, mimeType: creado.mimeType, tamanoBytes: contenido.length, sha256: createHash("sha256").update(contenido).digest("hex"), urlFuente: urlFuente ?? null }).returning();
      return { ...registro, ruta: `/integraciones/archivos/${registro.id}/contenido`, webViewLink: creado.webViewLink };
    } catch (error) {
      await this.enviarAPapelera(creado.id).catch(() => undefined);
      throw error;
    }
  }
  async descargarArchivoRegistrado(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException("El archivo no es válido.");
    const [registro] = await db.select().from(archivosDrive).where(eq(archivosDrive.id, id)).limit(1);
    if (!registro) throw new BadRequestException("No se encontró el archivo.");
    const { accessToken } = await this.obtenerTokenAcceso();
    const respuesta = await fetch(`${API_DRIVE}/files/${encodeURIComponent(registro.driveFileId)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!respuesta.ok) throw new ServiceUnavailableException(`No se pudo leer el archivo guardado (${respuesta.status}).`);
    return { contenido: Buffer.from(await respuesta.arrayBuffer()), mime: registro.mimeType, nombre: registro.nombre };
  }
  async eliminarArchivoRegistrado(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException("El archivo no es válido.");
    const [registro] = await db.select().from(archivosDrive).where(eq(archivosDrive.id, id)).limit(1);
    if (!registro) return false;
    await this.enviarAPapelera(registro.driveFileId);
    await db.delete(archivosDrive).where(eq(archivosDrive.id, id));
    return true;
  }
  async subirImagenCatalogo(tipo: "categorias" | "marcas" | "productos", idRegistro: string, nombre: string, mime: string, contenido: Buffer) {
    const extension = nombre.match(/\.(jpg|jpeg|png|webp)$/i)?.[0]?.toLowerCase() ?? ".img";
    const tipoArchivo = tipo === "productos" ? "FOTO_REPUESTO" : tipo === "categorias" ? "FOTO_CATEGORIA" : "FOTO_MARCA";
    const entidadTipo = tipo === "productos" ? "PRODUCTO" : tipo === "categorias" ? "CATEGORIA" : "MARCA";
    const archivo = await this.guardarArchivo(tipoArchivo, tipoArchivo, entidadTipo, idRegistro, `${idRegistro}-${randomBytes(5).toString("hex")}${extension}`, mime, contenido);
    return { ...archivo, rutaImagen: archivo.ruta };
  }
  async archivarDocumentosNubeFact(entidadTipo: string, entidadId: string, tipoComprobante: string, codigo: string, respuestaProveedor: Record<string, unknown>) {
    const destino = ({ BOLETA: "BOLETA", FACTURA: "FACTURA", NOTA_VENTA: "NOTA_VENTA", NOTA_CREDITO: "NOTA_CREDITO", NOTA_DEBITO: "NOTA_DEBITO" } as Record<string, DestinoArchivoDrive>)[tipoComprobante];
    if (!destino) throw new BadRequestException("El tipo de comprobante no tiene un destino de almacenamiento configurado.");
    const documentos = [
      { campo: "enlace_del_pdf", sufijo: "PDF", extension: "pdf", mime: "application/pdf" },
      { campo: "enlace_del_xml", sufijo: "XML", extension: "xml", mime: "application/xml" },
      { campo: "enlace_del_cdr", sufijo: "CDR", extension: "zip", mime: "application/zip" },
    ] as const;
    const guardados: { id: string; tipo: string; nombre: string; ruta: string }[] = [];
    const errores: { tipo: string; mensaje: string }[] = [];
    const rutaNubeFact = this.valor("NUBEFACT_RUTA");
    const hostConfigurado = (() => { try { return new URL(rutaNubeFact).hostname.toLowerCase(); } catch { return ""; } })();
    for (const documento of documentos) {
      const urlFuente = respuestaProveedor[documento.campo];
      if (typeof urlFuente !== "string" || !urlFuente.trim()) continue;
      try {
        const url = new URL(urlFuente);
        const host = url.hostname.toLowerCase();
        const dominioPermitido = host === hostConfigurado || ["api.nubefact.com", "api.pse.pe", "nubefact.pse.pe"].includes(host);
        if (url.protocol !== "https:" || url.username || url.password || !dominioPermitido) throw new BadRequestException("NubeFact devolvió un enlace de documento no permitido.");
        const existente = await db.select({ id: archivosDrive.id, nombre: archivosDrive.nombre }).from(archivosDrive)
          .where(and(eq(archivosDrive.entidadTipo, entidadTipo), eq(archivosDrive.entidadId, entidadId), eq(archivosDrive.tipoArchivo, `${tipoComprobante}_${documento.sufijo}`))).limit(1);
        if (existente[0]) { guardados.push({ ...existente[0], tipo: documento.sufijo, ruta: `/integraciones/archivos/${existente[0].id}/contenido` }); continue; }
        const respuesta = await fetch(url, { headers: { Authorization: this.requerido("NUBEFACT_TOKEN"), Accept: "application/pdf, application/xml, application/zip, application/octet-stream" }, signal: AbortSignal.timeout(20000) });
        if (!respuesta.ok) throw new Error(`NubeFact respondió ${respuesta.status} al descargar ${documento.sufijo}.`);
        const longitud = Number(respuesta.headers.get("content-length") ?? 0);
        if (longitud > 20 * 1024 * 1024) throw new Error(`El archivo ${documento.sufijo} supera el límite de 20 MB.`);
        const contenido = Buffer.from(await respuesta.arrayBuffer());
        if (!contenido.length || contenido.length > 20 * 1024 * 1024) throw new Error(`El archivo ${documento.sufijo} está vacío o supera el límite de 20 MB.`);
        const mime = respuesta.headers.get("content-type")?.split(";")[0]?.trim() || documento.mime;
        const nombre = `${codigo.replace(/[^A-Za-z0-9_-]/g, "_")}-${documento.sufijo.toLowerCase()}.${documento.extension}`;
        const guardado = await this.guardarArchivo(destino, `${tipoComprobante}_${documento.sufijo}`, entidadTipo, entidadId, nombre, mime, contenido, urlFuente);
        guardados.push({ id: guardado.id, tipo: documento.sufijo, nombre, ruta: guardado.ruta });
      } catch (causa) {
        errores.push({ tipo: documento.sufijo, mensaje: causa instanceof Error ? causa.message : "No se pudo archivar el documento de NubeFact." });
      }
    }
    return { guardados, errores };
  }
  async archivarDocumentoNotaVenta(venta: { id: string; codigo: string; fecha: string; clienteNombre: string | null; clienteNumeroDocumento: string | null; clienteDireccion: string | null; medioPago: string; total: string; subtotal: string; igv: string; detalles: { descripcion: string; cantidad: string; precioUnitario: string; subtotal: string; total: string; unidadMedidaCodigo: string | null }[] }) {
    const entidadesHtml: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" };
    const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => entidadesHtml[caracter]);
    const filas = venta.detalles.map((linea) => `<tr><td>${escapar(linea.descripcion)}<small>${escapar(linea.unidadMedidaCodigo ?? "")}</small></td><td>${escapar(linea.cantidad)}</td><td>S/ ${escapar(linea.precioUnitario)}</td><td>S/ ${escapar(linea.total)}</td></tr>`).join("");
    const fecha = new Date(`${venta.fecha.slice(0, 10)}T00:00:00Z`).toLocaleDateString("es-PE", { timeZone: "UTC" });
    const documento = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nota de venta ${escapar(venta.codigo)}</title><style>body{font:15px Arial,sans-serif;color:#172033;max-width:820px;margin:40px auto;padding:24px}header{display:flex;justify-content:space-between;border-bottom:2px solid #17365d;padding-bottom:16px}h1{font-size:25px;margin:0}p{margin:6px 0;color:#536176}table{width:100%;border-collapse:collapse;margin:28px 0}th,td{border-bottom:1px solid #dce3ed;padding:11px;text-align:left}th{background:#f2f5f9}td small{display:block;color:#69798d;margin-top:4px}.totales{margin-left:auto;width:260px}.totales div{display:flex;justify-content:space-between;padding:7px}.totales .total{border-top:2px solid #17365d;font-size:18px;font-weight:bold}.nota{margin-top:32px;padding:12px;background:#f2f5f9}@media print{body{margin:0 auto;padding:0}}</style></head><body><header><div><h1>Nota de venta</h1><p>Documento interno · No es comprobante electrónico</p></div><div><strong>${escapar(venta.codigo)}</strong><p>${escapar(fecha)}</p></div></header><section><p><strong>Cliente:</strong> ${escapar(venta.clienteNombre || "Cliente no especificado")}</p><p><strong>Documento:</strong> ${escapar(venta.clienteNumeroDocumento || "No registrado")}</p><p><strong>Dirección:</strong> ${escapar(venta.clienteDireccion || "No registrada")}</p></section><table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${filas}</tbody></table><div class="totales"><div><span>Subtotal</span><span>S/ ${escapar(venta.subtotal)}</span></div><div><span>IGV</span><span>S/ ${escapar(venta.igv)}</span></div><div class="total"><span>Total</span><span>S/ ${escapar(venta.total)}</span></div></div><p class="nota"><strong>Pago:</strong> ${escapar(venta.medioPago)}</p></body></html>`;
    return this.guardarArchivo("NOTA_VENTA", "NOTA_VENTA_HTML", "INGRESO", venta.id, `${venta.codigo}.html`, "text/html", Buffer.from(documento, "utf8"));
  }
  async descargarImagen(id: string) {
    await this.archivoPerteneceACarpeta(id);
    const { accessToken } = await this.obtenerTokenAcceso();
    const respuesta = await fetch(`${API_DRIVE}/files/${encodeURIComponent(id)}?alt=media`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!respuesta.ok) throw new ServiceUnavailableException(`No se pudo leer la imagen guardada en Drive (${respuesta.status}).`);
    return { contenido: Buffer.from(await respuesta.arrayBuffer()), mime: respuesta.headers.get("content-type") ?? "application/octet-stream" };
  }
  private async archivoPerteneceACarpeta(id: string) {
    const archivo = await this.drive<ArchivoDrive>(`/files/${encodeURIComponent(id)}?fields=id,parents`);
    for (const padre of archivo.parents ?? []) {
      try { await this.validarCarpeta(padre); return; } catch { /* Busca un padre dentro de la raíz autorizada. */ }
    }
    throw new BadRequestException("El archivo no pertenece a la Bóveda de información.");
  }
  async subirArchivo(carpetaId: string, nombre: string, mime: string, contenido: Buffer) {
    await this.validarCarpeta(carpetaId);
    const boundary = `magina_${randomBytes(12).toString("hex")}`;
    const metadata = JSON.stringify({ name: nombre, mimeType: mime || "application/octet-stream", parents: [carpetaId] });
    const cuerpo = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mime || "application/octet-stream"}\r\n\r\n`),
      contenido,
      Buffer.from(`\r\n--${boundary}--`),
    ]);
    return this.drive<ArchivoDrive>(`/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime,parents`, { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body: cuerpo }, "https://www.googleapis.com/upload/drive/v3");
  }
  async renombrarArchivo(id: string, nombre: string) {
    const archivo = await this.drive<ArchivoDrive>(`/files/${encodeURIComponent(id)}?fields=id,name,mimeType,parents`);
    if (!archivo.parents?.length || !(await Promise.all(archivo.parents.map(async (padre) => padre === this.carpetaBovedaId() || (await this.carpetaEsHija(padre))))).some(Boolean)) throw new BadRequestException("El archivo no pertenece a la Bóveda de información.");
    return this.drive<ArchivoDrive>(`/files/${encodeURIComponent(id)}?fields=id,name,mimeType,webViewLink,modifiedTime`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: nombre }) });
  }
  private async carpetaEsHija(id: string) {
    try { await this.validarCarpeta(id); return true; } catch { return false; }
  }
  async enviarAPapelera(id: string) {
    const archivo = await this.drive<ArchivoDrive>(`/files/${encodeURIComponent(id)}?fields=id,parents`);
    let perteneceABoveda = false;
    for (const padre of archivo.parents ?? []) {
      if (padre === this.carpetaBovedaId() || await this.carpetaEsHija(padre)) { perteneceABoveda = true; break; }
    }
    if (!perteneceABoveda) throw new BadRequestException("El archivo no pertenece a la Bóveda de información.");
    return this.drive<ArchivoDrive>(`/files/${encodeURIComponent(id)}?fields=id,name,trashed`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trashed: true }) });
  }
  readonly scope = ALCANCE_DRIVE;
  readonly scopeMetadata = ALCANCE_METADATOS_DRIVE;
}
