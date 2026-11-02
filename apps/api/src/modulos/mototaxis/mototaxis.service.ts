import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, comprasMototaxis, comprasMototaxisDetalle, garantiasMototaxis, marcasMototaxis, modelosMototaxis, movimientosMototaxis, pagosComprasMototaxis, personas, proveedores, reclamosGarantiaMototaxis, tiposDocumento, tiposPersona, unidadesMototaxis } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";

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

@Injectable()
export class ServicioMototaxis {
  listarMarcas() { return db.select().from(marcasMototaxis).orderBy(asc(marcasMototaxis.nombre)); }

  async crearMarca(valor: unknown) {
    const datos = valor as Record<string, unknown>;
    const nombre = texto(datos?.nombre, "El nombre de marca", 100, true)!;
    try { const [marca] = await db.insert(marcasMototaxis).values({ nombre }).returning(); return marca; }
    catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Ya existe esa marca de mototaxi."); throw error; }
  }

  listarModelos(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    return db.select({ id: modelosMototaxis.id, codigo: modelosMototaxis.codigo, marcaId: marcasMototaxis.id, marca: marcasMototaxis.nombre, nombre: modelosMototaxis.nombre,
      version: modelosMototaxis.version, categoriaVehicular: modelosMototaxis.categoriaVehicular, fabricante: modelosMototaxis.fabricante, paisFabricacion: modelosMototaxis.paisFabricacion,
      marcaMotor: modelosMototaxis.marcaMotor, modeloMotor: modelosMototaxis.modeloMotor, cilindradaCc: modelosMototaxis.cilindradaCc, combustible: modelosMototaxis.combustible,
      transmision: modelosMototaxis.transmision, carroceria: modelosMototaxis.carroceria, capacidadAsientos: modelosMototaxis.capacidadAsientos,
      capacidadCargaKg: modelosMototaxis.capacidadCargaKg, especificacionesAdicionales: modelosMototaxis.especificacionesAdicionales, activo: modelosMototaxis.activo })
      .from(modelosMototaxis).innerJoin(marcasMototaxis, eq(modelosMototaxis.marcaId, marcasMototaxis.id))
      .where(q ? and(eq(modelosMototaxis.activo, true), or(ilike(modelosMototaxis.nombre, `%${q}%`), ilike(modelosMototaxis.codigo, `%${q}%`), ilike(marcasMototaxis.nombre, `%${q}%`))) : eq(modelosMototaxis.activo, true))
      .orderBy(asc(marcasMototaxis.nombre), asc(modelosMototaxis.nombre));
  }

  async crearModelo(valor: unknown) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("La ficha del modelo no es válida.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.marcaId)) throw new BadRequestException("Selecciona una marca válida.");
    const nombre = texto(d.nombre, "El modelo", 120, true)!;
    const categoriaVehicular = texto(d.categoriaVehicular ?? "L5", "La categoría vehicular", 10, true)!;
    if (!["L1", "L2", "L3", "L4", "L5"].includes(categoriaVehicular)) throw new BadRequestException("Selecciona una categoría vehicular válida.");
    const cilindradaCc = d.cilindradaCc === "" || d.cilindradaCc == null ? null : Number(d.cilindradaCc);
    const capacidadAsientos = d.capacidadAsientos === "" || d.capacidadAsientos == null ? null : Number(d.capacidadAsientos);
    const capacidadCargaKg = d.capacidadCargaKg === "" || d.capacidadCargaKg == null ? null : Number(d.capacidadCargaKg);
    if (cilindradaCc !== null && (!Number.isInteger(cilindradaCc) || cilindradaCc <= 0)) throw new BadRequestException("La cilindrada debe ser un entero positivo.");
    if (capacidadAsientos !== null && (!Number.isInteger(capacidadAsientos) || capacidadAsientos <= 0)) throw new BadRequestException("La capacidad de asientos debe ser un entero positivo.");
    if (capacidadCargaKg !== null && (!Number.isFinite(capacidadCargaKg) || capacidadCargaKg <= 0)) throw new BadRequestException("La capacidad de carga debe ser positiva.");
    const codigo = `MOT-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
    try {
      const [modelo] = await db.insert(modelosMototaxis).values({ codigo, marcaId: d.marcaId, nombre, version: texto(d.version, "La versión", 80), categoriaVehicular,
        fabricante: texto(d.fabricante, "El fabricante", 160), paisFabricacion: texto(d.paisFabricacion, "El país de fabricación", 100), marcaMotor: texto(d.marcaMotor, "La marca del motor", 100),
        modeloMotor: texto(d.modeloMotor, "El modelo del motor", 100), cilindradaCc, combustible: texto(d.combustible, "El combustible", 40), transmision: texto(d.transmision, "La transmisión", 60),
        carroceria: texto(d.carroceria, "La carrocería", 80), capacidadAsientos, capacidadCargaKg: capacidadCargaKg === null ? null : String(capacidadCargaKg),
        especificacionesAdicionales: texto(d.especificacionesAdicionales, "Las especificaciones adicionales", 2000) }).returning();
      return modelo;
    } catch (error) { if (this.esDuplicado(error)) throw new ConflictException("Ya existe este modelo y versión para la marca seleccionada."); throw error; }
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
    const estados = ["DISPONIBLE", "RESERVADA", "VENDIDA", "GARANTIA", "USO_INTERNO", "BAJA"];
    if (filtros.estado && filtros.estado !== "TODOS" && !estados.includes(filtros.estado)) throw new BadRequestException("El estado de mototaxi no es válido.");
    const condicion = and(filtros.estado && filtros.estado !== "TODOS" ? eq(unidadesMototaxis.estado, filtros.estado) : undefined,
      patron ? or(ilike(unidadesMototaxis.codigo, patron), ilike(unidadesMototaxis.vin, patron), ilike(unidadesMototaxis.numeroMotor, patron), ilike(unidadesMototaxis.placa, patron), ilike(modelosMototaxis.nombre, patron), ilike(marcasMototaxis.nombre, patron)) : undefined);
    const [items, [total]] = await Promise.all([
      db.select({ id: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, modeloId: modelosMototaxis.id, marca: marcasMototaxis.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version,
        vin: unidadesMototaxis.vin, numeroMotor: unidadesMototaxis.numeroMotor, numeroChasis: unidadesMototaxis.numeroChasis, anioModelo: unidadesMototaxis.anioModelo, color: unidadesMototaxis.color,
        placa: unidadesMototaxis.placa, estado: unidadesMototaxis.estado, costoAdquisicion: unidadesMototaxis.costoAdquisicion, compraDetalleId: unidadesMototaxis.compraDetalleId })
        .from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasMototaxis, eq(modelosMototaxis.marcaId, marcasMototaxis.id))
        .where(condicion).orderBy(desc(unidadesMototaxis.creadoEn)).limit(porPagina).offset((pagina - 1) * porPagina),
      db.select({ total: count() }).from(unidadesMototaxis).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id)).innerJoin(marcasMototaxis, eq(modelosMototaxis.marcaId, marcasMototaxis.id)).where(condicion),
    ]);
    const n = Number(total?.total ?? 0);
    return { items, total: n, pagina, porPagina, totalPaginas: Math.max(1, Math.ceil(n / porPagina)) };
  }

  async crearCompra(valor: unknown, usuarioId: string) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos de compra no son válidos.");
    const d = valor as Record<string, unknown>;
    if (!uuidValido(d.proveedorPersonaId)) throw new BadRequestException("Selecciona un proveedor del directorio.");
    const fecha = fechaValida(d.fecha, "La fecha de compra");
    if (fecha > fechaActualPeru()) throw new BadRequestException("La fecha de compra no puede ser posterior a hoy.");
    const documentoTipo = texto(d.documentoTipo, "El tipo de documento", 20, true)!;
    if (!["FACTURA", "BOLETA", "NOTA", "OTRO"].includes(documentoTipo)) throw new BadRequestException("Selecciona el tipo de documento de compra.");
    if (!Array.isArray(d.unidades) || d.unidades.length < 1 || d.unidades.length > 30) throw new BadRequestException("Registra entre 1 y 30 unidades por compra.");
    const inicial = importe(d.importePagoInicial ?? 0, "El pago inicial");
    const medioPago = texto(d.medioPago ?? "EFECTIVO", "El medio de pago", 30, true)!;
    if (!(mediosPago as readonly string[]).includes(medioPago)) throw new BadRequestException("Selecciona un medio de pago válido.");
    const unidades = d.unidades.map((entrada, i) => {
      if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException(`La unidad ${i + 1} no es válida.`);
      const u = entrada as Record<string, unknown>;
      if (!uuidValido(u.modeloId)) throw new BadRequestException(`Selecciona el modelo de la unidad ${i + 1}.`);
      const costo = importe(u.costoAdquisicion, `El costo de la unidad ${i + 1}`, 0.01);
      const porcentaje = Number(u.porcentajeGarantia ?? 70);
      const meses = Number(u.mesesGarantia ?? 12);
      if (![70, 80].includes(porcentaje)) throw new BadRequestException("La cobertura de garantía debe ser 70% u 80%.");
      if (!Number.isInteger(meses) || meses < 1 || meses > 120) throw new BadRequestException("El plazo de garantía debe estar entre 1 y 120 meses.");
      return { modeloId: u.modeloId as string, costo, porcentaje, meses, vin: texto(u.vin, "El VIN", 40, true), motor: texto(u.numeroMotor, "El número de motor", 100, true), chasis: texto(u.numeroChasis, "El número de chasis", 100), anio: u.anioModelo == null || u.anioModelo === "" ? null : Number(u.anioModelo), color: texto(u.color, "El color", 60) };
    });
    const total = redondear(unidades.reduce((s, u) => s + u.costo, 0));
    if (inicial > total) throw new BadRequestException("El pago inicial supera el total de compra.");
    const codigo = `CM-${fecha.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return db.transaction(async (tx) => {
      const proveedorId = d.proveedorPersonaId as string;
      const [proveedor] = await tx.select({ id: proveedores.personaId }).from(proveedores).where(and(eq(proveedores.personaId, proveedorId), eq(proveedores.activo, true))).limit(1);
      if (!proveedor) throw new NotFoundException("El proveedor no existe o está inactivo.");
      const modelos = await tx.select({ id: modelosMototaxis.id }).from(modelosMototaxis).where(and(eq(modelosMototaxis.activo, true), inArray(modelosMototaxis.id, [...new Set(unidades.map((u) => u.modeloId))])));
      if (new Set(modelos.map((m) => m.id)).size !== new Set(unidades.map((u) => u.modeloId)).size) throw new BadRequestException("Cada unidad debe pertenecer a un modelo activo del catálogo de mototaxis.");
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
      if (inicial > 0) await tx.insert(pagosComprasMototaxis).values({ compraId: compra.id, fechaPago: fecha, importePagado: inicial.toFixed(2), medioPago, claveIdempotencia: uuidValido(d.claveIdempotencia) ? d.claveIdempotencia : randomUUID(), usuarioId });
      return { id: compra.id, codigo, fecha, total: compra.total, unidades: unidades.length, importePagado: inicial.toFixed(2), saldoPendiente: (total - inicial).toFixed(2) };
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
      medioPago: pagosComprasMototaxis.medioPago, creadoEn: pagosComprasMototaxis.creadoEn })
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
    if (!uuidValido(d.claveIdempotencia)) throw new BadRequestException("La clave de idempotencia del pago no es válida.");
    return db.transaction(async (tx) => {
      const [existente] = await tx.select().from(pagosComprasMototaxis).where(eq(pagosComprasMototaxis.claveIdempotencia, d.claveIdempotencia as string)).limit(1);
      if (existente) {
        if (existente.compraId !== compraId || existente.fechaPago !== fechaPago || Number(existente.importePagado) !== importePagado || existente.medioPago !== medioPago) throw new ConflictException("La clave de pago ya se utilizó para otra operación.");
        return existente;
      }
      const [compra] = await tx.select().from(comprasMototaxis).where(eq(comprasMototaxis.id, compraId)).for("update").limit(1);
      if (!compra) throw new NotFoundException("No se encontró la compra de mototaxi.");
      const [resumen] = await tx.select({ pagado: sql<string>`coalesce(sum(${pagosComprasMototaxis.importePagado}),0)::numeric(14,2)` })
        .from(pagosComprasMototaxis).where(eq(pagosComprasMototaxis.compraId, compraId));
      const saldo = redondear(Number(compra.total) - Number(resumen?.pagado ?? 0));
      if (importePagado > saldo) throw new BadRequestException(`El pago supera el saldo pendiente de S/ ${saldo.toFixed(2)}.`);
      const [pago] = await tx.insert(pagosComprasMototaxis).values({ compraId, fechaPago, importePagado: importePagado.toFixed(2), medioPago,
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
      const estado = d.estado as typeof estados[number];
      const [actualizada] = await tx.update(unidadesMototaxis).set({ estado }).where(eq(unidadesMototaxis.id, id)).returning();
      await tx.insert(movimientosMototaxis).values({ unidadId: id, tipo: "AJUSTE", estadoAnterior: unidad.estado, estadoNuevo: estado, motivo, observacion: texto(d.observacion, "La observación", 2000), usuarioId });
      return actualizada;
    });
  }

  async listarMovimientos(unidadId: string) {
    if (!uuidValido(unidadId)) throw new BadRequestException("La unidad no es válida.");
    return db.select().from(movimientosMototaxis).where(eq(movimientosMototaxis.unidadId, unidadId)).orderBy(desc(movimientosMototaxis.creadoEn));
  }

  async listarGarantias() {
    return db.select({ id: garantiasMototaxis.id, unidadId: unidadesMototaxis.id, codigo: unidadesMototaxis.codigo, vin: unidadesMototaxis.vin,
      marca: marcasMototaxis.nombre, modelo: modelosMototaxis.nombre, proveedor: sql<string>`coalesce(${personas.razonSocial}, concat_ws(' ', ${personas.nombres}, ${personas.apellidoPaterno}, ${personas.apellidoMaterno}))`,
      porcentajeProveedor: garantiasMototaxis.porcentajeProveedor, mesesVigencia: garantiasMototaxis.mesesVigencia, iniciaEn: garantiasMototaxis.iniciaEn, terminaEn: garantiasMototaxis.terminaEn,
      alcance: garantiasMototaxis.alcance, exclusiones: garantiasMototaxis.exclusiones })
      .from(garantiasMototaxis).innerJoin(unidadesMototaxis, eq(garantiasMototaxis.unidadId, unidadesMototaxis.id)).innerJoin(modelosMototaxis, eq(unidadesMototaxis.modeloId, modelosMototaxis.id))
      .innerJoin(marcasMototaxis, eq(modelosMototaxis.marcaId, marcasMototaxis.id)).innerJoin(personas, eq(garantiasMototaxis.proveedorPersonaId, personas.id)).orderBy(asc(garantiasMototaxis.terminaEn));
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
