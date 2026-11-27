import { BadRequestException, Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, or, ilike } from "drizzle-orm";
import { cargos, db, personas, tiposDocumento, tiposPersona, trabajadores } from "@magina/database";

@Injectable()
export class ServicioPersonal {
  async listar(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    return db.select({ id: trabajadores.personaId, codigo: trabajadores.codigoTrabajador, fechaIngreso: trabajadores.fechaIngreso,
      cargoId: cargos.id, cargo: cargos.nombre, numeroDocumento: personas.numeroDocumento, tipoDocumento: tiposDocumento.codigo,
      nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno })
      .from(trabajadores).innerJoin(personas, eq(trabajadores.personaId, personas.id))
      .innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .leftJoin(cargos, eq(trabajadores.cargoId, cargos.id))
      .where(and(isNull(trabajadores.fechaCese), q ? or(ilike(personas.nombres, `%${q}%`), ilike(personas.apellidoPaterno, `%${q}%`), ilike(personas.numeroDocumento, `%${q}%`), ilike(trabajadores.codigoTrabajador, `%${q}%`)) : undefined))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres)).limit(200);
  }

  async registrar(valor: unknown) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Completa los datos del personal.");
    const d = valor as Record<string, unknown>;
    const tipo = typeof d.tipoDocumento === "string" ? d.tipoDocumento : "";
    const doc = typeof d.numeroDocumento === "string" ? d.numeroDocumento.trim() : "";
    const nombres = typeof d.nombres === "string" ? d.nombres.trim() : "";
    const paterno = typeof d.apellidoPaterno === "string" ? d.apellidoPaterno.trim() : "";
    const fechaIngreso = typeof d.fechaIngreso === "string" ? d.fechaIngreso : "";
    if (!(tipo === "DNI" && /^\d{8}$/.test(doc)) || !nombres || nombres.length > 120 || !paterno || paterno.length > 120 || !/^\d{4}-\d{2}-\d{2}$/.test(fechaIngreso)) throw new BadRequestException("Ingresa DNI, nombres, apellido paterno y fecha de ingreso válidos.");
    const [tipoDoc] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(eq(tiposDocumento.codigo, "01")).limit(1);
    const [tipoPer] = await db.select({ id: tiposPersona.id }).from(tiposPersona).where(eq(tiposPersona.codigo, "NATURAL")).limit(1);
    if (!tipoDoc || !tipoPer) throw new BadRequestException("Falta configurar el tipo de persona o documento.");
    const id = crypto.randomUUID();
    await db.transaction(async (tx) => {
      const [existente] = await tx.select({ id: personas.id, tipoPersonaId: personas.tipoPersonaId }).from(personas).where(and(eq(personas.tipoDocumentoId, tipoDoc.id), eq(personas.numeroDocumento, doc))).limit(1);
      const personaId = existente?.id ?? id;
      if (existente && existente.tipoPersonaId !== tipoPer.id) throw new BadRequestException("El DNI pertenece a una persona que no está registrada como natural.");
      if (!existente) await tx.insert(personas).values({ id, tipoPersonaId: tipoPer.id, tipoDocumentoId: tipoDoc.id, numeroDocumento: doc, nombres, apellidoPaterno: paterno,
        apellidoMaterno: typeof d.apellidoMaterno === "string" && d.apellidoMaterno.trim() ? d.apellidoMaterno.trim().slice(0, 120) : null });
      const [yaEsPersonal] = await tx.select({ id: trabajadores.personaId }).from(trabajadores).where(eq(trabajadores.personaId, personaId)).limit(1);
      if (yaEsPersonal) throw new BadRequestException("Esta persona ya está registrada en el personal.");
      await tx.insert(trabajadores).values({ personaId, codigoTrabajador: typeof d.codigo === "string" && d.codigo.trim() ? d.codigo.trim().slice(0, 30) : null, fechaIngreso,
        cargoId: typeof d.cargoId === "string" && d.cargoId ? d.cargoId : null });
    });
    return { id, nombres, apellidoPaterno: paterno, numeroDocumento: doc, fechaIngreso };
  }

  async darDeBaja(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new BadRequestException("Selecciona una persona del personal válida.");
    const fechaCese = new Date().toISOString().slice(0, 10);
    const [resultado] = await db.update(trabajadores).set({ fechaCese }).where(and(eq(trabajadores.personaId, id), isNull(trabajadores.fechaCese))).returning({ id: trabajadores.personaId });
    return { id: resultado?.id ?? id, fechaCese };
  }
}
