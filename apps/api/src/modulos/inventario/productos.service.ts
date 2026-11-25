import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  categoriasProductos,
  db,
  entradasStock,
  entradasStockDetalle,
  ingresos,
  ingresosDetalle,
  movimientosStock,
  marcasProductos,
  preciosProductos,
  usuarios,
  productos,
  productosCodigos,
  productosPresentaciones,
  saldosStock,
  tiposListasPrecio,
  unidadesMedida,
} from "@magina/database";
import { and, asc, count, desc, eq, exists, gt, ilike, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { generarCodigoBarrasInterno } from "./codigo-barras";

type RegistroPresentacion = { clave?: unknown; unidadMedidaCodigo?: unknown; nombre?: unknown; factorAUnidadBase?: unknown; seCompra?: unknown; seVende?: unknown };
type RegistroPrecio = { presentacionId?: unknown; tipoListaPrecioId?: unknown; precio?: unknown; cantidadMinima?: unknown; vigenteDesde?: unknown; vigenteHasta?: unknown; precioAnterior?: unknown };
type RegistroCodigo = { tipo?: unknown; codigo?: unknown };
type DatosProducto = {
  nombre?: unknown; descripcion?: unknown; categoriaId?: unknown; marcaId?: unknown;
  unidadBaseCodigo?: unknown; stockMinimo?: unknown; afectoIgv?: unknown; afectacionIgv?: unknown; fichaTecnica?: unknown; codigos?: unknown;
  presentaciones?: unknown; activo?: unknown;
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

const precioGeneralBase = sql<string | null>`(
  select precio.precio from precios_productos precio
  join tipos_listas_precio lista on lista.id = precio.tipo_lista_precio_id
  join productos_presentaciones presentacion on presentacion.id = precio.presentacion_id
  where precio.producto_id = ${productos.id} and precio.activo and lista.activo and lista.codigo = 'GENERAL'
    and presentacion.activo and presentacion.es_base and precio.cantidad_minima <= 1
    and (precio.vigente_desde is null or precio.vigente_desde <= now())
    and (precio.vigente_hasta is null or precio.vigente_hasta > now())
  order by precio.cantidad_minima desc, precio.vigente_desde desc nulls last, precio.creado_en desc, precio.id
  limit 1
)`;

@Injectable()
export class ServicioProductos {
  async catalogos() {
    const [categorias, marcas, unidades, listas] = await Promise.all([
      db.select({ id: categoriasProductos.id, nombre: categoriasProductos.nombre }).from(categoriasProductos).where(eq(categoriasProductos.activo, true)).orderBy(asc(categoriasProductos.nombre)),
      db.select({ id: marcasProductos.id, nombre: marcasProductos.nombre }).from(marcasProductos).where(and(eq(marcasProductos.activo, true), or(eq(marcasProductos.uso, "REPUESTOS"), eq(marcasProductos.uso, "AMBOS")))).orderBy(asc(marcasProductos.nombre)),
      db.select({ codigo: unidadesMedida.codigo, nombre: unidadesMedida.nombre }).from(unidadesMedida).where(and(eq(unidadesMedida.activo, true), sql`${unidadesMedida.codigo} <> 'ZZ'`)).orderBy(asc(unidadesMedida.nombre)),
      db.select({ id: tiposListasPrecio.id, codigo: tiposListasPrecio.codigo, nombre: tiposListasPrecio.nombre }).from(tiposListasPrecio).where(eq(tiposListasPrecio.activo, true)).orderBy(asc(tiposListasPrecio.id)),
    ]);
    return { categorias, marcas, unidadesMedida: unidades, tiposListasPrecio: listas };
  }

  async alertasStockBajo(filtros: { pagina?: string; porPagina?: string } = {}) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const tamanoSolicitado = Number.parseInt(filtros.porPagina ?? "20", 10);
    const porPagina = Number.isFinite(tamanoSolicitado) ? Math.min(50, Math.max(1, tamanoSolicitado)) : 20;
    const stockActual = sql<string>`coalesce(${saldosStock.cantidad}, 0)::numeric(18,3)`;
    const condicion = and(eq(productos.activo, true), or(lte(stockActual, "0"), and(gt(productos.stockMinimo, "0"), lte(stockActual, productos.stockMinimo))));
    const [itemsConSiguiente, resumen] = await Promise.all([
      db.select({
        id: productos.id,
        codigo: productos.codigoInterno,
        nombre: productos.nombre,
        stockActual,
        stockMinimo: productos.stockMinimo,
        unidad: unidadesMedida.nombre,
      }).from(productos)
        .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
        .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
        .where(condicion)
        .orderBy(asc(sql`${stockActual} / nullif(${productos.stockMinimo}, 0)`), asc(productos.nombre), asc(productos.id))
        .limit(porPagina + 1)
        .offset((pagina - 1) * porPagina),
      pagina === 1
        ? db.select({ total: count() }).from(productos)
            .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
            .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
            .where(condicion).then(([resumen]) => resumen ?? null)
        : Promise.resolve(null),
    ]);
    const hayMas = itemsConSiguiente.length > porPagina;
    return { items: itemsConSiguiente.slice(0, porPagina), total: resumen?.total, pagina, porPagina, hayMas };
  }

  async listar(filtros: { pagina?: string; porPagina?: string; busqueda?: string; estado?: string; marca?: string; precio?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const tamano = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(tamano) ? tamano : 10;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condicion = and(
      filtros.estado === "ACTIVOS" ? eq(productos.activo, true) : filtros.estado === "INACTIVOS" ? eq(productos.activo, false) : undefined,
      filtros.marca ? eq(marcasProductos.id, uuid(filtros.marca, "La marca")) : undefined,
      filtros.precio === "PENDIENTE" ? sql`${precioGeneralBase} is null` : filtros.precio === "VIGENTE" ? sql`${precioGeneralBase} is not null` : undefined,
      coincidencia ? or(
      ilike(marcasProductos.nombre, coincidencia),
      ilike(productos.nombre, coincidencia),
      ilike(productos.descripcion, coincidencia),
      ilike(productos.codigoInterno, coincidencia),
      exists(db.select({ id: productosCodigos.id }).from(productosCodigos).where(and(eq(productosCodigos.productoId, productos.id), ilike(productosCodigos.codigo, coincidencia)))),
    ) : undefined);

    const [items, [total]] = await Promise.all([
      db.select({
        id: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre, descripcion: productos.descripcion,
        activo: productos.activo, creadoEn: productos.creadoEn, precioGeneral: precioGeneralBase,
        stockActual: sql<string>`coalesce(${saldosStock.cantidad}, 0)::numeric(18,3)`, stockMinimo: productos.stockMinimo,
        categoriaId: categoriasProductos.id, categoria: categoriasProductos.nombre,
        marcaId: marcasProductos.id, marca: marcasProductos.nombre,
        unidadBaseCodigo: unidadesMedida.codigo, unidadBase: unidadesMedida.nombre,
      }).from(productos)
        .innerJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
        .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
        .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
        .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
        .where(condicion).orderBy(asc(productos.nombre), asc(productos.id)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(productos)
        .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id)).where(condicion),
    ]);
    const totalRegistros = total?.total ?? 0;
    return { items, total: totalRegistros, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(totalRegistros / porPagina)) };
  }

  async listarPrecios(filtros: { pagina?: string; porPagina?: string; busqueda?: string; marca?: string; lista?: string; vigencia?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const tamano = Number.parseInt(filtros.porPagina ?? "10", 10);
    const porPagina = [4, 6, 8, 10].includes(tamano) ? tamano : 10;
    const busqueda = typeof filtros.busqueda === "string" ? filtros.busqueda.trim().slice(0, 100) : "";
    const coincidencia = busqueda ? `%${busqueda.replace(/[\\%_]/g, "\\$&")}%` : "";
    const condicion = and(
      filtros.marca ? eq(productos.marcaId, uuid(filtros.marca, "La marca")) : undefined,
      filtros.lista ? eq(preciosProductos.tipoListaPrecioId, uuid(filtros.lista, "La lista de precios")) : undefined,
      filtros.vigencia === "VIGENTE" ? sql`${preciosProductos.activo} and (${preciosProductos.vigenteDesde} is null or ${preciosProductos.vigenteDesde} <= now()) and (${preciosProductos.vigenteHasta} is null or ${preciosProductos.vigenteHasta} > now())`
        : filtros.vigencia === "PROGRAMADO" ? sql`${preciosProductos.activo} and ${preciosProductos.vigenteDesde} > now()`
        : filtros.vigencia === "FINALIZADO" ? sql`${preciosProductos.activo} and ${preciosProductos.vigenteHasta} <= now()` : undefined,
      coincidencia ? or(ilike(productos.nombre, coincidencia), ilike(productos.codigoInterno, coincidencia), ilike(marcasProductos.nombre, coincidencia)) : undefined,
    );
    const [items, [total]] = await Promise.all([
      db.select({
        id: preciosProductos.id, productoId: productos.id, codigo: productos.codigoInterno, producto: productos.nombre,
        marca: marcasProductos.nombre, presentacion: productosPresentaciones.nombre,
        presentacionBase: productosPresentaciones.esBase, listaPrecio: tiposListasPrecio.nombre,
        precio: preciosProductos.precio, cantidadMinima: preciosProductos.cantidadMinima,
        vigenteDesde: preciosProductos.vigenteDesde, vigenteHasta: preciosProductos.vigenteHasta,
        precioActivo: preciosProductos.activo, productoActivo: productos.activo,
      }).from(preciosProductos)
        .innerJoin(productos, eq(preciosProductos.productoId, productos.id))
        .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
        .innerJoin(productosPresentaciones, eq(preciosProductos.presentacionId, productosPresentaciones.id))
        .innerJoin(tiposListasPrecio, eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id))
        .where(condicion).orderBy(asc(productos.nombre), asc(tiposListasPrecio.nombre), asc(productosPresentaciones.nombre), asc(preciosProductos.cantidadMinima), desc(preciosProductos.vigenteDesde), asc(preciosProductos.id))
        .limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(preciosProductos)
        .innerJoin(productos, eq(preciosProductos.productoId, productos.id))
        .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
        .where(condicion),
    ]);
    const totalRegistros = total?.total ?? 0;
    return { items, total: totalRegistros, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(totalRegistros / porPagina)) };
  }

  async configurarPrecio(idEntrada: string, valor: unknown, usuarioId: string, precioIdEntrada?: string) {
    const id = uuid(idEntrada, "El producto");
    if (typeof valor !== "object" || valor === null || Array.isArray(valor)) throw new BadRequestException("Ingresa un precio válido.");
    const datos = valor as RegistroPrecio;
    const precioId = precioIdEntrada ? uuid(precioIdEntrada, "El precio") : null;
    const correccion = precioId ? decimal(datos.precioAnterior, "El precio anterior", 0.01, 2) : null;
    const precio = decimal(datos.precio, "El precio", 0.10, 2);
    if (Number(precio) >= 10_000_000_000 || Math.round(Number(precio) * 100) % 10 !== 0) throw new BadRequestException("Ingresa un precio válido en múltiplos de S/ 0.10.");
    const vigenteDesde = this.fechaOpcional(datos.vigenteDesde);
    const vigenteHasta = this.fechaOpcional(datos.vigenteHasta);

    return db.transaction(async (tx) => {
      const [producto] = await tx.select({ id: productos.id }).from(productos).where(eq(productos.id, id)).for("update");
      if (!producto) throw new NotFoundException("No se encontró el repuesto.");
      const [anterior] = precioId ? await tx.select().from(preciosProductos).where(and(eq(preciosProductos.id, precioId), eq(preciosProductos.productoId, id))) : [];
      if (precioId && !anterior) throw new NotFoundException("No se encontró el precio del repuesto.");
      const ahora = new Date();
      if (anterior && (!anterior.activo || (anterior.vigenteHasta && anterior.vigenteHasta <= ahora) || Number(anterior.precio) !== Number(correccion))) {
        throw new ConflictException("El precio cambió o ya finalizó. Vuelve a abrir el historial.");
      }
      const presentacionId = anterior?.presentacionId ?? uuid(datos.presentacionId, "La presentación");
      const tipoListaPrecioId = anterior?.tipoListaPrecioId ?? uuid(datos.tipoListaPrecioId, "La lista de precios");
      const cantidadMinima = anterior?.cantidadMinima ?? decimal(datos.cantidadMinima ?? "1", "La cantidad mínima", 0.001, 3);
      if (Number(cantidadMinima) >= 100_000_000_000) throw new BadRequestException("La cantidad mínima supera el máximo permitido.");
      const [presentacion] = await tx.select({ id: productosPresentaciones.id }).from(productosPresentaciones).where(and(
        eq(productosPresentaciones.id, presentacionId), eq(productosPresentaciones.productoId, id),
        eq(productosPresentaciones.activo, true), eq(productosPresentaciones.seVende, true),
      ));
      if (!presentacion) throw new BadRequestException("Selecciona una presentación habilitada para venta.");
      const [lista] = await tx.select({ id: tiposListasPrecio.id }).from(tiposListasPrecio).where(and(eq(tiposListasPrecio.id, tipoListaPrecioId), eq(tiposListasPrecio.activo, true)));
      if (!lista) throw new BadRequestException("Selecciona una lista de precios activa.");
      if (anterior && (Number(anterior.precio) === Number(precio) || (anterior.vigenteDesde && anterior.vigenteDesde >= ahora))) {
        if (Number(anterior.precio) === Number(precio)) return anterior;
        const [actualizado] = await tx.update(preciosProductos).set({ precio, usuarioId, actualizadoEn: ahora }).where(eq(preciosProductos.id, anterior.id)).returning();
        return actualizado;
      }
      const inicio = vigenteDesde ?? ahora;
      const fin = anterior ? anterior.vigenteHasta : vigenteHasta;
      if (inicio < ahora || (fin && fin <= inicio)) throw new BadRequestException("Selecciona una vigencia futura válida o aplica el precio desde ahora.");
      const precios = await tx.select().from(preciosProductos).where(and(
        eq(preciosProductos.productoId, id), eq(preciosProductos.presentacionId, presentacionId),
        eq(preciosProductos.tipoListaPrecioId, tipoListaPrecioId), eq(preciosProductos.cantidadMinima, cantidadMinima), eq(preciosProductos.activo, true),
      ));
      const solapados = precios.filter((item) => (!item.vigenteHasta || item.vigenteHasta > inicio) && (!fin || !item.vigenteDesde || item.vigenteDesde < fin));
      const programados = solapados.filter((item) => item.vigenteDesde && item.vigenteDesde >= inicio);
      if (programados.length) throw new ConflictException("La vigencia coincide con un precio programado para esta presentación, lista y cantidad.");
      if (solapados.length) await Promise.all(solapados.map((item) => tx.update(preciosProductos).set({ vigenteHasta: inicio, actualizadoEn: ahora }).where(eq(preciosProductos.id, item.id))));
      const [nuevo] = await tx.insert(preciosProductos).values({ productoId: id, presentacionId, tipoListaPrecioId, precio, cantidadMinima, vigenteDesde: inicio, vigenteHasta: fin, usuarioId }).returning();
      return nuevo;
    });
  }

  async costosCompra(idEntrada: string) {
    const id = uuid(idEntrada, "El producto");
    const costo = sql<string | null>`round(sum(${entradasStockDetalle.costoUnitario} * ${entradasStockDetalle.cantidad}) / nullif(sum(${entradasStockDetalle.cantidadBase}), 0), 4)`;
    const [[ultima], [promedio]] = await Promise.all([
      db.select({ fecha: entradasStock.fecha, importe: costo })
        .from(entradasStockDetalle).innerJoin(entradasStock, eq(entradasStockDetalle.entradaId, entradasStock.id))
        .where(eq(entradasStockDetalle.productoId, id))
        .groupBy(entradasStock.id).orderBy(desc(entradasStock.fecha), desc(entradasStock.creadoEn), desc(entradasStock.id)).limit(1),
      db.select({ importe: costo })
        .from(entradasStockDetalle).where(eq(entradasStockDetalle.productoId, id)),
    ]);
    return { ultima: ultima ?? null, promedioPonderado: promedio?.importe ?? null };
  }

  async consultar(idEntrada: string) {
    const id = uuid(idEntrada, "El producto");
    const [producto] = await db.select({
      id: productos.id, codigoInterno: productos.codigoInterno, nombre: productos.nombre, descripcion: productos.descripcion,
      categoriaId: productos.categoriaId, marcaId: productos.marcaId,
      unidadBaseCodigo: productos.unidadBaseCodigo, stockMinimo: productos.stockMinimo, afectacionIgv: productos.afectacionIgv, afectoIgv: productos.afectoIgv,
      stockActual: sql<string>`coalesce(${saldosStock.cantidad}, 0)::numeric(18,3)`,
      fichaTecnica: productos.fichaTecnica, activo: productos.activo, creadoEn: productos.creadoEn, actualizadoEn: productos.actualizadoEn,
      categoria: categoriasProductos.nombre, marca: marcasProductos.nombre, unidadBase: unidadesMedida.nombre, precioGeneral: precioGeneralBase,
    }).from(productos)
      .innerJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(unidadesMedida, eq(productos.unidadBaseCodigo, unidadesMedida.codigo))
      .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
      .where(eq(productos.id, id)).limit(1);
    if (!producto) throw new NotFoundException("No se encontró el producto.");

    const [codigos, presentaciones, precios] = await Promise.all([
      db.select().from(productosCodigos).where(eq(productosCodigos.productoId, id)).orderBy(asc(productosCodigos.tipo)),
      db.select({ id: productosPresentaciones.id, clave: productosPresentaciones.id, unidadMedidaCodigo: productosPresentaciones.unidadMedidaCodigo, unidadMedida: unidadesMedida.nombre, nombre: productosPresentaciones.nombre, factorAUnidadBase: productosPresentaciones.factorAUnidadBase, seCompra: productosPresentaciones.seCompra, seVende: productosPresentaciones.seVende, esBase: productosPresentaciones.esBase, activo: productosPresentaciones.activo })
        .from(productosPresentaciones).innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
        .where(and(eq(productosPresentaciones.productoId, id), eq(productosPresentaciones.activo, true))).orderBy(asc(productosPresentaciones.esBase)),
      db.select({ id: preciosProductos.id, presentacionId: preciosProductos.presentacionId, tipoListaPrecioId: preciosProductos.tipoListaPrecioId, tipoLista: tiposListasPrecio.nombre, precio: preciosProductos.precio, cantidadMinima: preciosProductos.cantidadMinima, vigenteDesde: preciosProductos.vigenteDesde, vigenteHasta: preciosProductos.vigenteHasta, activo: preciosProductos.activo, usuario: usuarios.nombreUsuario })
        .from(preciosProductos).innerJoin(tiposListasPrecio, eq(preciosProductos.tipoListaPrecioId, tiposListasPrecio.id))
        .leftJoin(usuarios, eq(usuarios.id, preciosProductos.usuarioId))
        .where(eq(preciosProductos.productoId, id)).orderBy(desc(preciosProductos.creadoEn), asc(preciosProductos.id)),
    ]);
    return { ...producto, codigos, presentaciones, precios };
  }

  async historial(idEntrada: string) {
    const id = uuid(idEntrada, "El producto");
    const [movimientos, [compra], [venta]] = await Promise.all([
      db.select({ id: movimientosStock.id, tipo: movimientosStock.tipo, sentido: movimientosStock.sentido,
        cantidad: movimientosStock.cantidadBase, fecha: movimientosStock.creadoEn, motivo: movimientosStock.motivo,
      }).from(movimientosStock).where(eq(movimientosStock.productoId, id)).orderBy(desc(movimientosStock.creadoEn)).limit(15),
      db.select({ fecha: entradasStock.fecha, importe: sql<string>`(${entradasStockDetalle.costoUnitario} / nullif(${entradasStockDetalle.factorAUnidadBase}, 0))::numeric(18,4)` })
        .from(entradasStockDetalle).innerJoin(entradasStock, eq(entradasStockDetalle.entradaId, entradasStock.id))
        .where(eq(entradasStockDetalle.productoId, id)).orderBy(desc(entradasStock.fecha), desc(entradasStock.creadoEn)).limit(1),
      db.select({ fecha: ingresos.fecha, importe: sql<string>`(${ingresosDetalle.precioUnitario} / nullif(${ingresosDetalle.factorAUnidadBase}, 0))::numeric(18,4)` })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
        .where(and(eq(ingresosDetalle.productoId, id), sql`${ingresos.estado} <> 'ANULADO'`)).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(1),
    ]);
    return { movimientos, compra: compra ?? null, venta: venta ?? null };
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
          await tx.delete(productosCodigos).where(eq(productosCodigos.productoId, id));
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
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") throw new ConflictException("El código de barras o uno de los códigos del repuesto ya está registrado. Revisa el código ingresado e intenta de nuevo; si era autogenerado, vuelve a guardar para obtener otro.");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") throw new BadRequestException("Una categoría, marca, unidad o lista seleccionada ya no está disponible. Actualiza los catálogos e intenta nuevamente.");
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23514") throw new BadRequestException("Los datos del producto no cumplen las reglas del inventario. Revisa presentaciones, precios y códigos.");
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
    if (!codigos.some((item) => item.tipo === "BARRAS" || item.tipo === "GTIN")) {
      codigos.push({ tipo: "BARRAS", codigo: generarCodigoBarrasInterno() });
    }
    const presentacionesEntrada = Array.isArray(datos.presentaciones) ? datos.presentaciones as RegistroPresentacion[] : [];
    const presentaciones = [{ clave: "base", unidadMedidaCodigo: unidadBaseCodigo, nombre: "Unidad base", factorAUnidadBase: "1.000000", seCompra: true, seVende: true, esBase: true },
      ...presentacionesEntrada.map((item, indice) => this.validarPresentacion(item, indice))];
    if (new Set(presentaciones.map((item) => item.clave)).size !== presentaciones.length) throw new BadRequestException("Cada presentación debe tener un identificador diferente.");
    if (!presentaciones.some((item) => item.seCompra) || !presentaciones.some((item) => item.seVende)) throw new BadRequestException("Configura por lo menos una presentación para compra y otra para venta.");
    const activo = typeof datos.activo === "boolean" ? datos.activo : undefined;
    return { nombre, descripcion, categoriaId, marcaId, unidadBaseCodigo, stockMinimo, afectacionIgv, afectoIgv: afectacionIgv === "GRAVADO", fichaTecnica, codigos, presentaciones, activo };
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

  private fechaOpcional(valor: unknown) {
    if (valor === null || valor === undefined || valor === "") return null;
    if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) throw new BadRequestException("Ingresa una fecha de vigencia válida.");
    const fecha = new Date(`${valor}T00:00:00-05:00`);
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) throw new BadRequestException("Una vigencia de precio no es válida.");
    return fecha;
  }

  private async insertarRelaciones(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], productoId: string, datos: ReturnType<ServicioProductos["validarDatos"]>) {
    const catalogos = await Promise.all([
      tx.select({ id: categoriasProductos.id }).from(categoriasProductos).where(and(eq(categoriasProductos.id, datos.categoriaId), eq(categoriasProductos.activo, true))).limit(1),
      tx.select({ id: marcasProductos.id }).from(marcasProductos).where(and(eq(marcasProductos.id, datos.marcaId), eq(marcasProductos.activo, true), or(eq(marcasProductos.uso, "REPUESTOS"), eq(marcasProductos.uso, "AMBOS")))).limit(1),
      tx.select({ codigo: unidadesMedida.codigo }).from(unidadesMedida).where(and(eq(unidadesMedida.codigo, datos.unidadBaseCodigo), eq(unidadesMedida.activo, true))).limit(1),
    ]);
    if (catalogos.some((catalogo) => !catalogo.length)) throw new BadRequestException("Selecciona una categoría, marca y unidad activos.");
    for (const presentacion of datos.presentaciones) {
      const [unidad] = await tx.select({ codigo: unidadesMedida.codigo }).from(unidadesMedida).where(and(eq(unidadesMedida.codigo, presentacion.unidadMedidaCodigo), eq(unidadesMedida.activo, true))).limit(1);
      if (!unidad) throw new BadRequestException(`La unidad «${presentacion.unidadMedidaCodigo}» no está en el catálogo de unidades activo.`);
    }
    const existentes = await tx.select().from(productosPresentaciones).where(eq(productosPresentaciones.productoId, productoId));
    const porId = new Map(existentes.map((item) => [item.id, item]));
    const conservadas = new Set<string>();
    for (const presentacion of datos.presentaciones) {
      const existente = presentacion.esBase ? existentes.find((item) => item.esBase) : porId.get(presentacion.clave);
      const valores = {
        productoId, unidadMedidaCodigo: presentacion.unidadMedidaCodigo, nombre: presentacion.nombre,
        factorAUnidadBase: presentacion.factorAUnidadBase, seCompra: presentacion.seCompra,
        seVende: presentacion.seVende, esBase: presentacion.esBase,
      };
      if (!existente) {
        await tx.insert(productosPresentaciones).values(valores);
        continue;
      }
      if (existente.esBase !== presentacion.esBase) throw new BadRequestException("La unidad base debe conservar su presentación.");
      conservadas.add(existente.id);
      if (existente.unidadMedidaCodigo !== valores.unidadMedidaCodigo || Number(existente.factorAUnidadBase) !== Number(valores.factorAUnidadBase)) {
        const [movimiento] = await tx.select({ id: movimientosStock.id }).from(movimientosStock).where(eq(movimientosStock.productoId, productoId)).limit(1);
        const [precio] = await tx.select({ id: preciosProductos.id }).from(preciosProductos).where(eq(preciosProductos.presentacionId, existente.id)).limit(1);
        if (movimiento || precio) throw new ConflictException("La unidad o equivalencia tiene operaciones o precios registrados. Crea una presentación con la nueva equivalencia.");
      }
      await tx.update(productosPresentaciones).set({ ...valores, activo: true, actualizadoEn: new Date() }).where(eq(productosPresentaciones.id, existente.id));
    }
    for (const existente of existentes) {
      if (existente.activo && !conservadas.has(existente.id)) await tx.update(productosPresentaciones).set({ activo: false, actualizadoEn: new Date() }).where(eq(productosPresentaciones.id, existente.id));
    }
    if (datos.codigos.length) await tx.insert(productosCodigos).values(datos.codigos.map((codigo) => ({ productoId, ...codigo })));
  }
}
