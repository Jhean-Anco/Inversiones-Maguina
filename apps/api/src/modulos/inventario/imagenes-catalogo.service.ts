import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { categoriasProductos, db, marcasProductos, productos, productosImagenes } from "@magina/database";
import type { FastifyRequest } from "fastify";
import { readFile, unlink } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { and, asc, eq } from "drizzle-orm";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";
import { ServicioGoogleDrive } from "../google-drive/google-drive.service";

type TipoImagen = "categorias" | "marcas" | "productos";
const formatos = {
  "image/jpeg": { extension: ".jpg", firma: (b: Buffer) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { extension: ".png", firma: (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: ".webp", firma: (b: Buffer) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
} as const;

@Injectable()
export class ServicioImagenesCatalogo {
  constructor(private readonly drive: ServicioGoogleDrive) {}

  private validarTipo(tipo: string): TipoImagen {
    if (tipo !== "categorias" && tipo !== "marcas" && tipo !== "productos") throw new NotFoundException("No se encontró la imagen.");
    return tipo;
  }

  async guardar(tipoEntrada: string, id: string, solicitud: FastifyRequest) {
    const tipo = this.validarTipo(tipoEntrada);
    if (tipo === "productos") return this.guardarImagenProducto(id, solicitud);
    const archivo = await solicitud.file();
    if (!archivo) throw new BadRequestException("Selecciona una imagen para subir.");
    const formato = formatos[archivo.mimetype as keyof typeof formatos];
    if (!formato) throw new BadRequestException("El archivo debe ser JPG, PNG o WebP.");
    const contenido = await archivo.toBuffer();
    if (contenido.length > validarConfiguracionEntorno().maximoImagenBytes) throw new BadRequestException("La imagen supera el tamaño máximo permitido.");
    if (!formato.firma(contenido)) throw new BadRequestException("El contenido no coincide con el formato de imagen seleccionado.");

    const tabla = tipo === "categorias" ? categoriasProductos : marcasProductos;
    const [registro] = await db.select({ id: tabla.id, rutaImagen: tabla.rutaImagen }).from(tabla).where(eq(tabla.id, id)).limit(1);
    if (!registro) throw new NotFoundException(tipo === "categorias" ? "No se encontró la categoría." : tipo === "marcas" ? "No se encontró la marca." : "No se encontró el producto.");

    const subida = await this.drive.subirImagenCatalogo(tipo, id, archivo.filename, archivo.mimetype, contenido);
    const rutaImagen = subida.rutaImagen;

    try {
      await db.update(tabla).set({ rutaImagen }).where(eq(tabla.id, id));
    } catch (error) {
      await this.drive.eliminarArchivoRegistrado(subida.id).catch(() => undefined);
      throw error;
    }

    await this.eliminarArchivoAnterior(registro.rutaImagen);
    return { rutaImagen };
  }

  private async guardarImagenProducto(id: string, solicitud: FastifyRequest) {
    const archivo = await solicitud.file();
    if (!archivo) throw new BadRequestException("Selecciona una imagen para subir.");
    const formato = formatos[archivo.mimetype as keyof typeof formatos];
    if (!formato) throw new BadRequestException("El archivo debe ser JPG, PNG o WebP.");
    const contenido = await archivo.toBuffer();
    if (contenido.length > validarConfiguracionEntorno().maximoImagenBytes) throw new BadRequestException("La imagen supera el tamaño máximo permitido.");
    if (!formato.firma(contenido)) throw new BadRequestException("El contenido no coincide con el formato de imagen seleccionado.");

    const [producto] = await db.select({ id: productos.id, rutaImagen: productos.rutaImagen }).from(productos).where(eq(productos.id, id)).limit(1);
    if (!producto) throw new NotFoundException("No se encontró el producto.");
    const imagenes = await db.select({ orden: productosImagenes.orden }).from(productosImagenes).where(eq(productosImagenes.productoId, id));
    const orden = [1, 2, 3, 4, 5].find((numero) => !imagenes.some((imagen) => imagen.orden === numero));
    if (!orden) throw new BadRequestException("Cada producto admite como máximo cinco imágenes. Quita una antes de agregar otra.");

    const subida = await this.drive.subirImagenCatalogo("productos", id, archivo.filename, archivo.mimetype, contenido);
    const rutaImagen = subida.rutaImagen;
    try {
      const [imagen] = await db.transaction(async (tx) => {
        const [creada] = await tx.insert(productosImagenes).values({ productoId: id, rutaImagen, orden }).returning({ id: productosImagenes.id, orden: productosImagenes.orden, rutaImagen: productosImagenes.rutaImagen });
        if (!producto.rutaImagen) await tx.update(productos).set({ rutaImagen }).where(eq(productos.id, id));
        return [creada];
      });
      return imagen;
    } catch (error) {
      await this.drive.eliminarArchivoRegistrado(subida.id).catch(() => undefined);
      throw error;
    }
  }

  async eliminarImagenProducto(id: string, idImagen: string) {
    if (![id, idImagen].every((valor) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor))) {
      throw new BadRequestException("El identificador de la imagen no es válido.");
    }
    const [imagen] = await db.select({ id: productosImagenes.id, rutaImagen: productosImagenes.rutaImagen })
      .from(productosImagenes).where(and(eq(productosImagenes.id, idImagen), eq(productosImagenes.productoId, id))).limit(1);
    if (!imagen) throw new NotFoundException("No se encontró la imagen del producto.");
    const restantes = await db.transaction(async (tx) => {
      await tx.delete(productosImagenes).where(eq(productosImagenes.id, idImagen));
      const filas = await tx.select({ rutaImagen: productosImagenes.rutaImagen })
        .from(productosImagenes).where(eq(productosImagenes.productoId, id)).orderBy(asc(productosImagenes.orden));
      await tx.update(productos).set({ rutaImagen: filas[0]?.rutaImagen ?? null }).where(eq(productos.id, id));
      return filas;
    });
    await this.eliminarArchivoAnterior(imagen.rutaImagen);
    return { eliminado: true, cantidadRestante: restantes.length };
  }

  private async eliminarArchivoAnterior(ruta: string | null) {
    if (!ruta) return;
    const idRegistroDrive = ruta.match(/^\/integraciones\/archivos\/([0-9a-f-]{36})\/contenido$/i)?.[1];
    if (idRegistroDrive) { await this.drive.eliminarArchivoRegistrado(idRegistroDrive).catch(() => undefined); return; }
    const idDrive = ruta.match(/^\/integraciones\/google-drive\/imagenes\/([A-Za-z0-9_-]+)$/)?.[1];
    if (idDrive) { await this.drive.enviarAPapelera(idDrive).catch(() => undefined); return; }
    const coincidencia = ruta.match(/^\/inventario\/imagenes\/(categorias|marcas|productos)\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/);
    if (coincidencia) await unlink(resolve(validarConfiguracionEntorno().carpetaSubidas, "catalog-images", coincidencia[1], coincidencia[2])).catch(() => undefined);
  }

  async migrarImagenesLocales() {
    const rutasMigradas = new Map<string, string>();
    const errores: { tipo: string; registroId: string; mensaje: string }[] = [];
    let migradas = 0;
    const migrar = async (tipo: TipoImagen, registroId: string, ruta: string | null, guardarRuta: (nueva: string) => Promise<void>) => {
      if (!ruta || ruta.startsWith("/integraciones/google-drive/imagenes/") || ruta.startsWith("/integraciones/archivos/")) return;
      if (!ruta.startsWith(`/inventario/imagenes/${tipo}/`)) return;
      const nombre = ruta.split("/").at(-1) ?? "";
      if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) { errores.push({ tipo, registroId, mensaje: "La ruta local no tiene un nombre de imagen válido." }); return; }
      const rutaExistente = rutasMigradas.get(ruta);
      if (rutaExistente) { await guardarRuta(rutaExistente); return; }
      const mime = nombre.endsWith(".jpg") ? "image/jpeg" : nombre.endsWith(".png") ? "image/png" : "image/webp";
      try {
        const contenido = await readFile(resolve(validarConfiguracionEntorno().carpetaSubidas, "catalog-images", tipo, nombre));
        const archivo = await this.drive.subirImagenCatalogo(tipo, registroId, nombre, mime, contenido);
        await guardarRuta(archivo.rutaImagen);
        rutasMigradas.set(ruta, archivo.rutaImagen);
        migradas += 1;
      } catch (causa) {
        errores.push({ tipo, registroId, mensaje: causa instanceof Error ? causa.message : "No se pudo migrar la imagen." });
      }
    };

    for (const registro of await db.select({ id: categoriasProductos.id, rutaImagen: categoriasProductos.rutaImagen }).from(categoriasProductos)) {
      await migrar("categorias", registro.id, registro.rutaImagen, async (rutaImagen) => { await db.update(categoriasProductos).set({ rutaImagen }).where(eq(categoriasProductos.id, registro.id)); });
    }
    for (const registro of await db.select({ id: marcasProductos.id, rutaImagen: marcasProductos.rutaImagen }).from(marcasProductos)) {
      await migrar("marcas", registro.id, registro.rutaImagen, async (rutaImagen) => { await db.update(marcasProductos).set({ rutaImagen }).where(eq(marcasProductos.id, registro.id)); });
    }
    for (const registro of await db.select({ id: productosImagenes.id, productoId: productosImagenes.productoId, rutaImagen: productosImagenes.rutaImagen }).from(productosImagenes)) {
      await migrar("productos", registro.productoId, registro.rutaImagen, async (rutaImagen) => { await db.update(productosImagenes).set({ rutaImagen }).where(eq(productosImagenes.id, registro.id)); });
    }
    for (const registro of await db.select({ id: productos.id, rutaImagen: productos.rutaImagen }).from(productos)) {
      await migrar("productos", registro.id, registro.rutaImagen, async (rutaImagen) => { await db.update(productos).set({ rutaImagen }).where(eq(productos.id, registro.id)); });
    }
    return { migradas, errores };
  }

  async leer(tipoEntrada: string, nombreArchivo: string) {
    const tipo = this.validarTipo(tipoEntrada);
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombreArchivo)) throw new NotFoundException("No se encontró la imagen.");
    const extension = extname(nombreArchivo);
    const tipoContenido = extension === ".jpg" ? "image/jpeg" : extension === ".png" ? "image/png" : "image/webp";
    try {
      const contenido = await readFile(resolve(validarConfiguracionEntorno().carpetaSubidas, "catalog-images", tipo, nombreArchivo));
      return { contenido, tipoContenido };
    } catch {
      throw new NotFoundException("No se encontró la imagen.");
    }
  }
}
