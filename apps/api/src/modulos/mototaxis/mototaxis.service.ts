import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";
import { db, ajustesInventarioMototaxis, comprasMototaxis, comprasMototaxisDetalle, entradasStock, garantiasModelosMototaxis, garantiasMototaxis, garantiasVentasMototaxis, ingresos, ingresosDetalle, marcasProductos, modelosMototaxis, movimientosMototaxis, movimientosModelosMototaxis, preciosModelosMototaxis, pagosComprasMototaxis, personas, proveedores, reclamosGarantiaMototaxis, tiposDocumento, tiposPersona, unidadesMototaxis, usuarios } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { bloquearModelos, moverSaldoModelo, precioVigenteModelo, siguientePrecioModelo } from "./inventario-modelos";
import { validarCuentaFinanciera } from "../finanzas/cuentas-financieras.util";

const mediosPago = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"] as const;
const uuidValido = (valor: unknown): valor is string => typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const importeDesdeCentavos = (centavos: bigint) => `${centavos / 100n}.${String(centavos % 100n).padStart(2, "0")}`;
function centavosDeImporte(valor: string | number | null | undefined) {
  const textoImporte = String(valor ?? "0");
  const [entero, decimal = ""] = textoImporte.split(".");
  return BigInt(entero || "0") * 100n + BigInt((decimal + "00").slice(0, 2));
}
const transicionesReclamo: Record<string, readonly string[]> = {
  ABIERTO: ["ENVIADO"],
  ENVIADO: ["APROBADO", "RECHAZADO"],
  APROBADO: ["RESUELTO"],
  RECHAZADO: ["RESUELTO"],
  RESUELTO: [],
};

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

function sumarMeses(fecha: string, meses: number) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fin = new Date(Date.UTC(anio, mes - 1 + meses + 1, 0));
  fin.setUTCDate(Math.min(dia, fin.getUTCDate()));
  return fin.toISOString().slice(0, 10);
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
  if (tipoMotor && !["2_TIEMPOS", "4_TIEMPOS", "MONOCILINDRICO_4T", "ELECTRICO"].includes(tipoMotor)) throw new BadRequestException("Selecciona un tipo de motor válido.");
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
  return {
    marcaId: d.marcaId, nombre, version: texto(d.version, "La versión", 80), categoriaVehicular,
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
    const q = busqueda.trim().slice(0, 100).replace(/[\\%_]/g, "\\$&");
    return db.select({ id: modelosMototaxis.id, codigo: modelosMototaxis.codigo, marcaId: marcasProductos.id, marca: marcasProductos.nombre, nombre: modelosMototaxis.nombre,
      precioProgramado: siguientePrecioModelo("precio"),
      precioProgramadoDesde: siguientePrecioModelo("vigente_desde"),
      version: modelosMototaxis.version, precioVenta: precioVigenteModelo, stockDisponible: modelosMototaxis.stockDisponible, categoriaVehicular: modelosMototaxis.categoriaVehicular, fabricante: modelosMototaxis.fabricante, paisFabricacion: modelosMototaxis.paisFabricacion,
      marcaMotor: modelosMototaxis.marcaMotor, modeloMotor: modelosMototaxis.modeloMotor, tipoMototaxi: modelosMototaxis.tipoMototaxi, tipoMotor: modelosMototaxis.tipoMotor, tipoRefrigeracion: modelosMototaxis.tipoRefrigeracion, coloresDisponibles: modelosMototaxis.coloresDisponibles, cilindradaCc: modelosMototaxis.cilindradaCc, combustible: modelosMototaxis.combustible,
      transmision: modelosMototaxis.transmision, carroceria: modelosMototaxis.carroceria, capacidadAsientos: modelosMototaxis.capacidadAsientos,
      capacidadCargaKg: modelosMototaxis.capacidadCargaKg, especificacionesAdicionales: modelosMototaxis.especificacionesAdicionales, activo: modelosMototaxis.activo })
      .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .where(and(incluirInactivos ? undefined : eq(modelosMototaxis.activo, true), q ? or(ilike(modelosMototaxis.nombre, `%${q}%`), ilike(modelosMototaxis.version, `%${q}%`), ilike(modelosMototaxis.codigo, `%${q}%`), ilike(marcasProductos.nombre, `%${q}%`)) : undefined))
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

  async listarPreciosModelo(id: string) {
    if (!uuidValido(id)) throw new BadRequestException("Selecciona un modelo válido.");
    return db.select({
      id: preciosModelosMototaxis.id, precio: preciosModelosMototaxis.precio,
      vigenteDesde: preciosModelosMototaxis.vigenteDesde, vigenteHasta: preciosModelosMototaxis.vigenteHasta,
      usuario: usuarios.nombreUsuario,
    }).from(preciosModelosMototaxis)
      .leftJoin(usuarios, eq(preciosModelosMototaxis.usuarioId, usuarios.id))
      .where(eq(preciosModelosMototaxis.modeloId, id)).orderBy(desc(preciosModelosMototaxis.vigenteDesde));
  }

  async actualizarPrecioVentaModelo(id: string, valor: unknown, usuarioId: string, precioId?: string) {
    if (!uuidValido(id)) throw new BadRequestException("Selecciona un modelo válido.");
    if (precioId && !uuidValido(precioId)) throw new BadRequestException("Selecciona un precio válido.");
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Indica un precio de venta válido.");
    const datos = valor as Record<string, unknown>;
    const precio = importe(datos.precioVenta, "El precio de venta", 0.01);
    const precioAnterior = precioId ? importe(datos.precioAnterior, "El precio anterior", 0.01) : null;
    if (precio > 999_999_999_999.99) throw new BadRequestException("El precio de venta supera el máximo permitido.");
    const desde = datos.vigenteDesde ? new Date(`${fechaValida(datos.vigenteDesde, "El inicio de vigencia")}T00:00:00-05:00`) : null;
    const hasta = datos.vigenteHasta ? new Date(`${fechaValida(datos.vigenteHasta, "El fin de vigencia")}T00:00:00-05:00`) : null;

    await db.transaction(async (tx) => {
      const [modelo] = await bloquearModelos(tx, [id]);
      if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
      const ahora = new Date();
      const previos = await tx.select().from(preciosModelosMototaxis).where(eq(preciosModelosMototaxis.modeloId, id));
      const anterior = precioId ? previos.find((item) => item.id === precioId) : undefined;
      if (precioId && !anterior) throw new NotFoundException("No se encontró el precio del modelo.");
      if (anterior && ((anterior.vigenteHasta && anterior.vigenteHasta <= ahora) || Number(anterior.precio) !== precioAnterior)) {
        throw new ConflictException("El precio cambió o ya finalizó. Vuelve a abrir el historial.");
      }
      if (anterior && Number(anterior.precio) === precio) return;
      if (anterior && anterior.vigenteDesde >= ahora) {
        await tx.update(preciosModelosMototaxis).set({ precio: precio.toFixed(2), usuarioId }).where(eq(preciosModelosMototaxis.id, anterior.id));
        return;
      }
      const inicio = desde ?? ahora;
      const fin = anterior ? anterior.vigenteHasta : hasta;
      if (inicio < ahora || (fin && fin <= inicio)) throw new BadRequestException("Selecciona una vigencia futura válida o aplica el precio desde ahora.");
      const solapados = previos.filter((item) => (!item.vigenteHasta || item.vigenteHasta > inicio) && (!fin || item.vigenteDesde < fin));
      if (solapados.some((item) => item.vigenteDesde >= inicio)) throw new ConflictException("La vigencia coincide con un precio programado para el modelo.");
      for (const item of solapados) {
        await tx.update(preciosModelosMototaxis).set({ vigenteHasta: inicio }).where(eq(preciosModelosMototaxis.id, item.id));
      }
      await tx.insert(preciosModelosMototaxis).values({ modeloId: id, precio: precio.toFixed(2), vigenteDesde: inicio, vigenteHasta: fin, usuarioId });
    });
    return this.obtenerModelo(id);
  }

  async obtenerAnalisisModelo(id: string) {
    if (!uuidValido(id)) throw new BadRequestException("El modelo seleccionado no es válido.");
    const modelo = await this.obtenerModelo(id);
    const [movimientos, compra, ultimaCompra, ventas, ultimaVenta, comprasMensuales, ventasMensuales] = await Promise.all([
      db.select({ id: movimientosModelosMototaxis.id, tipo: movimientosModelosMototaxis.tipo,
        cantidadAnterior: movimientosModelosMototaxis.cantidadAnterior, cantidadFinal: movimientosModelosMototaxis.cantidadFinal, fecha: movimientosModelosMototaxis.creadoEn,
        usuario: usuarios.nombreUsuario,
      }).from(movimientosModelosMototaxis).innerJoin(usuarios, eq(usuarios.id, movimientosModelosMototaxis.usuarioId))
        .where(eq(movimientosModelosMototaxis.modeloId, id)).orderBy(desc(movimientosModelosMototaxis.creadoEn), desc(movimientosModelosMototaxis.id)).limit(15),
      db.select({ unidades: sql<string>`coalesce(sum(${comprasMototaxisDetalle.cantidad}), 0)`, promedioPonderado: sql<string | null>`case when sum(${comprasMototaxisDetalle.cantidad}) > 0 then round(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / sum(${comprasMototaxisDetalle.cantidad}), 2)::text else null end`, operaciones: count() })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).where(eq(comprasMototaxisDetalle.modeloId, id)),
      db.select({ precio: sql<string>`round(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / sum(${comprasMototaxisDetalle.cantidad}), 2)`, cantidad: sql<number>`sum(${comprasMototaxisDetalle.cantidad})::int`, fecha: comprasMototaxis.fecha, codigo: comprasMototaxis.codigo, documentoTipo: comprasMototaxis.documentoTipo, documentoNumero: comprasMototaxis.documentoNumero, proveedor: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))` })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).innerJoin(personas, eq(comprasMototaxis.proveedorPersonaId, personas.id))
        .where(eq(comprasMototaxisDetalle.modeloId, id)).groupBy(comprasMototaxis.id, personas.id)
        .orderBy(desc(comprasMototaxis.fecha), desc(comprasMototaxis.creadoEn), desc(comprasMototaxis.id)).limit(1),
      db.select({ unidades: sql<string>`coalesce(sum(${ingresosDetalle.cantidad}), 0)`, promedioPonderado: sql<string | null>`case when sum(${ingresosDetalle.cantidad}) > 0 then round(sum(${ingresosDetalle.precioUnitario} * ${ingresosDetalle.cantidad}) / sum(${ingresosDetalle.cantidad}), 2)::text else null end`, operaciones: count() })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
        .where(and(eq(ingresosDetalle.mototaxiModeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))),
      db.select({ precio: ingresosDetalle.precioUnitario, fecha: ingresos.fecha, codigo: ingresos.codigo, tipoComprobante: ingresos.tipoComprobante, cliente: ingresos.clienteNombre })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
        .where(and(eq(ingresosDetalle.mototaxiModeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(1),
      db.select({ mes: sql<string>`to_char(date_trunc('month', ${comprasMototaxis.fecha}::date), 'YYYY-MM')`, promedio: sql<string>`round(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / sum(${comprasMototaxisDetalle.cantidad}), 2)::text`, cantidad: sql<string>`sum(${comprasMototaxisDetalle.cantidad})` })
        .from(comprasMototaxisDetalle).innerJoin(comprasMototaxis, eq(comprasMototaxisDetalle.compraId, comprasMototaxis.id)).where(eq(comprasMototaxisDetalle.modeloId, id)).groupBy(sql`date_trunc('month', ${comprasMototaxis.fecha}::date)`).orderBy(sql`date_trunc('month', ${comprasMototaxis.fecha}::date) desc`).limit(12),
      db.select({ mes: sql<string>`to_char(date_trunc('month', ${ingresos.fecha}::date), 'YYYY-MM')`, promedio: sql<string>`round(sum(${ingresosDetalle.precioUnitario} * ${ingresosDetalle.cantidad}) / sum(${ingresosDetalle.cantidad}), 2)::text`, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})` })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
        .where(and(eq(ingresosDetalle.mototaxiModeloId, id), eq(ingresosDetalle.tipo, "MOTOTAXI"), notInArray(ingresos.estado, ["ANULADO"]))).groupBy(sql`date_trunc('month', ${ingresos.fecha}::date)`).orderBy(sql`date_trunc('month', ${ingresos.fecha}::date) desc`).limit(12),
    ]);
    return { modelo, movimientos, existencias: { disponibles: modelo.stockDisponible },
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
      version: modelosMototaxis.version, precioVenta: precioVigenteModelo, stockDisponible: modelosMototaxis.stockDisponible, categoriaVehicular: modelosMototaxis.categoriaVehicular, fabricante: modelosMototaxis.fabricante, paisFabricacion: modelosMototaxis.paisFabricacion,
      marcaMotor: modelosMototaxis.marcaMotor, modeloMotor: modelosMototaxis.modeloMotor, tipoMototaxi: modelosMototaxis.tipoMototaxi, tipoMotor: modelosMototaxis.tipoMotor, tipoRefrigeracion: modelosMototaxis.tipoRefrigeracion, coloresDisponibles: modelosMototaxis.coloresDisponibles, cilindradaCc: modelosMototaxis.cilindradaCc, combustible: modelosMototaxis.combustible,
      transmision: modelosMototaxis.transmision, carroceria: modelosMototaxis.carroceria, capacidadAsientos: modelosMototaxis.capacidadAsientos,
      capacidadCargaKg: modelosMototaxis.capacidadCargaKg, especificacionesAdicionales: modelosMototaxis.especificacionesAdicionales, activo: modelosMototaxis.activo })
      .from(modelosMototaxis).innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id)).where(eq(modelosMototaxis.id, id)).limit(1);
    if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
    return modelo;
  }

  async listarProveedores(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    return db.select({ id: proveedores.personaId, nombre: sql<string>`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`, nombreComercial: proveedores.nombreComercial,
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
    const items = await db.select({ id: proveedores.personaId, nombre: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}), ${proveedores.nombreComercial})`, nombreComercial: proveedores.nombreComercial,
      razonSocial: personas.razonSocial, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
      tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento })
      .from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(condicion).orderBy(asc(sql`coalesce(${proveedores.nombreComercial}, ${personas.razonSocial}, ${personas.nombres})`))
      .limit(porPagina).offset((pagina - 1) * porPagina);
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async obtenerFichaProveedor(idEntrada: string, permisosUsuario: string[] = []) {
    if (!uuidValido(idEntrada)) throw new BadRequestException("El proveedor no es vÃ¡lido.");
    const [proveedor] = await db.select({ id: proveedores.personaId,
      nombre: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}), ${proveedores.nombreComercial})`,
      nombreComercial: proveedores.nombreComercial,
      razonSocial: personas.razonSocial, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno,
      apellidoMaterno: personas.apellidoMaterno, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento })
      .from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id)).where(eq(proveedores.personaId, idEntrada)).limit(1);
    if (!proveedor) throw new NotFoundException("No se encontrÃ³ el proveedor.");

    const puedeVerRepuestos = permisosUsuario.includes("INVENTARIO.LEER");
    const puedeVerMototaxis = permisosUsuario.includes("MOTOTAXIS.LEER");
    const filtroRepuestos = and(eq(entradasStock.proveedorTipoDocumento, proveedor.tipoDocumento),
      eq(entradasStock.proveedorNumeroDocumento, proveedor.numeroDocumento));
    const filtroMototaxis = eq(comprasMototaxis.proveedorPersonaId, proveedor.id);
    const totalRepuestos = sql<string>`coalesce(${entradasStock.totalDocumento}, ${entradasStock.total})`;
    const pagadoRepuestos = sql<string>`coalesce((select sum(p.importe_pagado) from pagos_entradas_stock p where p.entrada_id = ${entradasStock.id}), ${entradasStock.montoPagado}, 0)::numeric(14,2)`;
    const saldoRepuestos = sql<string>`greatest(${totalRepuestos} - ${pagadoRepuestos}, 0)::numeric(14,2)`;
    const pagadoMototaxis = sql<string>`coalesce((select sum(p.importe_pagado) from pagos_compras_mototaxis p where p.compra_id = ${comprasMototaxis.id}), 0)::numeric(14,2)`;
    const saldoMototaxis = sql<string>`greatest(${comprasMototaxis.total} - ${pagadoMototaxis}, 0)::numeric(14,2)`;

    const [estadisticasRepuestos, comprasRepuestos, estadisticasMototaxis, comprasMototaxisRecientes] = await Promise.all([
      puedeVerRepuestos ? db.select({ compras: count(), total: sql<string>`coalesce(sum(${totalRepuestos}), 0)::numeric(16,2)`, saldo: sql<string>`coalesce(sum(${saldoRepuestos}), 0)::numeric(16,2)` })
        .from(entradasStock).where(filtroRepuestos) : Promise.resolve([]),
      puedeVerRepuestos ? db.select({ id: entradasStock.id, codigo: entradasStock.codigo, fecha: entradasStock.fecha,
        total: totalRepuestos, pagado: pagadoRepuestos, saldo: saldoRepuestos, creadoEn: entradasStock.creadoEn })
        .from(entradasStock).where(filtroRepuestos).orderBy(desc(entradasStock.fecha), desc(entradasStock.creadoEn)).limit(8) : Promise.resolve([]),
      puedeVerMototaxis ? db.select({ moneda: comprasMototaxis.moneda, compras: count(),
        total: sql<string>`coalesce(sum(${comprasMototaxis.total}), 0)::numeric(16,2)`, saldo: sql<string>`coalesce(sum(${saldoMototaxis}), 0)::numeric(16,2)` })
        .from(comprasMototaxis).where(filtroMototaxis).groupBy(comprasMototaxis.moneda) : Promise.resolve([]),
      puedeVerMototaxis ? db.select({ id: comprasMototaxis.id, codigo: comprasMototaxis.codigo, fecha: comprasMototaxis.fecha,
        moneda: comprasMototaxis.moneda, total: comprasMototaxis.total, pagado: pagadoMototaxis, saldo: saldoMototaxis, creadoEn: comprasMototaxis.creadoEn })
        .from(comprasMototaxis).where(filtroMototaxis).orderBy(desc(comprasMototaxis.fecha), desc(comprasMototaxis.creadoEn)).limit(8) : Promise.resolve([]),
    ]);

    const compras = [
      ...comprasRepuestos.map((compra) => ({ ...compra, origen: "REPUESTOS" as const, moneda: "PEN" as const })),
      ...comprasMototaxisRecientes.map((compra) => ({ ...compra, origen: "MOTOTAXIS" as const })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.getTime() - a.creadoEn.getTime()).slice(0, 10);
    const resumenPorMoneda = new Map<string, { compras: number; totalCentavos: bigint; saldoCentavos: bigint }>();
    const agregarResumen = (moneda: string, cantidad: number, total: string, saldo: string) => {
      const actual = resumenPorMoneda.get(moneda) ?? { compras: 0, totalCentavos: 0n, saldoCentavos: 0n };
      actual.compras += cantidad;
      actual.totalCentavos += centavosDeImporte(total);
      actual.saldoCentavos += centavosDeImporte(saldo);
      resumenPorMoneda.set(moneda, actual);
    };
    for (const resumen of estadisticasRepuestos) agregarResumen("PEN", Number(resumen.compras), resumen.total, resumen.saldo);
    for (const resumen of estadisticasMototaxis) agregarResumen(resumen.moneda, Number(resumen.compras), resumen.total, resumen.saldo);
    const resumenCompras = [...resumenPorMoneda.entries()].map(([moneda, resumen]) => ({
      moneda, compras: resumen.compras, totalComprado: importeDesdeCentavos(resumen.totalCentavos), saldoPendiente: importeDesdeCentavos(resumen.saldoCentavos),
    })).sort((a, b) => a.moneda.localeCompare(b.moneda));

    return { proveedor, permisosCompras: { repuestos: puedeVerRepuestos, mototaxis: puedeVerMototaxis }, resumenCompras,
      compras: compras.map(({ creadoEn: _creadoEn, pagado, saldo, ...compra }) => ({ ...compra,
        estadoPago: Number(saldo) <= 0 ? "PAGADA" as const : Number(pagado) <= 0 ? "SIN_PAGO" as const : "SALDO_PENDIENTE" as const,
      })) };
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
    const codigoDocumento = tipoDocumento === "DNI" ? "01" : "06";
    const [tipoDoc] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(eq(tiposDocumento.codigo, codigoDocumento)).limit(1);
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
    if (!Array.isArray(d.detalles) || d.detalles.length < 1 || d.detalles.length > 30) throw new BadRequestException("Registra entre 1 y 30 líneas por compra.");
    const claveIdempotencia = d.claveIdempotencia;
    if (claveIdempotencia !== undefined && !uuidValido(claveIdempotencia)) throw new BadRequestException("La referencia de la compra no es válida.");
    const documentoNumero = documentoTipo === "SIN_DOCUMENTO" ? null : texto(d.documentoNumero, "El número del documento", 80);
    const observacion = texto(d.observacion, "La observación", 2000);
    const moneda = texto(d.moneda ?? "PEN", "La moneda", 3, true)!;
    if (!["PEN", "USD", "EUR"].includes(moneda)) throw new BadRequestException("Selecciona una moneda válida.");
    const pagoTotal = importe(d.importePagoInicial, "El pago al contado");
    const pagosSolicitados = Array.isArray(d.pagosIniciales) ? d.pagosIniciales : [{ importePagado: pagoTotal, medioPago: d.medioPago ?? "EFECTIVO", cuentaFinancieraId: d.cuentaFinancieraId }];
    const pagosIniciales = await Promise.all(pagosSolicitados.map(async (valor) => {
      if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Revisa los medios de pago ingresados.");
      const pago = valor as Record<string, unknown>;
      const importePagado = importe(pago.importePagado, "El importe del medio de pago", 0.01);
      const medio = texto(pago.medioPago, "El medio de pago", 30, true)!;
      if (!(mediosPago as readonly string[]).includes(medio)) throw new BadRequestException("Selecciona un medio de pago válido.");
      const cuentaFinancieraId = await validarCuentaFinanciera(pago.cuentaFinancieraId, medio, true);
      return { importePagado, medioPago: medio, cuentaFinancieraId };
    }));
    const detalles = d.detalles.map((entrada, indice) => {
      if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException(`La línea ${indice + 1} no es válida.`);
      const detalle = entrada as Record<string, unknown>;
      if (!uuidValido(detalle.modeloId)) throw new BadRequestException(`Selecciona el modelo de la línea ${indice + 1}.`);
      const cantidad = typeof detalle.cantidad === "number" || (typeof detalle.cantidad === "string" && detalle.cantidad.trim()) ? Number(detalle.cantidad) : NaN;
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 2_147_483_647) throw new BadRequestException(`Ingresa una cantidad entera en la línea ${indice + 1}.`);
      const porcentajeGarantia = Number(detalle.porcentajeGarantia ?? 80);
      const mesesGarantia = Number(detalle.mesesGarantia ?? 12);
      if (![70, 80].includes(porcentajeGarantia) || !Number.isInteger(mesesGarantia) || mesesGarantia < 1 || mesesGarantia > 120) {
        throw new BadRequestException(`Revisa la cobertura y el plazo de garantía de la línea ${indice + 1}.`);
      }
      return { modeloId: detalle.modeloId, cantidad, costoUnitario: importe(detalle.costoUnitario, `El costo unitario de la línea ${indice + 1}`, 0.01), porcentajeGarantia, mesesGarantia };
    });
    const total = redondear(detalles.reduce((suma, detalle) => suma + detalle.costoUnitario * detalle.cantidad, 0));
    if (total > 999_999_999_999.99) throw new BadRequestException("El total supera el máximo permitido.");
    const sumaPagos = pagosIniciales.reduce((suma, pago) => suma + pago.importePagado, 0);
    if (Math.round(sumaPagos * 100) !== Math.round(total * 100)) throw new BadRequestException("Distribuye el total de la compra entre los medios de pago.");
    const codigo = `CM-${fecha.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const proveedorId = d.proveedorPersonaId;
    const unidades = detalles.reduce((suma, detalle) => suma + detalle.cantidad, 0);
    const huellaSolicitud = createHash("sha256").update(JSON.stringify({ usuarioId, proveedorId, fecha, documentoTipo, documentoNumero, moneda, detalles, pagosIniciales, observacion })).digest("hex");
    return db.transaction(async (tx) => {
      if (claveIdempotencia) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`compra-mototaxis:${claveIdempotencia}`}, 0))`);
        const [existente] = await tx.select().from(comprasMototaxis).where(eq(comprasMototaxis.claveIdempotencia, claveIdempotencia));
        if (existente) {
          if (existente.huellaSolicitud !== huellaSolicitud) throw new ConflictException("La referencia ya corresponde a otra compra. Actualiza el listado antes de seguir.");
          return { id: existente.id, codigo: existente.codigo, fecha: existente.fecha, total: existente.total, unidades, importePagado: existente.total, saldoPendiente: "0.00" };
        }
      }
      const [proveedor] = await tx.select({ id: proveedores.personaId, numeroDocumento: personas.numeroDocumento, tipoDocumento: tiposDocumento.codigo }).from(proveedores).innerJoin(personas, eq(proveedores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id)).where(and(eq(proveedores.personaId, proveedorId), eq(proveedores.activo, true))).limit(1);
      if (!proveedor) throw new NotFoundException("El proveedor no existe o está inactivo.");
      const idsModelos = [...new Set(detalles.map((detalle) => detalle.modeloId))];
      const modelos = await bloquearModelos(tx, idsModelos);
      if (modelos.length !== idsModelos.length || modelos.some((modelo) => !modelo.activo)) throw new BadRequestException("Selecciona modelos activos del catálogo de mototaxis.");
      const [compra] = await tx.insert(comprasMototaxis).values({ codigo, proveedorPersonaId: proveedorId, fecha, documentoTipo, documentoNumero, moneda, total: total.toFixed(2), observacion, usuarioId, claveIdempotencia, huellaSolicitud }).returning();
      for (const [indice, linea] of detalles.entries()) {
        const [detalle] = await tx.insert(comprasMototaxisDetalle).values({
          compraId: compra.id, modeloId: linea.modeloId, orden: indice + 1, cantidad: linea.cantidad, costoUnitario: linea.costoUnitario.toFixed(2),
        }).returning({ id: comprasMototaxisDetalle.id });
        await moverSaldoModelo(tx, { modeloId: linea.modeloId, tipo: "COMPRA", origenId: detalle.id, diferencia: linea.cantidad, usuarioId });
        await tx.insert(garantiasMototaxis).values({
          compraDetalleId: detalle.id, proveedorPersonaId: proveedorId, porcentajeProveedor: String(linea.porcentajeGarantia),
          mesesVigencia: linea.mesesGarantia, iniciaEn: fecha, terminaEn: sumarMeses(fecha, linea.mesesGarantia),
        });
      }
      await tx.insert(pagosComprasMototaxis).values(pagosIniciales.map((pago) => ({ compraId: compra.id, fechaPago: fecha, importePagado: pago.importePagado.toFixed(2), medioPago: pago.medioPago, cuentaFinancieraId: pago.cuentaFinancieraId, claveIdempotencia: randomUUID(), usuarioId })));
      return { id: compra.id, codigo, fecha, total: compra.total, unidades, importePagado: total.toFixed(2), saldoPendiente: "0.00" };
    });
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

  async obtenerReconteoModelo(modeloId: string) {
    if (!uuidValido(modeloId)) throw new BadRequestException("Selecciona un modelo de mototaxi válido.");
    const modelo = await this.obtenerModelo(modeloId);
    return { modelo: { id: modelo.id, marca: modelo.marca, nombre: modelo.nombre, version: modelo.version }, cantidadSistema: modelo.stockDisponible };
  }

  async crearAjusteInventario(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del reconteo no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.modeloId)) throw new BadRequestException("Selecciona un modelo de mototaxi válido.");
    const modeloId = d.modeloId;
    const cantidadContada = d.cantidadContada;
    if (typeof cantidadContada !== "number" || !Number.isInteger(cantidadContada) || cantidadContada < 0 || cantidadContada > 2_147_483_647) {
      throw new BadRequestException("Ingresa una cantidad entera igual o mayor que cero.");
    }
    const motivo = texto(d.motivo, "El motivo del ajuste", 120, true)!;
    if (motivo.length < 2) throw new BadRequestException("El motivo debe tener al menos dos caracteres.");
    const observacion = texto(d.observacion, "La observación", 2000);
    const codigo = `AI-${fechaActualPeru().replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return db.transaction(async (tx) => {
      const [modelo] = await bloquearModelos(tx, [modeloId]);
      if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
      if (d.cantidadSistema !== undefined && d.cantidadSistema !== modelo.saldo) throw new ConflictException("El saldo del modelo cambió. Consulta el saldo actualizado y verifica el conteo.");
      const [ajuste] = await tx.insert(ajustesInventarioMototaxis).values({
        codigo, modeloId, cantidadSistema: modelo.saldo, cantidadContada, motivo, observacion, usuarioId,
      }).returning();
      await moverSaldoModelo(tx, { modeloId, tipo: "AJUSTE", origenId: ajuste.id, diferencia: cantidadContada - modelo.saldo, usuarioId });
      return { id: ajuste.id, codigo, cantidadSistema: modelo.saldo, cantidadContada };
    });
  }

  async listarAjustesInventario() {
    return db.select({
      id: ajustesInventarioMototaxis.id, codigo: ajustesInventarioMototaxis.codigo, modeloId: ajustesInventarioMototaxis.modeloId,
      marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version,
      cantidadSistema: ajustesInventarioMototaxis.cantidadSistema, cantidadContada: ajustesInventarioMototaxis.cantidadContada,
      motivo: ajustesInventarioMototaxis.motivo, observacion: ajustesInventarioMototaxis.observacion, creadoEn: ajustesInventarioMototaxis.creadoEn,
      usuario: usuarios.nombreUsuario, aplicado: sql<boolean>`${movimientosModelosMototaxis.id} is not null`,
    }).from(ajustesInventarioMototaxis)
      .innerJoin(modelosMototaxis, eq(ajustesInventarioMototaxis.modeloId, modelosMototaxis.id))
      .innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .innerJoin(usuarios, eq(usuarios.id, ajustesInventarioMototaxis.usuarioId))
      .leftJoin(movimientosModelosMototaxis, and(eq(movimientosModelosMototaxis.tipo, "AJUSTE"), eq(movimientosModelosMototaxis.origenId, ajustesInventarioMototaxis.id)))
      .orderBy(desc(ajustesInventarioMototaxis.creadoEn), desc(ajustesInventarioMototaxis.id));
  }

  async listarMovimientos(unidadId: string) {
    if (!uuidValido(unidadId)) throw new BadRequestException("La unidad no es válida.");
    return db.select().from(movimientosMototaxis).where(eq(movimientosMototaxis.unidadId, unidadId)).orderBy(desc(movimientosMototaxis.creadoEn));
  }

  async obtenerGarantiaModelo(modeloId: string) {
    if (!uuidValido(modeloId)) throw new BadRequestException("El modelo no es válido.");
    const [garantia] = await db.select().from(garantiasModelosMototaxis).where(eq(garantiasModelosMototaxis.modeloId, modeloId)).limit(1);
    return garantia ?? null;
  }

  async guardarGarantiaModelo(modeloId: string, valor: unknown) {
    if (!uuidValido(modeloId)) throw new BadRequestException("El modelo no es válido.");
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("La garantía no es válida.");
    const d = valor as Record<string, unknown>;
    if (typeof d.activa !== "boolean") throw new BadRequestException("Indica si el modelo cuenta con garantía.");
    const mesesVigencia = Number(d.mesesVigencia);
    if (!Number.isInteger(mesesVigencia) || mesesVigencia < 1 || mesesVigencia > 120) throw new BadRequestException("La vigencia debe estar entre 1 y 120 meses.");
    const alcance = texto(d.alcance, "El alcance de la garantía", 4000, d.activa)!;
    if (d.activa && (alcance?.length ?? 0) < 3) throw new BadRequestException("Describe con claridad qué cubre la garantía (mínimo 3 caracteres).");
    const exclusiones = texto(d.exclusiones, "Las exclusiones", 4000);
    const [modelo] = await db.select({ id: modelosMototaxis.id }).from(modelosMototaxis).where(eq(modelosMototaxis.id, modeloId)).limit(1);
    if (!modelo) throw new NotFoundException("No se encontró el modelo de mototaxi.");
    const [garantia] = await db.insert(garantiasModelosMototaxis).values({ modeloId, activa: d.activa, mesesVigencia, alcance: alcance ?? "", exclusiones })
      .onConflictDoUpdate({ target: garantiasModelosMototaxis.modeloId, set: { activa: d.activa, mesesVigencia, alcance: alcance ?? "", exclusiones, actualizadoEn: new Date() } }).returning();
    return garantia;
  }

  async aplicarGarantiaVenta(detalleId: string) {
    if (!uuidValido(detalleId)) throw new BadRequestException("La línea de venta no es válida.");
    return db.transaction(async (tx) => {
      const [detalle] = await tx.select({ id: ingresosDetalle.id, modeloId: ingresosDetalle.mototaxiModeloId, cantidad: ingresosDetalle.cantidad, tipo: ingresosDetalle.tipo, fecha: ingresos.fecha, estado: ingresos.estado })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresos.id, ingresosDetalle.ingresoId)).where(eq(ingresosDetalle.id, detalleId)).for("update").limit(1);
      if (!detalle || detalle.tipo !== "MOTOTAXI" || !detalle.modeloId || detalle.estado !== "EMITIDO") throw new BadRequestException("La línea debe pertenecer a una venta emitida de mototaxi.");
      const [existente] = await tx.select().from(garantiasVentasMototaxis).where(eq(garantiasVentasMototaxis.ingresoDetalleId, detalleId)).limit(1);
      if (existente) return existente;
      const [politica] = await tx.select().from(garantiasModelosMototaxis).where(and(eq(garantiasModelosMototaxis.modeloId, detalle.modeloId), eq(garantiasModelosMototaxis.activa, true))).limit(1);
      if (!politica) throw new ConflictException("Este modelo no tiene una garantía activa configurada.");
      const terminaEn = sumarMeses(detalle.fecha, politica.mesesVigencia);
      if (fechaActualPeru() > terminaEn) throw new ConflictException("La vigencia de esta garantía ya terminó para la fecha de venta.");
      const cantidad = Number(detalle.cantidad);
      if (!Number.isInteger(cantidad) || cantidad < 1) throw new ConflictException("La cantidad de mototaxis de esta venta no es válida para aplicar una garantía.");
      const [guardada] = await tx.insert(garantiasVentasMototaxis).values({ ingresoDetalleId: detalle.id, garantiaModeloId: politica.id, cantidad, mesesVigencia: politica.mesesVigencia, iniciaEn: detalle.fecha, terminaEn, alcance: politica.alcance, exclusiones: politica.exclusiones }).returning();
      return guardada;
    });
  }

  async listarGarantias() {
    return db.select({
      id: garantiasMototaxis.id, modeloId: modelosMototaxis.id, unidadId: unidadesMototaxis.id, compraDetalleId: garantiasMototaxis.compraDetalleId, vin: unidadesMototaxis.vin,
      codigo: sql<string>`coalesce(${comprasMototaxis.codigo}, ${unidadesMototaxis.codigo})`,
      cantidad: sql<number>`coalesce(${comprasMototaxisDetalle.cantidad}, 1)`,
      marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version,
      proveedor: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      porcentajeProveedor: garantiasMototaxis.porcentajeProveedor, mesesVigencia: garantiasMototaxis.mesesVigencia,
      iniciaEn: garantiasMototaxis.iniciaEn, terminaEn: garantiasMototaxis.terminaEn,
      alcance: garantiasMototaxis.alcance, exclusiones: garantiasMototaxis.exclusiones,
    }).from(garantiasMototaxis)
      .leftJoin(unidadesMototaxis, eq(garantiasMototaxis.unidadId, unidadesMototaxis.id))
      .leftJoin(comprasMototaxisDetalle, eq(garantiasMototaxis.compraDetalleId, comprasMototaxisDetalle.id))
      .leftJoin(comprasMototaxis, eq(comprasMototaxis.id, comprasMototaxisDetalle.compraId))
      .innerJoin(modelosMototaxis, eq(modelosMototaxis.id, sql<string>`coalesce(${comprasMototaxisDetalle.modeloId}, ${unidadesMototaxis.modeloId})`))
      .innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .innerJoin(personas, eq(garantiasMototaxis.proveedorPersonaId, personas.id))
      .orderBy(desc(garantiasMototaxis.terminaEn), asc(garantiasMototaxis.id));
  }

  async crearReclamo(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del reclamo no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.garantiaId)) throw new BadRequestException("Selecciona una garantía válida.");
    const fecha = fechaValida(d.fecha, "La fecha del reclamo");
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha del reclamo no puede ser futura.");
    const descripcionFalla = texto(d.descripcionFalla, "La descripción de la falla", 2000, true)!;
    const costoTotal = importe(d.costoTotal, "El costo total del reclamo");
    if (costoTotal > 999_999_999_999.99) throw new BadRequestException("El costo del reclamo supera el máximo permitido.");
    const [garantia] = await db.select().from(garantiasMototaxis).where(eq(garantiasMototaxis.id, d.garantiaId)).limit(1);
    if (!garantia) throw new NotFoundException("No se encontró la garantía.");
    let ingresoDetalleId: string | null = null;
    if (d.ingresoDetalleId !== undefined) {
      if (!uuidValido(d.ingresoDetalleId)) throw new BadRequestException("Selecciona el artículo vendido válido.");
      const [detalleVenta] = await db.select({ id: ingresosDetalle.id, ingresoId: ingresosDetalle.ingresoId, modeloId: ingresosDetalle.mototaxiModeloId, tipo: ingresosDetalle.tipo, fecha: ingresos.fecha, estado: ingresos.estado })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresos.id, ingresosDetalle.ingresoId))
        .where(eq(ingresosDetalle.id, d.ingresoDetalleId)).limit(1);
      if (!detalleVenta || detalleVenta.tipo !== "MOTOTAXI" || !detalleVenta.modeloId || detalleVenta.estado !== "EMITIDO") throw new BadRequestException("El artículo elegido no corresponde a una venta emitida de mototaxi.");
      const [modeloGarantia] = await db.select({ modeloId: sql<string>`coalesce(${comprasMototaxisDetalle.modeloId}, ${unidadesMototaxis.modeloId})` })
        .from(garantiasMototaxis)
        .leftJoin(comprasMototaxisDetalle, eq(garantiasMototaxis.compraDetalleId, comprasMototaxisDetalle.id))
        .leftJoin(unidadesMototaxis, eq(garantiasMototaxis.unidadId, unidadesMototaxis.id))
        .where(eq(garantiasMototaxis.id, d.garantiaId)).limit(1);
      if (!modeloGarantia || modeloGarantia.modeloId !== detalleVenta.modeloId) throw new BadRequestException("La garantía seleccionada no corresponde al modelo vendido.");
      if (detalleVenta.fecha > fecha) throw new BadRequestException("La fecha de aplicación no puede ser anterior a la venta.");
      ingresoDetalleId = detalleVenta.id;
    }
    if (fecha < garantia.iniciaEn || fecha > garantia.terminaEn) throw new BadRequestException("La fecha del reclamo está fuera de la vigencia de la garantía.");
    const porcentaje = Number(garantia.porcentajeProveedor);
    const totalCentimos = BigInt(Math.round(costoTotal * 100));
    const proveedorCentimos = (totalCentimos * BigInt(porcentaje) + 50n) / 100n;
    const importeProveedor = Number(proveedorCentimos) / 100;
    const importeEmpresa = Number(totalCentimos - proveedorCentimos) / 100;
    const [reclamo] = await db.insert(reclamosGarantiaMototaxis).values({ garantiaId: d.garantiaId, ingresoDetalleId, fecha, descripcionFalla, costoTotal: costoTotal.toFixed(2), porcentajeProveedorAplicado: String(porcentaje), importeProveedor: importeProveedor.toFixed(2), importeEmpresa: importeEmpresa.toFixed(2), estado: "ABIERTO", usuarioId }).returning();
    return reclamo;
  }

  async avanzarReclamo(id: string, valor: unknown) {
    if (!uuidValido(id) || !valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Selecciona un reclamo válido.");
    const datos = valor as Record<string, unknown>;
    const estado = texto(datos.estado, "El nuevo estado", 20, true)!;
    const estadoAnterior = texto(datos.estadoAnterior, "El estado actual", 20, true)!;
    if (!Object.hasOwn(transicionesReclamo, estadoAnterior) || !transicionesReclamo[estadoAnterior].includes(estado)) throw new BadRequestException("Ese cambio de estado no está permitido.");
    const resolucion = texto(datos.resolucion, "La resolución", 2000, estado !== "ENVIADO");
    const [reclamo] = await db.update(reclamosGarantiaMototaxis)
      .set({ estado, ...(resolucion ? { resolucion } : {}) })
      .where(and(eq(reclamosGarantiaMototaxis.id, id), eq(reclamosGarantiaMototaxis.estado, estadoAnterior))).returning();
    if (!reclamo) throw new ConflictException("El reclamo cambió de estado. Actualiza el listado.");
    return reclamo;
  }

  listarReclamos() {
    return db.select({
      id: reclamosGarantiaMototaxis.id, garantiaId: reclamosGarantiaMototaxis.garantiaId, ingresoDetalleId: reclamosGarantiaMototaxis.ingresoDetalleId,
      ventaCodigo: ingresos.codigo, ventaCliente: ingresos.clienteNombre, ventaMototaxi: ingresosDetalle.descripcion,
      fecha: reclamosGarantiaMototaxis.fecha, descripcionFalla: reclamosGarantiaMototaxis.descripcionFalla, costoTotal: reclamosGarantiaMototaxis.costoTotal,
      porcentajeProveedorAplicado: reclamosGarantiaMototaxis.porcentajeProveedorAplicado, importeProveedor: reclamosGarantiaMototaxis.importeProveedor,
      importeEmpresa: reclamosGarantiaMototaxis.importeEmpresa, estado: reclamosGarantiaMototaxis.estado, resolucion: reclamosGarantiaMototaxis.resolucion,
    }).from(reclamosGarantiaMototaxis)
      .leftJoin(ingresosDetalle, eq(reclamosGarantiaMototaxis.ingresoDetalleId, ingresosDetalle.id))
      .leftJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
      .orderBy(desc(reclamosGarantiaMototaxis.fecha), desc(reclamosGarantiaMototaxis.creadoEn));
  }

  private esDuplicado(error: unknown) { return typeof error === "object" && error !== null && "code" in error && error.code === "23505"; }
}
