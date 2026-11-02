import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  categoriasProductos,
  db,
  marcasProductos,
  preciosProductos,
  productos,
  productosCodigos,
  productosImagenes,
  productosPresentaciones,
  saldosStock,
  tiposListasPrecio,
  unidadesMedida,
} from "@magina/database";
import { and, asc, count, eq, exists, gt, ilike, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { fechaActualPeru } from "../../utilidades/fecha-peru";

type RegistroPresentacion = { clave?: unknown; unidadMedidaCodigo?: unknown; nombre?: unknown; factorAUnidadBase?: unknown; seCompra?: unknown; seVende?: unknown };
type RegistroPrecio = { presentacionClave?: unknown; tipoListaPrecioId?: unknown; precio?: unknown; cantidadMinima?: unknown; vigenteDesde?: unknown; vigenteHasta?: unknown };
type RegistroCodigo = { tipo?: unknown; codigo?: unknown };
type DatosProducto = {
  nombre?: unknown; descripcion?: unknown; categoriaId?: unknown; marcaId?: unknown;
  unidadBaseCodigo?: unknown; stockMinimo?: unknown; afectoIgv?: unknown; afectacionIgv?: unknown; fichaTecnica?: unknown; codigos?: unknown;
  presentaciones?: unknown; precios?: unknown; activo?: unknown;
};

const texto = (valor: unknown, nombre: string, maximo: number, minimo = 1) => {
  if (typeof valor !== "string" || valor.trim().length < minimo || valor.trim().length > maximo) {
    throw new BadRequestException(`${nombre} debe tener entre ${minimo} y ${maximo} caracteres.`);
  }
  return valor.trim();
};
const decimal = (valor: unknown, nombre: string, minimo: number, escala: number) => {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(numero) || numero < minimo || Number(numero.toFixed(escala)) !== numero) throw new BadRequestException(`${nombre} no es válido.`);
  return numero.toFixed(escala);
};
const uuid = (valor: unknown, nombre: string) => {
  if (typeof valor !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)) throw new BadRequestException(`${nombre} no es válido.`);
  return valor;
};

@Injectable()
export class ServicioProductos {
  async catalogos() {
    const [categorias, marcas, unidades, listas] = await Promise.all([
      db.select({ id: categoriasProductos.id, nombre: categoriasProductos.nombre }).from(categoriasProductos).where(eq(categoriasProductos.activo, true)).orderBy(asc(categoriasProductos.nombre)),
      db.select({ id: marcasProductos.id, nombre: marcasProductos.nombre }).from(marcasProductos).where(eq(marcasProductos.activo, true)).orderBy(asc(marcasProductos.nombre)),
      db.select({ codigo: unidadesMedida.codigo, nombre: unidadesMedida.nombre }).from(unidadesMedida).where(and(eq(unidadesMedida.activo, true), sql`${unidadesMedida.codigo} <> 'ZZ'`)).orderBy(asc(unidadesMedida.nombre)),
      db.select({ id: tiposListasPrecio.id, codigo: tiposListasPrecio.codigo, nombre: tiposListasPrecio.nombre }).from(tiposListasPrecio).where(eq(tiposListasPrecio.activo, true)).orderBy(asc(tiposListasPrecio.id)),
    ]);
    return { categorias, marcas, unidadesMedida: unidades, tiposListasPrecio: listas };
  }

  async alertasStockBajo() {
    const stockActual = sql<string>`coalesce(${saldosStock.cantidad}, 0)::numeric(18,3)`;
    return db.select({
      id: productos.id,
      codigo: productos.codigoInterno,
      nombre: productos.nombre,
      stockActual,
      stockMinimo: productos.stockMinimo,
      unidad: unidadesMedida.nombre,
    }).from(productos)
      .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
      .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
      .where(and(eq(productos.activo, true), gt(productos.stockMinimo, "0"), lte(stockActual, productos.stockMinimo)))
      .orderBy(asc(sql`${stockActual} / nullif(${productos.stockMinimo}, 0)`), asc(productos.nombre));
  }

  async listar(filtros: { pagina?: string; porPagina?: string; busqueda?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const tamano = Number.parseInt(filtros.porPagina ?? "12", 10);
    const porPagina = [12, 16, 20].includes(tamano) ? tamano : 12;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condicion = coincidencia ? or(
      ilike(productos.nombre, coincidencia),
      ilike(productos.descripcion, coincidencia),
      ilike(productos.codigoInterno, coincidencia),
      exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), ilike(productosCodigos.codigo, coincidencia)))),
    ) : undefined;

    const [items, [total]] = await Promise.all([
      db.select({
        id: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre, descripcion: productos.descripcion,
        rutaImagen: productos.rutaImagen, activo: productos.activo, creadoEn: productos.creadoEn,
        categoriaId: categoriasProductos.id, categoria: categoriasProductos.nombre,
        marcaId: marcasProductos.id, marca: marcasProductos.nombre,
        unidadBaseCodigo: unidadesMedida.codigo, unidadBase: unidadesMedida.nombre,
      }).from(productos)
        .innerJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
        .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
        .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
        .where(condicion).orderBy(asc(productos.nombre)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(productos).where(condicion),
    ]);
    const totalRegistros = total?.total ?? 0;
    return { items, total: totalRegistros, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(totalRegistros / porPagina)) };
  }

  async consultar(idEntrada: string) {
    const id = uuid(idEntrada, "El producto");
    const [producto] = await db.select({
      id: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre, descripcion: productos.descripcion,
      categoriaId: productos.categoriaId, marcaId: productos.marcaId,
      unidadBaseCodigo: productos.unidadBaseCodigo, stockMinimo: productos.stockMinimo, afectacionIgv: productos.afectacionIgv, afectoIgv: productos.afectoIgv, rutaImagen: productos.rutaImagen,
      fichaTecnica: productos.fichaTecnica, activo: productos.activo, creadoEn: productos.creadoEn, actualizadoEn: productos.actualizadoEn,
      categoria: categoriasProductos.nombre, marca: marcasProductos.nombre, unidadBase: unidadesMedida.nombre,
    }).from(productos)
      .innerJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
      .where(eq(productos.id, id)).limit(1);
    if (!producto) throw new NotFoundException("No se encontró el producto.");

    const [codigos, imagenes, presentaciones, precios] = await Promise.all([
      db.select().from(productosCodigos).where(eq(productosCodigos.productoId, id)).orderBy(asc(productosCodigos.tipo)),
      db.select({ id: productosImagenes.id, rutaImagen: productosImagenes.rutaImagen, orden: productosImagenes.orden })
        .from(productosImagenes).where(eq(productosImagenes.productoId, id)).orderBy(asc(productosImagenes.orden)),
      db.select({ id: productosPresentaciones.id, clave: productosPresentaciones.id, unidadMedidaCodigo: productosPresentaciones.unidadMedidaCodigo, unidadMedida: unidadesMedida.nombre, nombre: productosPresentaciones.nombre, factorAUnidadBase: productosPresentaciones.factorAUnidadBase, seCompra: productosPresentaciones.seCompra, seVende: productosPresentaciones.seVende, esBase: productosPresentaciones.esBase, activo: productosPresentaciones.activo })
        .from(productosPresentaciones).innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
        .where(and(eq(productosPresentaciones.productoId, id), eq(productosPresentaciones.activo, true))).orderBy(asc(productosPresentaciones.esBase)),
      db.select({ id: preciosProductos.id, presentacionId: preciosProductos.presentacionId, tipoListaPrecioId: preciosProductos.tipoListaPrecioId, tipoLista: tiposListasPrecio.nombre, precio: preciosProductos.precio, cantidadMinima: preciosProductos.cantidadMinima, vigenteDesde: preciosProductos.vigenteDesde, vigenteHasta: preciosProductos.vigenteHasta, activo: preciosProductos.activo })
        .from(preciosProductos).innerJoin(tiposListasPrecio, eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id))
        .where(and(eq(preciosProductos.productoId, id), eq(preciosProductos.activo, true))).orderBy(asc(preciosProductos.tipoListaPrecioId)),
    ]);
    return { ...producto, codigos, presentaciones, precios, imagenes };
  }

  async guardar(entrada: unknown, idExistente?: string) {
    const datos = this.validarDatos(entrada);
    const id = idExistente ? uuid(idExistente, "El producto") : undefined;
    try {
      const productoId = await db.transaction(async (tx) => {
        if (id) {
          const [actualizado] = await tx.update(productos).set({
            nombre: datos.nombre, descripcion: datos.descripcion,
            categoriaId: datos.categoriaId, marcaId: datos.marcaId, unidadBaseCodigo: datos.unidadBaseCodigo,
            stockMinimo: datos.stockMinimo, afectacionIgv: datos.afectacionIgv, afectoIgv: datos.afectoIgv, fichaTecnica: datos.fichaTecnica, ...(datos.activo === undefined ? {} : { activo: datos.activo }),
          }).where(eq(productos.id, id)).returning({ id: productos.id });
          if (!actualizado) throw new NotFoundException("No se encontró el producto.");
          await tx.delete(preciosProductos).where(eq(preciosProductos.productoId, id));
          await tx.delete(productosCodigos).where(eq(productosCodigos.productoId, id));
          await tx.delete(productosPresentaciones).where(eq(productosPresentaciones.productoId, id));
          await this.insertarRelaciones(tx, id, datos);
          return id;
        }
        const codigoInterno = `PRD-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const [nuevo] = await tx.insert(productos).values({
          codigoInterno, nombre: datos.nombre, descripcion: datos.descripcion,
          categoriaId: datos.categoriaId, marcaId: datos.marcaId, unidadBaseCodigo: datos.unidadBaseCodigo,
          stockMinimo: datos.stockMinimo, afectacionIgv: datos.afectacionIgv, afectoIgv: datos.afectoIgv, fichaTecnica: datos.fichaTecnica,
        }).returning({ id: productos.id });
        await this.insertarRelaciones(tx, nuevo.id, datos);
        return nuevo.id;
      });
      return this.consultar(productoId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new ConflictException("El producto o uno de sus códigos ya está registrado.");
      throw error;
    }
  }

  async cambiarEstado(idEntrada: string, activo: unknown) {
    const id = uuid(idEntrada, "El producto");
    if (typeof activo !== "boolean") throw new BadRequestException("El estado del producto no es válido.");
    const [actualizado] = await db.update(productos).set({ activo }).where(eq(productos.id, id)).returning({ id: productos.id });
    if (!actualizado) throw new NotFoundException("No se encontró el producto.");
    return { id, activo };
  }

  private validarDatos(entrada: unknown) {
    if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos del producto no son válidos.");
    const datos = entrada as DatosProducto;
    const nombre = texto(datos.nombre, "El nombre", 180, 2);
    const descripcion = typeof datos.descripcion === "string" ? datos.descripcion.trim().slice(0, 3000) || null : null;
    const categoriaId = uuid(datos.categoriaId, "La categoría");
    const marcaId = uuid(datos.marcaId, "La marca");
    const unidadBaseCodigo = texto(datos.unidadBaseCodigo, "La unidad base", 3);
    const stockMinimo = decimal(datos.stockMinimo ?? "0", "El stock mínimo", 0, 3);
    const afectacionIgv = ["GRAVADO", "EXONERADO", "INAFECTO"].includes(String(datos.afectacionIgv))
      ? datos.afectacionIgv as "GRAVADO" | "EXONERADO" | "INAFECTO"
      : typeof datos.afectoIgv === "boolean" ? datos.afectoIgv ? "GRAVADO" : "INAFECTO" : null;
    if (!afectacionIgv) throw new BadRequestException("Selecciona si el producto está gravado, exonerado o inafecto al IGV.");
    const fichaTecnica = this.validarFichaTecnica(datos.fichaTecnica);
    const codigos = Array.isArray(datos.codigos) ? datos.codigos.map((item) => this.validarCodigo(item)) : [];
    const presentacionesEntrada = Array.isArray(datos.presentaciones) ? datos.presentaciones as RegistroPresentacion[] : [];
    const presentaciones = [{ clave: "base", unidadMedidaCodigo: unidadBaseCodigo, nombre: "Unidad base", factorAUnidadBase: "1.000000", seCompra: true, seVende: true, esBase: true },
      ...presentacionesEntrada.map((item, indice) => this.validarPresentacion(item, indice))];
    if (new Set(presentaciones.map((item) => item.clave)).size !== presentaciones.length) throw new BadRequestException("Cada presentación debe tener un identificador diferente.");
    if (!presentaciones.some((item) => item.seCompra) || !presentaciones.some((item) => item.seVende)) throw new BadRequestException("Configura por lo menos una presentación para compra y otra para venta.");
    const preciosEntrada = Array.isArray(datos.precios) ? datos.precios as RegistroPrecio[] : [];
    const precios = preciosEntrada.map((item) => this.validarPrecio(item, presentaciones));
    if (!precios.some((item) => item.tipoListaPrecioId === "GENERAL" && item.presentacionClave === "base")) throw new BadRequestException("Agrega un precio general para la unidad base.");
    const activo = typeof datos.activo === "boolean" ? datos.activo : undefined;
    return { nombre, descripcion, categoriaId, marcaId, unidadBaseCodigo, stockMinimo, afectacionIgv, afectoIgv: afectacionIgv === "GRAVADO", fichaTecnica, codigos, presentaciones, precios, activo };
  }

  private validarFichaTecnica(valor: unknown): Record<string, string | number | boolean | null> {
    if (valor === undefined || valor === null) return {};
    if (typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("La ficha técnica debe ser un objeto con propiedades y valores.");
    const entradas = Object.entries(valor as Record<string, unknown>);
    if (entradas.length > 40) throw new BadRequestException("La ficha técnica admite hasta 40 características.");
    const salida: Record<string, string | number | boolean | null> = {};
    for (const [claveEntrada, dato] of entradas) {
      const clave = texto(claveEntrada, "El nombre de la característica", 60);
      if (typeof dato === "string") salida[clave] = dato.trim().slice(0, 300);
      else if (typeof dato === "number" && Number.isFinite(dato)) salida[clave] = dato;
      else if (typeof dato === "boolean" || dato === null) salida[clave] = dato;
      else throw new BadRequestException(`El valor de «${clave}» debe ser texto, número o sí/no.`);
    }
    return salida;
  }

  private validarCodigo(valor: unknown) {
    if (typeof valor !== "object" || valor === null) throw new BadRequestException("Un código externo no es válido.");
    const codigo = valor as RegistroCodigo;
    const tipo = texto(codigo.tipo, "El tipo de código", 30).toUpperCase();
    if (!["FABRICANTE", "BARRAS", "GTIN"].includes(tipo)) throw new BadRequestException("El tipo de código debe ser de fabricante, barras o GTIN.");
    return { tipo, codigo: texto(codigo.codigo, "El código", 100) };
  }

  private validarPresentacion(valor: RegistroPresentacion, indice: number) {
    const clave = texto(valor.clave ?? `presentacion-${indice + 1}`, "La presentación", 60);
    const unidadMedidaCodigo = texto(valor.unidadMedidaCodigo, "La unidad de la presentación", 3);
    const nombre = texto(valor.nombre, "El nombre de presentación", 100, 2);
    const factorAUnidadBase = decimal(valor.factorAUnidadBase, "El factor de conversión", 0.000001, 6);
    const seCompra = valor.seCompra === true;
    const seVende = valor.seVende === true;
    if (!seCompra && !seVende) throw new BadRequestException(`La presentación «${nombre}» debe usarse para compra o venta.`);
    return { clave, unidadMedidaCodigo, nombre, factorAUnidadBase, seCompra, seVende, esBase: false };
  }

  private validarPrecio(valor: RegistroPrecio, presentaciones: { clave: string }[]) {
    if (typeof valor !== "object" || valor === null) throw new BadRequestException("Un precio no es válido.");
    const precio = valor as RegistroPrecio;
    const presentacionClave = texto(precio.presentacionClave, "La presentación del precio", 60);
    if (!presentaciones.some((item) => item.clave === presentacionClave)) throw new BadRequestException("El precio referencia una presentación que no existe.");
    return {
      presentacionClave,
      tipoListaPrecioId: uuid(precio.tipoListaPrecioId, "La lista de precios"),
      precio: decimal(precio.precio, "El precio", 0, 2),
      cantidadMinima: decimal(precio.cantidadMinima ?? "1", "La cantidad mínima", 0.001, 3),
      vigenteDesde: this.fechaOpcional(precio.vigenteDesde),
      vigenteHasta: this.fechaOpcional(precio.vigenteHasta),
    };
  }

  private fechaOpcional(valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;
    const fecha = new Date(String(valor));
    if (Number.isNaN(fecha.getTime())) throw new BadRequestException("Una vigencia de precio no es válida.");
    return fecha;
  }

  private async insertarRelaciones(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], productoId: string, datos: ReturnType<ServicioProductos["validarDatos"]>) {
    const catalogos = await Promise.all([
      tx.select({ id: categoriasProductos.id }).from(categoriasProductos).where(and(eq(categoriasProductos.id, datos.categoriaId), eq(categoriasProductos.activo, true))).limit(1),
      tx.select({ id: marcasProductos.id }).from(marcasProductos).where(and(eq(marcasProductos.id, datos.marcaId), eq(marcasProductos.activo, true))).limit(1),
      tx.select({ codigo: unidadesMedida.codigo }).from(unidadesMedida).where(and(eq(unidadesMedida.codigo, datos.unidadBaseCodigo), eq(unidadesMedida.activo, true))).limit(1),
    ]);
    if (catalogos.some((catalogo) => !catalogo.length)) throw new BadRequestException("Selecciona una categoría, marca y unidad activos.");
    for (const presentacion of datos.presentaciones) {
      const [unidad] = await tx.select({ codigo: unidadesMedida.codigo }).from(unidadesMedida).where(and(eq(unidadesMedida.codigo, presentacion.unidadMedidaCodigo), eq(unidadesMedida.activo, true))).limit(1);
      if (!unidad) throw new BadRequestException(`La unidad «${presentacion.unidadMedidaCodigo}» no está en el catálogo de unidades activo.`);
    }
    for (const precio of datos.precios) {
      const [lista] = await tx.select({ id: tiposListasPrecio.id, codigo: tiposListasPrecio.codigo }).from(tiposListasPrecio).where(and(eq(tiposListasPrecio.id, precio.tipoListaPrecioId), eq(tiposListasPrecio.activo, true))).limit(1);
      if (!lista) throw new BadRequestException("Selecciona un tipo de lista de precios activo.");
      if (lista.codigo === "GENERAL" && precio.presentacionClave === "base" && Number(precio.cantidadMinima) !== 1) throw new BadRequestException("El precio general de la unidad base debe iniciar desde una unidad.");
    }
    const idsPorClave = new Map<string, string>();
    for (const presentacion of datos.presentaciones) {
      const [guardada] = await tx.insert(productosPresentaciones).values({
        productoId, unidadMedidaCodigo: presentacion.unidadMedidaCodigo, nombre: presentacion.nombre,
        factorAUnidadBase: presentacion.factorAUnidadBase, seCompra: presentacion.seCompra,
        seVende: presentacion.seVende, esBase: presentacion.esBase,
      }).returning({ id: productosPresentaciones.id });
      idsPorClave.set(presentacion.clave, guardada.id);
    }
    if (datos.codigos.length) await tx.insert(productosCodigos).values(datos.codigos.map((codigo) => ({ productoId, ...codigo })));
    if (datos.precios.length) await tx.insert(preciosProductos).values(datos.precios.map((precio) => ({
      productoId, presentacionId: idsPorClave.get(precio.presentacionClave)!, tipoListaPrecioId: precio.tipoListaPrecioId,
      precio: precio.precio, cantidadMinima: precio.cantidadMinima, vigenteDesde: precio.vigenteDesde, vigenteHasta: precio.vigenteHasta,
    })));
  }
}



