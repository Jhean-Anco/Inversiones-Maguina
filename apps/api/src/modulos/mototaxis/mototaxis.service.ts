import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, ajustesInventarioMototaxis, ajustesInventarioMototaxisDetalle, comprasMototaxis, comprasMototaxisDetalle, garantiasMototaxis, ingresos, ingresosDetalle, marcasProductos, modelosMototaxis, movimientosMototaxis, movimientosMototaxisVentas, pagosComprasMototaxis, personas, proveedores, reclamosGarantiaMototaxis, tiposDocumento, tiposPersona, unidadesMototaxis } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";

const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;
const uuidValido = (valor: unknown): valor is string => typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

function texto(valor: unknown, campo: string, maximo: number, requerido = false): string | null {
  if (typeof valor !== "string" || !valor.trim()) {
    if (requerido) throw new BadRequestException(`${campo} es obligatorio.`);
    return null;
  }
  if (valor.trim().length > maximo) throw new BadRequestException(`${campo} supera el máximo permitido.`);
  return valor.trim();
}

function importe(valor: unknown, campo: string, minimo = 0) {
  const n = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : NaN;
  if (!Number.isFinite(n) || n < minimo || Number(n.toFixed(2)) !== n) throw new BadRequestException(`${campo} debe ser un importe válido con hasta dos decimales.`);
  return n;
}

function fechaValida(valor: unknown, campo: string) {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(new Date(`${valor}T00:00:00Z`).getTime()) || new Date(`${valor}T00:00:00Z`).toISOString().slice(0, 10) !== valor) throw new BadRequestException(`${campo} no es una fecha válida.`);
  return valor;
}

function validarModelo(valor: unknown) {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("La ficha del modelo no es válida.");
  const d = valor as Record<string, unknown>;
  if (!uuidValido(d.marcaId)) throw new BadRequestException("Selecciona una marca válida.");
  const nombre = texto(d.nombre, "El modelo", 120, true)!;
  const categoriaVehicular = texto(d.categoriaVehicular ?? "L5", "La categoría vehicular", 10, true)!;
  if (!["L1", "L2", "L3", "L4", "L5"].includes(categoriaVehicular)) throw new BadRequestException("Selecciona una categoría vehicular válida.");
  const tipoMototaxi = texto(d.tipoMototaxi, "El tipo de mototaxi", 20);
  if (tipoMototaxi && !["PASAJERO", "CARGA"].includes(tipoMototaxi)) throw new BadRequestException("Selecciona un tipo de mototaxi válido.");
  const tipoMotor = texto(d.tipoMotor, "El tipo de motor", 20);
  if (tipoMotor && !["2_TIEMPOS", "4_TIEMPOS"].includes(tipoMotor)) throw new BadRequestException("Selecciona un tipo de motor válido.");
  const tipoRefrigeracion = texto(d.tipoRefrigeracion, "El tipo de refrigeración", 20);
  if (tipoRefrigeracion && !["AIRE", "LIQUIDO", "AIRE_ACEITE"].includes(tipoRefrigeracion)) throw new BadRequestException("Selecciona un tipo de refrigeración válido.");
  if (d.coloresDisponibles != null && !Array.isArray(d.coloresDisponibles)) throw new BadRequestException("Selecciona una lista de colores válida.");
  const coloresDisponibles = [...new Map((Array.isArray(d.coloresDisponibles) ? d.coloresDisponibles : []).map((valor) => texto(valor, "El color disponible", 60, true)!).map((color) => [color.toLocaleLowerCase("es-PE"), color])).values()];
  if (coloresDisponibles.length > 24) throw new BadRequestException("Registra hasta 24 colores por modelo.");
  const cilindradaCc = d.cilindradaCc === "" || d.cilindradaCc == null ? null : Number(d.cilindradaCc);
  const capacidadAsientos = d.capacidadAsientos === "" || d.capacidadAsientos == null ? null : Number(d.capacidadAsientos);
  const capacidadCargaKg = d.capacidadCargaKg === "" || d.capacidadCargaKg == null ? null : Number(d.capacidadCargaKg);
  if (cilindradaCc !== null && (!Number.isSafeInteger(cilindradaCc) || cilindradaCc <= 0 || cilindradaCc > 2_147_483_647)) throw new BadRequestException("La cilindrada debe ser un entero positivo válido.");
  if (capacidadAsientos !== null && (!Number.isSafeInteger(capacidadAsientos) || capacidadAsientos <= 0 || capacidadAsientos > 2_147_483_647)) throw new BadRequestException("La capacidad de asientos debe ser un entero positivo válido.");
  if (capacidadCargaKg !== null && (!Number.isFinite(capacidadCargaKg) || capacidadCargaKg <= 0 || capacidadCargaKg > 99_999_999.99 || Number(capacidadCargaKg.toFixed(2)) !== capacidadCargaKg)) throw new BadRequestException("La capacidad de carga debe ser positiva y tener hasta dos decimales.");
  const precioVenta = d.precioVenta == null || d.precioVenta === "" ? null : importe(d.precioVenta, "El precio de venta", 0.01);
  if (precioVenta !== null && precioVenta > 999_999_999_999.99) throw new BadRequestException("El precio de venta supera el máximo permitido.");
  return {
    marcaId: d.marcaId, nombre, version: texto(d.version, "La versión", 80), precioVenta: precioVenta === null ? null : precioVenta.toFixed(2), categoriaVehicular,
    fabricante: texto(d.fabricante, "El fabricante", 160), paisFabricacion: texto(d.paisFabricacion, "El país de fabricación", 100),
    marcaMotor: texto(d.marcaMotor, "La marca del motor", 100), modeloMotor: texto(d.modeloMotor, "El modelo del motor", 100), tipoMototaxi, tipoMotor, tipoRefrigeracion, coloresDisponibles, cilindradaCc,
    combustible: texto(d.combustible, "El combustible", 40), transmision: texto(d.transmision, "La transmisión", 60), carroceria: texto(d.carroceria, "La carrocería", 80),
    capacidadAsientos, capacidadCargaKg: capacidadCargaKg === null ? null : String(capacidadCargaKg),
    especificacionesAdicionales: texto(d.especificacionesAdicionales, "Las especificaciones adicionales", 2000),
  };
}

@Injectable()
export class ServicioMototaxis {
  listarMarcas() { return db.select().from(marcasProductos).where(or(eq(marcasProductos.uso, "MOTOTAXIS"), eq(marcasProductos.uso, "AMBOS"))).orderBy(asc(marcasProductos.nombre)); }

  async crearMarca(valor: unknown) {
    const datos = valor as Record<string, unknown>;
    const nombre = texto(datos?.nombre, "El nombre de marca", 100, true)!;
    try { const [marca] = await db.insert(marcasProductos).values({ nombre, uso: "MOTOTAXIS" }).returning(); return marca; }
    catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Ya existe esa marca en el catálogo compartido."); throw error; }
  }

  listarModelos(busqueda = "", incluirInactivos = false) {
    const q = busqueda.trim().slice(0, 100);
    return db.select({ id: modelosMototaxis.id, codigo: modelosMototaxis.codigo, marcaId: marcasProductos.id, marca: marcasProductos.nombre, nombre: modelosMototaxis.nombre,
      version: modelosMototaxis.version, precioVenta: modelosMototaxis.precioVenta, categoriaVehicular: modelosMototaxis.categoriaVehicular, fabricante: modelosMototaxis.fabricante, paisFabricacion: modelosMototaxis.paisFabricacion,
      marcaMotor: modelosMototaxis.marcaMotor, modeloMotor: modelosMototaxis.modeloMotor, tipoMototaxi: modelosMototaxis.tipoMototaxi, tipoMotor: modelosMototaxis.tipoMotor, tipoRefrigeracion: modelosMototaxis.tipoRefrigeracion, coloresDisponibles: modelosMototaxis.coloresDisponibles, cilindradaCc: modelosMototaxis.cilindradaCc, combustible: modelosMototaxis.combustible,
      transmision: modelosMototaxis.transmision, carroceria: modelosMototaxis.carroceria, capacidadAsientos: modelosMototaxis.capacidadAsientos,
      capacidadCargaKg: modelosMototaxis.capacidadCargaKg, especificacionesAdicionales: modelosMototaxis.especificacionesAdicionales, activo: modelosMototaxis.activo })
      .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .where(and(incluirInactivos ? undefined : eq(modelosMototaxis.activo, true), q ? or(ilike(modelosMototaxis.nombre, `%${q}%`), ilike(modelosMototaxis.codigo, `%${q}%`), ilike(marcasProductos.nombre, `%${q}%`)) : undefined))
      .orderBy(asc(marcasProductos.nombre), asc(modelosMototaxis.nombre));
  }

  async crearModelo(valor: unknown) {
    const datos = validarModelo(valor);
    await this.validarMarcaModelo(datos.marcaId);
    const codigo = `MOT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    try {
      const [modelo] = await db.insert(modelosMototaxis).values({ codigo, ...datos }).returning({ id: modelosMototaxis.id });
      return this.obtenerModelo(modelo.id);
    } catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Ya existe este modelo y versión para la marca seleccionada."); throw error; }
  }

  async actualizarModelo(id: string, valor: unknown) {
    if (!uuidValido(id)) throw new BadRequestException("El modelo seleccionado no es válido.");
    const datos = validarModelo(valor);
    await this.validarMarcaModelo(datos.marcaId);
    try {
      const [modelo] = await db.update(modelosMototaxis).set({ ...datos, actualizadoEn: new Date() }).where(eq(modelosMototaxis.id, id)).returning({ id: modelosMototaxis.id });
      if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
      return this.obtenerModelo(modelo.id);
    } catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Ya existe este modelo y versión para la marca seleccionada."); throw error; }
  }

  async actualizarPrecioVentaModelo(id: string, valor: unknown) {
    if (!uuidValido(id)) throw new BadRequestException("El modelo seleccionado no es válido.");
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Indica un precio de venta válido.");
    const entrada = (valor as Record<string, unknown>).precioVenta;
    const precioVenta = entrada == null || entrada === "" ? null : importe(entrada, "El precio de venta", 0.01);
    const [modelo] = await db.update(modelosMototaxis).set({ precioVenta: precioVenta === null ? null : precioVenta.toFixed(2), actualizadoEn: new Date() })
      .where(eq(modelosMototaxis.id, id)).returning({ id: modelosMototaxis.id });
    if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
    return this.obtenerModelo(modelo.id);
  }

  async obtenerAnalisisModelo(id: string) {
    if (!uuidValido(id)) throw new BadRequestException("El modelo seleccionado no es válido.");
    const modelo = await this.obtenerModelo(id);
    const [existencias, compra, ultimaCompra, ventas, ultimaVenta, comprasMensuales, ventasMensuales] = await Promise.all([
      db.select({ estado: unidadesMototaxis.estado, cantidad: count() }).from(unidadesMototaxis).where(eq(unidadesMototaxis.modeloId, id)).groupBy(unidadesMototaxis.estado),
      db.select({ unidades: sql<string>`coalesce(sum(${comprasMototaxisDetalle.cantidad}), 0)`, promedioPonderado: sql<string | null>`case when sum(${comprasMototaxisDetalle.cantidad}) > 0 then round(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / sum(${comprasMototaxisDetalle.cantidad}), 2)::text else null end`, operaciones: count() })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).where(eq(comprasMototaxisDetalle.modeloId, id)),
      db.select({ precio: comprasMototaxisDetalle.costoUnitario, cantidad: comprasMototaxisDetalle.cantidad, fecha: comprasMototaxis.fecha, codigo: comprasMototaxis.codigo, documentoTipo: comprasMototaxis.documentoTipo, documentoNumero: comprasMototaxis.documentoNumero, proveedor: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))` })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).innerJoin(personas, eq(comprasMototaxis.proveedorPersonaId, personas.id))
        .where(eq(comprasMototaxisDetalle.modeloId, id)).orderBy(desc(comprasMototaxis.fecha), desc(comprasMototaxis.creadoEn)).limit(1),
      db.select({ unidades: sql<string>`coalesce(sum(${ingresosDetalle.cantidad}), 0)`, promedioPonderado: sql<string | null>`case when sum(${ingresosDetalle.cantidad}) > 0 then round(sum(${ingresosDetalle.precioUnitario} * ${ingresosDetalle.cantidad}) / sum(${ingresosDetalle.cantidad}), 2)::text else null end`, operaciones: count() })
        .from(movimientosMototaxisVentas).innerJoin(movimientosMototaxis, eq(movimientosMototaxisVentas.movimientoId, movimientosMototaxis.id)).innerJoin(ingresosDetalle, eq(movimientosMototaxisVentas.ventaDetalleId, ingresosDetalle.id)).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).innerJoin(unidadesMototaxis, eq(movimientosMototaxis.unidadId, unidadesMototaxis.id))
        .where(and(eq(unidadesMototaxis.modeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))),
      db.select({ precio: ingresosDetalle.precioUnitario, fecha: ingresos.fecha, codigo: ingresos.codigo, tipoComprobante: ingresos.tipoComprobante, cliente: ingresos.clienteNombre })
        .from(movimientosMototaxisVentas).innerJoin(movimientosMototaxis, eq(movimientosMototaxisVentas.movimientoId, movimientosMototaxis.id)).innerJoin(ingresosDetalle, eq(movimientosMototaxisVentas.ventaDetalleId, ingresosDetalle.id)).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).innerJoin(unidadesMototaxis, eq(movimientosMototaxis.unidadId, unidadesMototaxis.id))
        .where(and(eq(unidadesMototaxis.modeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(1),
      db.select({ mes: sql<string>`to_char(date_trunc('month', ${comprasMototaxis.fecha}::date), 'YYYY-MM')`, promedio: sql<string>`round(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / sum(${comprasMototaxisDetalle.cantidad}), 2)::text`, cantidad: sql<string>`sum(${comprasMototaxisDetalle.cantidad})` })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).where(eq(comprasMototaxisDetalle.modeloId, id)).groupBy(sql`date_trunc('month', ${comprasMototaxis.fecha}::date)`).orderBy(sql`date_trunc('month', ${comprasMototaxis.fecha}::date) desc`).limit(12),
      db.select({ mes: sql<string>`to_char(date_trunc('month', ${ingresos.fecha}::date), 'YYYY-MM')`, promedio: sql<string>`round(sum(${ingresosDetalle.precioUnitario} * ${ingresosDetalle.cantidad}) / sum(${ingresosDetalle.cantidad}), 2)::text`, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})` })
        .from(movimientosMototaxisVentas).innerJoin(movimientosMototaxis, eq(movimientosMototaxisVentas.movimientoId, movimientosMototaxis.id)).innerJoin(ingresosDetalle, eq(movimientosMototaxisVentas.ventaDetalleId, ingresosDetalle.id)).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).innerJoin(unidadesMototaxis, eq(movimientosMototaxis.unidadId, unidadesMototaxis.id))
        .where(and(eq(unidadesMototaxis.modeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))).groupBy(sql`date_trunc('month', ${ingresos.fecha}::date)`).orderBy(sql`date_trunc('month', ${ingresos.fecha}::date) desc`).limit(12),
    ]);
    const stock = Object.fromEntries(existencias.map((fila) => [fila.estado, Number(fila.cantidad)]));
    return { modelo, existencias: { total: Object.values(stock).reduce((suma, cantidad) => suma + cantidad, 0), disponibles: stock.DISPONIBLE ?? 0, reservadas: stock.RESERVADA ?? 0, vendidas: stock.VENDIDA ?? 0, garantia: stock.GARANTIA ?? 0, usoInterno: stock.USO_INTERNO ?? 0, baja: stock.BAJA ?? 0, faltantes: stock.FALTANTE ?? 0 },
      compras: { unidades: Number(compra[0]?.unidades ?? 0), operaciones: Number(compra[0]?.operaciones ?? 0), ultimoPrecio: ultimaCompra[0]?.precio ?? null, promedioPonderado: compra[0]?.promedioPonderado ?? null, ultima: ultimaCompra[0] ?? null, historialMensual: comprasMensuales.reverse() },
      ventas: { unidades: Number(ventas[0]?.unidades ?? 0), operaciones: Number(ventas[0]?.operaciones ?? 0), ultimoPrecio: ultimaVenta[0]?.precio ?? null, promedioPonderado: ventas[0]?.promedioPonderado ?? null, ultima: ultimaVenta[0] ?? null, historialMensual: ventasMensuales.reverse() } };
  }

  private async validarMarcaModelo(marcaId: string) {
    const [marca] = await db.select({ id: marcasProductos.id }).from(marcasProductos)
      .where(and(eq(marcasProductos.id, marcaId), or(eq(marcasProductos.uso, "MOTOTAXIS"), eq(marcasProductos.uso, "AMBOS")))).limit(1);
    if (!marca) throw new BadRequestException("La marca seleccionada no está habilitada para mototaxis.");
  }

  private async obtenerModelo(id: string) {
    const [modelo] = await db.select({ id: modelosMototaxis.id, codigo: modelosMototaxis.codigo, marcaId: marcasProductos.id, marca: marcasProductos.nombre, nombre: modelosMototaxis.nombre,
      version: modelosMototaxis.version, precioVenta: modelosMototaxis.precioVenta, categoriaVehicular: modelosMototaxis.categoriaVehicular, fabricante: modelosMototaxis.fabricante, paisFabricacion: modelosMototaxis.paisFabricacion,
      marcaMotor: modelosMototaxis.marcaMotor, modeloMotor: modelosMototaxis.modeloMotor, tipoMototaxi: modelosMototaxis.tipoMototaxi, tipoMotor: modelosMototaxis.tipoMotor, tipoRefrigeracion: modelosMototaxis.tipoRefrigeracion, coloresDisponibles: modelosMototaxis.coloresDisponibles, cilindradaCc: modelosMototaxis.cilindradaCc, combustible: modelosMototaxis.combustible,
      transmision: modelosMototaxis.transmision, carroceria: modelosMototaxis.carroceria, capacidadAsientos: modelosMototaxis.capacidadAsientos,
      capacidadCargaKg: modelosMototaxis.capacidadCargaKg, especificacionesAdicionales: modelosMototaxis.especificacionesAdicionales, activo: modelosMototaxis.activo })
      .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).where(eq(modelosMototaxis.id, id)).limit(1);
    if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
    return modelo;
  }

  async listarProveedores(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    return db.select({ id: proveedores.personaId, nombre: sql<string>`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      razonSocial: personas.razonSocial, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
      tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento })
      .from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(and(eq(proveedores.activo, true), q ? or(ilike(personas.razonSocial, `%${q}%`), ilike(personas.nombres, `%${q}%`), ilike(personas.apellidoPaterno, `%${q}%`), ilike(personas.numeroDocumento, `%${q}%`)) : undefined))
      .orderBy(asc(sql`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, ${personas.nombres})`)).limit(50);
  }

  async listarDirectorioProveedores(paginaEntrada?: string, porPaginaEntrada?: string, busquedaEntrada?: string) {
    const pagina = Math.max(1, Number.parseInt(paginaEntrada ?? "1", 10) || 1);
    const porPagina = Math.min(50, Math.max(1, Number.parseInt(porPaginaEntrada ?? "10", 10) || 10));
    const q = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    const filtroBusqueda = q ? or(ilike(personas.razonSocial, `%${q}%`), ilike(personas.nombres, `%${q}%`), ilike(personas.apellidoPaterno, `%${q}%`), ilike(personas.numeroDocumento, `%${q}%`)) : undefined;
    const condicion = and(eq(proveedores.activo, true), filtroBusqueda);
    const [{ total }] = await db.select({ total: count() }).from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).where(condicion);
    const items = await db.select({ id: proveedores.personaId, nombre: sql<string>`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      razonSocial: personas.razonSocial, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
      tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento })
      .from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(condicion).orderBy(asc(sql`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, ${personas.nombres})`))
      .limit(porPagina).offset((pagina - 1) * porPagina);
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async crearProveedor(valor: unknown) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del proveedor no son válidos.");
    const d = valor as Record<string, unknown>;
    const tipoDocumento = texto(d.tipoDocumento, "El tipo de documento", 3, true)!;
    if (tipoDocumento !== "RUC" && tipoDocumento !== "DNI") throw new BadRequestException("El proveedor debe registrarse con DNI o RUC.");
    const numeroDocumento = texto(d.numeroDocumento, "El número de documento", 11, true)!;
    if (tipoDocumento === "DNI" && !/^\d{8}$/.test(numeroDocumento)) throw new BadRequestException("El DNI debe tener 8 dígitos.");
    if (tipoDocumento === "RUC" && !/^\d{11}$/.test(numeroDocumento)) throw new BadRequestException("El RUC debe tener 11 dígitos.");
    const esJuridica = tipoDocumento === "RUC" && numeroDocumento.startsWith("20");
    const nombre = esJuridica ? texto(d.razonSocial, "La razón social", 180, true)! : null;
    const nombres = esJuridica ? null : texto(d.nombres, "Los nombres", 120, true);
    const apellidoPaterno = esJuridica ? null : texto(d.apellidoPaterno, "El apellido paterno", 120, true);
    const apellidoMaterno = esJuridica ? null : texto(d.apellidoMaterno, "El apellido materno", 120);
    const [tipoDoc] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(eq(tiposDocumento.codigo, tipoDocumento)).limit(1);
    const [tipoPer] = await db.select({ id: tiposPersona.id }).from(tiposPersona).where(eq(tiposPersona.codigo, esJuridica ? "JURIDICA" : "NATURAL")).limit(1);
    if (!tipoDoc || !tipoPer) throw new NotFoundException("Falta configurar el tipo de persona o documento requerido.");
    return db.transaction(async (tx) => {
      let [persona] = await tx.select({ id: personas.id }).from(personas).where(and(eq(personas.tipoDocumentoId, tipoDoc.id), eq(personas.numeroDocumento, numeroDocumento))).limit(1);
      if (!persona) {
        try {
          [persona] = await tx.insert(personas).values({ tipoPersonaId: tipoPer.id, tipoDocumentoId: tipoDoc.id, numeroDocumento, razonSocial: nombre, nombres, apellidoPaterno, apellidoMaterno }).returning({ id: personas.id });
        } catch (error) { if (!this.esDuplicado(error)) throw error; [persona] = await tx.select({ id: personas.id }).from(personas).where(and(eq(personas.tipoDocumentoId, tipoDoc.id), eq(personas.numeroDocumento, numeroDocumento))).limit(1); }
      }
      if (!persona) throw new ConflictException("No se pudo registrar la persona proveedora.");
      try {
        await tx.insert(proveedores).values({ personaId: persona.id, nombreComercial: texto(d.nombreComercial, "El nombre comercial", 180) });
      } catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Esta persona ya está registrada como proveedor."); throw error; }
      return { id: persona.id, nombre: d.nombreComercial || nombre || [nombres, apellidoPaterno, apellidoMaterno].filter(Boolean).join(" "), tipoDocumento, numeroDocumento,
        razonSocial: nombre, nombres, apellidoPaterno, apellidoMaterno };
    });
  }

  async listarUnidades(filtros: { busqueda?: string; estado?: string; pagina?: string; porPagina?: string }) {
    const pagina = Math.max(1, Number.parseInt(filtros.pagina ?? "1", 10) || 1);
    const solicitado = Number.parseInt(filtros.porPagina ?? "12", 10);
    const porPagina = [12, 24, 48].includes(solicitado) ? solicitado : 12;
    const q = (filtros.busqueda ?? "").trim().slice(0, 100);
    const patron = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : "";
    const estados = ["DISPONIBLE", "RESERVADA", "VENDIDA", "GARANTIA", "USO_INTERNO", "BAJA", "FALTANTE"];
    if (filtros.estado && filtros.estado !== "TODOS" && !estados.includes(filtros.estado)) throw new BadRequestException("El estado de mototaxi no es válido.");
    const condicion = and(filtros.estado && filtros.estado !== "TODOS" ? eq(unidadesMototaxis.estado, filtros.estado) : undefined,
      patron ? or(ilike(unidadesMototaxis.codigo, patron), ilike(unidadesMototaxis.vin, patron), ilike(unidadesMototaxis.numeroMotor, patron), ilike(unidadesMototaxis.placa, patron), ilike(modelosMototaxis.nombre, patron), ilike(marcasProductos.nombre, patron)) : undefined);
    const [items, [total], disponiblesPorColor] = await Promise.all([
      db.select({ id: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, modeloId: modelosMototaxis.id, marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version, precioVenta: modelosMototaxis.precioVenta,
        vin: unidadesMototaxis.vin, numeroMotor: unidadesMototaxis.numeroMotor, numeroChasis: unidadesMototaxis.numeroChasis, anioModelo: unidadesMototaxis.anioModelo, color: unidadesMototaxis.color,
        placa: unidadesMototaxis.placa, estado: unidadesMototaxis.estado, costoAdquisicion: unidadesMototaxis.costoAdquisicion, compraDetalleId: unidadesMototaxis.compraDetalleId })
        .from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
        .where(condicion).orderBy(desc(unidadesMototaxis.creadoEn)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).where(condicion),
      db.select({ modeloId: modelosMototaxis.id, marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, color: unidadesMototaxis.color, cantidad: count() })
        .from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
        .where(eq(unidadesMototaxis.estado, "DISPONIBLE")).groupBy(modelosMototaxis.id, marcasProductos.nombre, modelosMototaxis.nombre, unidadesMototaxis.color).orderBy(asc(marcasProductos.nombre), asc(modelosMototaxis.nombre), asc(unidadesMototaxis.color)),
    ]);
    const n = Number(total?.total ?? 0);
    return { items, total: n, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(n / porPagina)), disponiblesPorColor };
  }

  async crearCompra(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos de compra no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.proveedorPersonaId)) throw new BadRequestException("Selecciona un proveedor del directorio.");
    const fecha = fechaValida(d.fecha, "La fecha de compra");
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha de compra no puede ser posterior a hoy.");
    const documentoTipo = texto(d.documentoTipo, "El tipo de documento", 20, true)!;
    if (!["FACTURA", "BOLETA", "NOTA", "OTRO", "SIN_DOCUMENTO"].includes(documentoTipo)) throw new BadRequestException("Selecciona el tipo de documento de compra.");
    if (!Array.isArray(d.unidades) || d.unidades.length < 1 || d.unidades.length > 30) throw new BadRequestException("Registra entre 1 y 30 unidades por compra.");
    const pagoTotal = importe(d.importePagoInicial, "El pago al contado");
    const pagosSolicitados = Array.isArray(d.pagosIniciales) ? d.pagosIniciales : [{ importePagado: pagoTotal, medioPago: d.medioPago ?? "EFECTIVO", cuentaFinancieraId: d.cuentaFinancieraId }];
    const pagosIniciales = await Promise.all(pagosSolicitados.map(async (valor) => {
      if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Revisa los medios de pago ingresados.");
      const pago = valor as Record<string, unknown>;
      const importePagado = importe(pago.importePagado, "El importe del medio de pago");
      const medio = texto(pago.medioPago, "El medio de pago", 30, true)!;
      if (!(mediosPago as readonly string[]).includes(medio)) throw new BadRequestException("Selecciona un medio de pago válido.");
      const cuentaFinancieraId = await validarCuentaFinanciera(pago.cuentaFinancieraId, medio, true);
      return { importePagado, medioPago: medio, cuentaFinancieraId };
    }));
    const unidades = d.unidades.map((entrada, i) => {
      if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException(`La unidad ${i + 1} no es válida.`);
      const u = entrada as Record<string, unknown>;
      if (!uuidValido(u.modeloId)) throw new BadRequestException(`Selecciona el modelo de la unidad ${i + 1}.`);
      const costo = importe(u.costoAdquisicion, `El costo de la unidad ${i + 1}`, 0.01);
      const porcentaje = Number(u.porcentajeGarantia ?? 70);
      const meses = Number(u.mesesGarantia ?? 12);
      if (![70, 80].includes(porcentaje)) throw new BadRequestException("La cobertura de garantía debe ser 70% u 80%.");
      if (!Number.isInteger(meses) || meses < 1 || meses > 120) throw new BadRequestException("El plazo de garantía debe estar entre 1 y 120 meses.");
      return { modeloId: u.modeloId as string, costo, porcentaje, meses, vin: texto(u.vin, "El VIN", 40, true), motor: texto(u.numeroMotor, "El número de motor", 100, true), chasis: texto(u.numeroChasis, "El número de chasis", 100), anio: u.anioModelo == null || u.anioModelo === "" ? null : Number(u.anioModelo), color: texto(u.color, "El color", 60, true)! };
    });
    const total = redondear(unidades.reduce((s, u) => s + u.costo, 0));
    const sumaPagos = pagosIniciales.reduce((suma, pago) => suma + pago.importePagado, 0);
    if (Math.round(sumaPagos * 100) !== Math.round(total * 100)) throw new BadRequestException("Distribuye el total de la compra entre los medios de pago.");
    const codigo = `CM-${fecha.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return db.transaction(async (tx) => {
      const proveedorId = d.proveedorPersonaId as string;
      const [proveedor] = await tx.select({ id: proveedores.personaId, numeroDocumento: personas.numeroDocumento, tipoDocumento: tiposDocumento.codigo }).from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id)).where(and(eq(proveedores.personaId, proveedorId), eq(proveedores.activo, true))).limit(1);
      if (!proveedor) throw new NotFoundException("El proveedor no existe o está inactivo.");
      const modelos = await tx.select({ id: modelosMototaxis.id, coloresDisponibles: modelosMototaxis.coloresDisponibles }).from(modelosMototaxis).where(and(eq(modelosMototaxis.activo, true), inArray(modelosMototaxis.id, [...new Set(unidades.map((u) => u.modeloId))]))).for("update");
      if (new Set(modelos.map((m) => m.id)).size !== new Set(unidades.map((u) => u.modeloId)).size) throw new BadRequestException("Cada unidad debe pertenecer a un modelo activo del catálogo de mototaxis.");
      const coloresPorModelo = new Map(modelos.map((modelo) => [modelo.id, modelo.coloresDisponibles]));
      for (const unidad of unidades) { const disponibles = coloresPorModelo.get(unidad.modeloId) ?? []; if (disponibles.length && !disponibles.some((color) => color.toLocaleLowerCase("es-PE") === unidad.color!.toLocaleLowerCase("es-PE"))) throw new BadRequestException("El color de una unidad no corresponde a los colores configurados para su modelo."); }
      const [compra] = await tx.insert(comprasMototaxis).values({ codigo, proveedorPersonaId: proveedorId, fecha, documentoTipo, documentoNumero: texto(d.documentoNumero, "El número del documento", 80), moneda: texto(d.moneda ?? "PEN", "La moneda", 3, true)!, total: total.toFixed(2), observacion: texto(d.observacion, "La observación", 2000), usuarioId }).returning();
      const detallePorModelo = new Map<string, string>();
      for (const modeloId of [...new Set(unidades.map((u) => u.modeloId))]) {
        const grupos = unidades.filter((u) => u.modeloId === modeloId);
        const [detalle] = await tx.insert(comprasMototaxisDetalle).values({ compraId: compra.id, modeloId, orden: detallePorModelo.size + 1, cantidad: grupos.length, costoUnitario: (grupos.reduce((s, u) => s + u.costo, 0) / grupos.length).toFixed(2) }).returning();
        detallePorModelo.set(modeloId, detalle.id);
      }
      for (const unidad of unidades) {
        const codigoUnidad = `MT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const datosUnidad: typeof unidadesMototaxis.$inferInsert = { codigo: codigoUnidad, compraDetalleId: detallePorModelo.get(unidad.modeloId)!, modeloId: unidad.modeloId,
          vin: unidad.vin!, numeroMotor: unidad.motor!, numeroChasis: unidad.chasis, anioModelo: unidad.anio, color: unidad.color, costoAdquisicion: unidad.costo.toFixed(2) };
        const [insertada] = await tx.insert(unidadesMototaxis).values(datosUnidad).returning();
        await tx.insert(movimientosMototaxis).values({ unidadId: insertada.id, tipo: "RECEPCION", estadoNuevo: "DISPONIBLE", motivo: "COMPRA", observacion: `Recepción de compra ${codigo}`, usuarioId });
        const iniciaEn = fecha;
        const termina = this.sumarMeses(fecha, unidad.meses);
        await tx.insert(garantiasMototaxis).values({ unidadId: insertada.id, proveedorPersonaId: proveedorId, porcentajeProveedor: String(unidad.porcentaje), mesesVigencia: unidad.meses, iniciaEn, terminaEn: termina });
      }
      await tx.insert(pagosComprasMototaxis).values(pagosIniciales.map((pago) => ({ compraId: compra.id, fechaPago: fecha, importePagado: pago.importePagado.toFixed(2), medioPago: pago.medioPago, cuentaFinancieraId: pago.cuentaFinancieraId, claveIdempotencia: randomUUID(), usuarioId })));
      return { id: compra.id, codigo, fecha, total: compra.total, unidades: unidades.length, importePagado: pagoTotal.toFixed(2), saldoPendiente: "0.00" };
    }).catch((error) => { if (this.esDuplicado(error)) throw new ConflictException("El VIN, la placa u otro identificador de la unidad ya está registrado."); throw error; });
  }

  async listarCompras(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    const patron = q ? `%${q.replace(/[\\%_]/g, "\\$&")}%` : "";
    return db.select({ id: comprasMototaxis.id, codigo: comprasMototaxis.codigo, fecha: comprasMototaxis.fecha, documentoTipo: comprasMototaxis.documentoTipo,
      documentoNumero: comprasMototaxis.documentoNumero, moneda: comprasMototaxis.moneda, total: comprasMototaxis.total, observacion: comprasMototaxis.observacion,
      proveedor: sql<string>`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      unidades: sql<number>`coalesce((select sum(d.cantidad)::int from compras_mototaxis_detalle d where d.compra_id = ${comprasMototaxis.id}),0)`,
      pagado: sql<string>`coalesce((select sum(p.importe_pagado) from pagos_compras_mototaxis p where p.compra_id = ${comprasMototaxis.id}),0)::numeric(14,2)`,
      saldo: sql<string>`greatest(${comprasMototaxis.total} - coalesce((select sum(p.importe_pagado) from pagos_compras_mototaxis p where p.compra_id = ${comprasMototaxis.id}),0),0)::numeric(14,2)` })
      .from(comprasMototaxis).innerJoin(proveedores, eq(comprasMototaxis.proveedorPersonaId, proveedores.personaId)).innerJoin(personas, eq(proveedores.personaId, personas.id))
      .where(patron ? or(ilike(comprasMototaxis.codigo, patron), ilike(comprasMototaxis.documentoNumero, patron), ilike(personas.razonSocial, patron), ilike(personas.nombres, patron), ilike(personas.numeroDocumento, patron)) : undefined)
      .orderBy(desc(comprasMototaxis.fecha), desc(comprasMototaxis.creadoEn)).limit(100);
  }

  async listarPagosCompra(compraId: string) {
    if (!uuidValido(compraId)) throw new BadRequestException("La compra no es válida.");
    return db.select({ id: pagosComprasMototaxis.id, fechaPago: pagosComprasMototaxis.fechaPago, importePagado: pagosComprasMototaxis.importePagado,
      medioPago: pagosComprasMototaxis.medioPago, cuentaFinancieraId: pagosComprasMototaxis.cuentaFinancieraId, creadoEn: pagosComprasMototaxis.creadoEn })
      .from(pagosComprasMototaxis).where(eq(pagosComprasMototaxis.compraId, compraId)).orderBy(asc(pagosComprasMototaxis.fechaPago), asc(pagosComprasMototaxis.creadoEn));
  }

  async aplicarPagoCompra(compraId: string, valor: unknown, usuarioId: string) {
    if (!uuidValido(compraId) || !valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("El pago o la compra no son válidos.");
    const d = valor as Record<string, unknown>;
    const fechaPago = fechaValida(d.fechaPago, "La fecha del pago");
    if (fechaPago > fechaActualPeru()) throw new BadRequestException("La fecha del pago no puede ser posterior a hoy.");
    const importePagado = importe(d.importePagado, "El importe del pago", 0.01);
    const medioPago = texto(d.medioPago, "El medio de pago", 30, true)!;
    if (!(mediosPago as readonly string[]).includes(medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    const cuentaFinancieraId = await validarCuentaFinanciera(d.cuentaFinancieraId, medioPago, true);
    if (!uuidValido(d.claveIdempotencia)) throw new BadRequestException("La clave de idempotencia del pago no es válida.");
    return db.transaction(async (tx) => {
      const [existente] = await tx.select().from(pagosComprasMototaxis).where(eq(pagosComprasMototaxis.claveIdempotencia, d.claveIdempotencia as string)).limit(1);
      if (existente) {
        if (existente.compraId !== compraId || existente.fechaPago !== fechaPago || Number(existente.importePagado) !== importePagado || existente.medioPago !== medioPago || existente.cuentaFinancieraId !== cuentaFinancieraId) throw new ConflictException("La clave de pago ya se utilizó para otra operación.");
        return existente;
      }
      const [compra] = await tx.select().from(comprasMototaxis).where(eq(comprasMototaxis.id, compraId)).for("update").limit(1);
      if (!compra) throw new NotFoundException("No se encontró la compra de mototaxi.");
      const [resumen] = await tx.select({ pagado: sql<string>`coalesce(sum(${pagosComprasMototaxis.importePagado}),0)::numeric(14,2)` })
        .from(pagosComprasMototaxis).where(eq(pagosComprasMototaxis.compraId, compraId));
      const saldo = redondear(Number(compra.total) - Number(resumen?.pagado ?? 0));
      if (Math.round(importePagado * 100) !== Math.round(saldo * 100)) throw new BadRequestException(`Las compras de mototaxi se cancelan al contado. Registra el saldo completo de S/ ${saldo.toFixed(2)} en una sola operación.`);
      const [pago] = await tx.insert(pagosComprasMototaxis).values({ compraId, fechaPago, importePagado: importePagado.toFixed(2), medioPago, cuentaFinancieraId,
        claveIdempotencia: d.claveIdempotencia as string, usuarioId }).returning();
      return pago;
    });
  }

  async cambiarEstado(id: string, valor: unknown, usuarioId: string) {
    if (!uuidValido(id) || !valor || typeof valor !== "object") throw new BadRequestException("La unidad o el ajuste no son válidos.");
    const d = valor as Record<string, unknown>;
    const estados = ["DISPONIBLE", "RESERVADA", "GARANTIA", "USO_INTERNO", "BAJA"];
    if (typeof d.estado !== "string" || !estados.includes(d.estado)) throw new BadRequestException("Selecciona un estado válido.");
    const motivo = texto(d.motivo, "El motivo del movimiento", 40, true)!;
    if (!motivo.trim()) throw new BadRequestException("Indica el motivo del ajuste.");
    return db.transaction(async (tx) => {
      const [unidad] = await tx.select().from(unidadesMototaxis).where(eq(unidadesMototaxis.id, id)).for("update").limit(1);
      if (!unidad) throw new NotFoundException("No se encontró la mototaxi.");
      if (["VENDIDA", "BAJA"].includes(unidad.estado)) throw new ConflictException("Una unidad vendida o dada de baja no puede cambiarse directamente. Registra la devolución o reversa correspondiente.");
      if (unidad.estado === "FALTANTE") throw new ConflictException("La unidad está marcada como no encontrada. Para recuperarla, regístrala como encontrada en el siguiente reconteo del modelo.");
      const estado = d.estado as typeof estados[number];
      const [actualizada] = await tx.update(unidadesMototaxis).set({ estado }).where(eq(unidadesMototaxis.id, id)).returning();
      await tx.insert(movimientosMototaxis).values({ unidadId: id, tipo: "AJUSTE", estadoAnterior: unidad.estado, estadoNuevo: estado, motivo, observacion: texto(d.observacion, "La observación", 2000), usuarioId });
      return actualizada;
    });
  }

  async obtenerReconteoModelo(modeloId: string) {
    if (!uuidValido(modeloId)) throw new BadRequestException("Selecciona un modelo de mototaxi válido.");
    const [modelo] = await db.select({ id: modelosMototaxis.id, marca: marcasProductos.nombre, nombre: modelosMototaxis.nombre, version: modelosMototaxis.version })
      .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).where(eq(modelosMototaxis.id, modeloId)).limit(1);
    if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
    const unidades = await db.select({ id: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin, numeroMotor: unidadesMototaxis.numeroMotor, numeroChasis: unidadesMototaxis.numeroChasis, estado: unidadesMototaxis.estado })
      .from(unidadesMototaxis).where(and(eq(unidadesMototaxis.modeloId, modeloId), notInArray(unidadesMototaxis.estado, ["VENDIDA", "BAJA"]))).orderBy(asc(unidadesMototaxis.vin));
    return { modelo, cantidadSistema: unidades.filter((unidad) => unidad.estado !== "FALTANTE").length, unidades };
  }

  async crearAjusteInventario(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del reconteo no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.modeloId)) throw new BadRequestException("Selecciona un modelo de mototaxi válido.");
    if (d.cantidadContada !== undefined) {
      const cantidadContada = Number(d.cantidadContada);
      if (!Number.isInteger(cantidadContada) || cantidadContada < 0) throw new BadRequestException("La cantidad contada debe ser un número entero igual o mayor que cero.");
      const motivo = texto(d.motivo, "El motivo del ajuste", 120, true)!;
      if (motivo.trim().length < 2) throw new BadRequestException("El motivo debe tener al menos dos caracteres.");
      const observacion = texto(d.observacion, "La observación", 2000);
      const codigo = `AI-${fechaActualPeru().replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
      return db.transaction(async (tx) => {
        const [modelo] = await tx.select({ id: modelosMototaxis.id }).from(modelosMototaxis).where(eq(modelosMototaxis.id, d.modeloId as string)).for("update").limit(1);
        if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
        const unidadesModelo = await tx.select({ id: unidadesMototaxis.id, estado: unidadesMototaxis.estado })
          .from(unidadesMototaxis).where(and(eq(unidadesMototaxis.modeloId, modelo.id), notInArray(unidadesMototaxis.estado, ["VENDIDA", "BAJA"]))).for("update");
        const cantidadSistema = unidadesModelo.filter((unidad) => unidad.estado !== "FALTANTE").length;
        const [ajuste] = await tx.insert(ajustesInventarioMototaxis).values({ codigo, modeloId: modelo.id, cantidadSistema, cantidadContada, motivo, observacion, usuarioId }).returning();
        return { id: ajuste.id, codigo, cantidadSistema, cantidadContada, nuevas: 0, faltantes: 0, recuperadas: 0 };
      });
    }
    if (!Array.isArray(d.unidadesSistemaIds) || !Array.isArray(d.unidadesEncontradas) || !Array.isArray(d.unidadesNuevas)) throw new BadRequestException("Registra las unidades del sistema, las encontradas y los VIN nuevos del reconteo.");
    if (d.unidadesNuevas.length > 50) throw new BadRequestException("Un ajuste permite incorporar hasta 50 VIN nuevos.");
    const motivo = texto(d.motivo, "El motivo del ajuste", 120, true)!;
    if (motivo.trim().length < 2) throw new BadRequestException("El motivo debe tener al menos dos caracteres.");
    const observacion = texto(d.observacion, "La observación", 2000);
    const idsEncontrados = d.unidadesEncontradas;
    if (idsEncontrados.some((id) => !uuidValido(id)) || new Set(idsEncontrados).size !== idsEncontrados.length) throw new BadRequestException("La lista de unidades encontradas contiene identificadores inválidos o repetidos.");
    const idsVistosEnFormulario = d.unidadesSistemaIds;
    if (idsVistosEnFormulario.some((id) => !uuidValido(id)) || new Set(idsVistosEnFormulario).size !== idsVistosEnFormulario.length) throw new BadRequestException("La lista de unidades del reconteo contiene identificadores inválidos o repetidos.");
    const nuevas = d.unidadesNuevas.map((entrada, indice) => {
      if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException(`Completa los datos del VIN nuevo ${indice + 1}.`);
      const unidad = entrada as Record<string, unknown>;
      const vin = texto(unidad.vin, "El VIN", 40, true)!;
      const motor = texto(unidad.numeroMotor, "El número de motor", 100, true)!;
      const costo = importe(unidad.costoAdquisicion, "El costo de adquisición", 0.01);
      const anio = unidad.anioModelo === "" || unidad.anioModelo == null ? null : Number(unidad.anioModelo);
      if (anio !== null && (!Number.isInteger(anio) || anio < 1990 || anio > 2100)) throw new BadRequestException("El año del modelo debe estar entre 1990 y 2100.");
      return { vin, motor, chasis: texto(unidad.numeroChasis, "El número de chasis", 100), color: texto(unidad.color, "El color", 60), anio, costo };
    });
    if (new Set(nuevas.map((u) => u.vin.toLocaleUpperCase())).size !== nuevas.length) throw new BadRequestException("Hay VIN repetidos entre las unidades nuevas.");
    const codigo = `AI-${fechaActualPeru().replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return db.transaction(async (tx) => {
      const [modelo] = await tx.select({ id: modelosMototaxis.id }).from(modelosMototaxis).where(eq(modelosMototaxis.id, d.modeloId as string)).for("update").limit(1);
      if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
      const unidadesModelo = await tx.select({ id: unidadesMototaxis.id, estado: unidadesMototaxis.estado })
        .from(unidadesMototaxis).where(and(eq(unidadesMototaxis.modeloId, modelo.id), notInArray(unidadesMototaxis.estado, ["VENDIDA", "BAJA"]))).for("update");
      const idsSistema = new Set(unidadesModelo.map((unidad) => unidad.id));
      if (idsEncontrados.some((id) => !idsSistema.has(id as string)) || idsVistosEnFormulario.length !== unidadesModelo.length || idsVistosEnFormulario.some((id) => !idsSistema.has(id as string))) throw new ConflictException("El inventario cambió mientras preparabas el reconteo. Recarga las unidades y vuelve a comparar.");
      const activasSistema = unidadesModelo.filter((unidad) => unidad.estado !== "FALTANTE");
      const faltantes = activasSistema.filter((unidad) => !idsEncontrados.includes(unidad.id));
      const recuperadas = unidadesModelo.filter((unidad) => unidad.estado === "FALTANTE" && idsEncontrados.includes(unidad.id));
      const cantidadContada = idsEncontrados.length + nuevas.length;
      const [ajuste] = await tx.insert(ajustesInventarioMototaxis).values({ codigo, modeloId: modelo.id, cantidadSistema: activasSistema.length, cantidadContada, motivo, observacion, usuarioId }).returning();
      for (const unidadFaltante of faltantes) {
        const [actualizada] = await tx.update(unidadesMototaxis).set({ estado: "FALTANTE" }).where(eq(unidadesMototaxis.id, unidadFaltante.id)).returning({ id: unidadesMototaxis.id, vin: unidadesMototaxis.vin, codigo: unidadesMototaxis.codigo });
        await tx.insert(ajustesInventarioMototaxisDetalle).values({ ajusteId: ajuste.id, unidadId: actualizada.id, tipo: "FALTANTE" });
        await tx.insert(movimientosMototaxis).values({ unidadId: actualizada.id, tipo: "AJUSTE", estadoAnterior: unidadFaltante.estado, estadoNuevo: "FALTANTE", motivo: "RECONTEO_FALTANTE", observacion: `Ajuste ${codigo}: VIN no encontrado en el reconteo.${observacion ? ` ${observacion}` : ""}`, usuarioId });
      }
      if (recuperadas.length) {
        const movimientosPrevios = await tx.select({ unidadId: movimientosMototaxis.unidadId, estadoAnterior: movimientosMototaxis.estadoAnterior })
          .from(movimientosMototaxis).where(and(inArray(movimientosMototaxis.unidadId, recuperadas.map((unidad) => unidad.id)), eq(movimientosMototaxis.motivo, "RECONTEO_FALTANTE"))).orderBy(desc(movimientosMototaxis.creadoEn));
        const estadoPrevioPorUnidad = new Map<string, string>();
        for (const movimiento of movimientosPrevios) if (movimiento.estadoAnterior && !estadoPrevioPorUnidad.has(movimiento.unidadId)) estadoPrevioPorUnidad.set(movimiento.unidadId, movimiento.estadoAnterior);
        for (const unidadRecuperada of recuperadas) {
          const estadoRestaurado = estadoPrevioPorUnidad.get(unidadRecuperada.id) ?? "DISPONIBLE";
          await tx.update(unidadesMototaxis).set({ estado: estadoRestaurado }).where(eq(unidadesMototaxis.id, unidadRecuperada.id));
          await tx.insert(ajustesInventarioMototaxisDetalle).values({ ajusteId: ajuste.id, unidadId: unidadRecuperada.id, tipo: "RECUPERADA" });
          await tx.insert(movimientosMototaxis).values({ unidadId: unidadRecuperada.id, tipo: "AJUSTE", estadoAnterior: "FALTANTE", estadoNuevo: estadoRestaurado, motivo: "RECONTEO_RECUPERADA", observacion: `Ajuste ${codigo}: VIN encontrado en un nuevo reconteo.${observacion ? ` ${observacion}` : ""}`, usuarioId });
        }
      }
      for (const unidadNueva of nuevas) {
        const codigoUnidad = `MT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
        const [insertada] = await tx.insert(unidadesMototaxis).values({ codigo: codigoUnidad, compraDetalleId: null, modeloId: modelo.id, vin: unidadNueva.vin, numeroMotor: unidadNueva.motor, numeroChasis: unidadNueva.chasis, anioModelo: unidadNueva.anio, color: unidadNueva.color, costoAdquisicion: unidadNueva.costo.toFixed(2) }).returning({ id: unidadesMototaxis.id });
        await tx.insert(ajustesInventarioMototaxisDetalle).values({ ajusteId: ajuste.id, unidadId: insertada.id, tipo: "NUEVA" });
        await tx.insert(movimientosMototaxis).values({ unidadId: insertada.id, tipo: "AJUSTE", estadoNuevo: "DISPONIBLE", motivo: "RECONTEO_NUEVA", observacion: `Ajuste ${codigo}: VIN incorporado por reconteo.${observacion ? ` ${observacion}` : ""}`, usuarioId });
      }
      return { id: ajuste.id, codigo, cantidadSistema: activasSistema.length, cantidadContada, nuevas: nuevas.length, faltantes: faltantes.length, recuperadas: recuperadas.length };
    }).catch((error) => { if (this.esDuplicado(error)) throw new ConflictException("Uno de los VIN nuevos, número de motor o chasis ya está registrado."); throw error; });
  }

  async listarAjustesInventario() {
    const ajustes = await db.select({ id: ajustesInventarioMototaxis.id, codigo: ajustesInventarioMototaxis.codigo, modeloId: ajustesInventarioMototaxis.modeloId, marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version, cantidadSistema: ajustesInventarioMototaxis.cantidadSistema, cantidadContada: ajustesInventarioMototaxis.cantidadContada, motivo: ajustesInventarioMototaxis.motivo, observacion: ajustesInventarioMototaxis.observacion, creadoEn: ajustesInventarioMototaxis.creadoEn })
      .from(ajustesInventarioMototaxis).innerJoin(modelosMototaxis, eq(ajustesInventarioMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).orderBy(desc(ajustesInventarioMototaxis.creadoEn)).limit(100);
    if (!ajustes.length) return [];
    const detalles = await db.select({ ajusteId: ajustesInventarioMototaxisDetalle.ajusteId, tipo: ajustesInventarioMototaxisDetalle.tipo, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin, numeroMotor: unidadesMototaxis.numeroMotor })
      .from(ajustesInventarioMototaxisDetalle).innerJoin(unidadesMototaxis, eq(ajustesInventarioMototaxisDetalle.unidadId, unidadesMototaxis.id)).where(inArray(ajustesInventarioMototaxisDetalle.ajusteId, ajustes.map((a) => a.id)));
    const porAjuste = new Map<string, typeof detalles>();
    for (const detalle of detalles) porAjuste.set(detalle.ajusteId, [...(porAjuste.get(detalle.ajusteId) ?? []), detalle]);
    return ajustes.map((ajuste) => ({ ...ajuste, diferencias: porAjuste.get(ajuste.id) ?? [] }));
  }

  async listarMovimientos(unidadId: string) {
    if (!uuidValido(unidadId)) throw new BadRequestException("La unidad no es válida.");
    return db.select().from(movimientosMototaxis).where(eq(movimientosMototaxis.unidadId, unidadId)).orderBy(desc(movimientosMototaxis.creadoEn));
  }

  async listarGarantias() {
    return db.select({ id: garantiasMototaxis.id, unidadId: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin,
      marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, proveedor: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      porcentajeProveedor: garantiasMototaxis.porcentajeProveedor, mesesVigencia: garantiasMototaxis.mesesVigencia, iniciaEn: garantiasMototaxis.iniciaEn, terminaEn: garantiasMototaxis.terminaEn,
      alcance: garantiasMototaxis.alcance, exclusiones: garantiasMototaxis.exclusiones })
      .from(garantiasMototaxis).innerJoin(unidadesMototaxis, eq(garantiasMototaxis.unidadId, unidadesMototaxis.id)).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id))
      .innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).innerJoin(personas, eq(garantiasMototaxis.proveedorPersonaId, personas.id)).orderBy(asc(garantiasMototaxis.terminaEn));
  }

  async crearReclamo(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del reclamo no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.garantiaId)) throw new BadRequestException("Selecciona una garantía válida.");
    const fecha = fechaValida(d.fecha, "La fecha del reclamo");
    const descripcionFalla = texto(d.descripcionFalla, "La descripción de la falla", 2000, true)!;
    const costoTotal = importe(d.costoTotal, "El costo total del reclamo");
    const [garantia] = await db.select().from(garantiasMototaxis).where(eq(garantiasMototaxis.id, d.garantiaId)).limit(1);
    if (!garantia) throw new NotFoundException("No se encontró la garantía.");
    if (fecha < garantia.iniciaEn || fecha > garantia.terminaEn) throw new BadRequestException("La fecha del reclamo está fuera de la vigencia de la garantía.");
    const porcentaje = Number(garantia.porcentajeProveedor);
    const importeProveedor = redondear(costoTotal * porcentaje / 100);
    const importeEmpresa = redondear(costoTotal - importeProveedor);
    const [reclamo] = await db.insert(reclamosGarantiaMototaxis).values({ garantiaId: d.garantiaId, fecha, descripcionFalla, costoTotal: costoTotal.toFixed(2), porcentajeProveedorAplicado: String(porcentaje), importeProveedor: importeProveedor.toFixed(2), importeEmpresa: importeEmpresa.toFixed(2), estado: "ABIERTO", usuarioId }).returning();
    return reclamo;
  }

  listarReclamos() { return db.select().from(reclamosGarantiaMototaxis).orderBy(desc(reclamosGarantiaMototaxis.fecha)); }

  private sumarMeses(fecha: string, meses: number) {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const indiceMes = mes - 1 + meses;
    const anioFinal = anio + Math.floor(indiceMes / 12);
    const mesFinal = indiceMes % 12;
    const ultimoDia = new Date(Date.UTC(anioFinal, mesFinal + 1, 0)).getUTCDate();
    return `${anioFinal}-${String(mesFinal + 1).padStart(2, "0")}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}`;
  }

  private esDuplicado(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
}
