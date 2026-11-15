import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, ilike, or } from "drizzle-orm";
import { db, personas, tiposDocumento, tiposPersona, transportistas } from "@magina/database";
import { rucPeruValido } from "../../utilidades/ruc-peru";

@Injectable()
export class ServicioTransportistas {
  async listar(busquedaEntrada = "") {
    const busqueda = busquedaEntrada.trim().slice(0, 100);
    const coincidencia = `%${busqueda}%`;
    const filas = await db.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento, razonSocial: personas.razonSocial, nombreComercial: personas.razonSocial, nombre: personas.razonSocial })
      .from(transportistas).innerJoin(personas, eq(transportistas.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(and(eq(transportistas.activo, true), eq(personas.activo, true), busqueda ? or(ilike(personas.razonSocial, coincidencia), ilike(personas.numeroDocumento, coincidencia)) : undefined))
      .orderBy(asc(personas.razonSocial)).limit(100);
    return filas.map((fila) => ({ ...fila, tipoDocumento: "RUC" as const }));
  }

  async crear(valor: unknown) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Completa los datos del transportista.");
    const datos = valor as Record<string, unknown>;
    const numeroDocumento = typeof datos.numeroDocumento === "string" ? datos.numeroDocumento.trim() : "";
    const razonSocial = typeof datos.razonSocial === "string" ? datos.razonSocial.trim() : "";
    if (!/^\d{11}$/.test(numeroDocumento) || !rucPeruValido(numeroDocumento)) throw new BadRequestException("Ingresa un RUC válido de 11 dígitos.");
    if (!razonSocial || razonSocial.length > 180) throw new BadRequestException("Ingresa la razón social del transportista (máximo 180 caracteres).");
    const [tipoDocumento] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, "06"), eq(tiposDocumento.activo, true))).limit(1);
    const [tipoPersona] = await db.select({ id: tiposPersona.id }).from(tiposPersona).where(and(eq(tiposPersona.codigo, "JURIDICA"), eq(tiposPersona.activo, true))).limit(1);
    if (!tipoDocumento || !tipoPersona) throw new NotFoundException("Falta configurar el tipo de persona o documento para el transportista.");
    try {
      return await db.transaction(async (tx) => {
        const [existente] = await tx.select({ id: personas.id, razonSocial: personas.razonSocial, tipoPersonaId: personas.tipoPersonaId }).from(personas)
          .where(and(eq(personas.tipoDocumentoId, tipoDocumento.id), eq(personas.numeroDocumento, numeroDocumento))).limit(1);
        let personaId = existente?.id;
        if (existente && (existente.tipoPersonaId !== tipoPersona.id || !existente.razonSocial)) throw new ConflictException("Este RUC ya está registrado con datos que no corresponden a una persona jurídica.");
        if (!personaId) {
          const [creada] = await tx.insert(personas).values({ tipoPersonaId: tipoPersona.id, tipoDocumentoId: tipoDocumento.id, numeroDocumento, razonSocial }).returning({ id: personas.id });
          personaId = creada.id;
        }
        const [transportistaExistente] = await tx.select({ id: transportistas.personaId }).from(transportistas).where(eq(transportistas.personaId, personaId)).limit(1);
        if (transportistaExistente) throw new ConflictException("Este transportista ya está registrado.");
        await tx.insert(transportistas).values({ personaId });
        return { id: personaId, tipoDocumento: "RUC", numeroDocumento, razonSocial: existente?.razonSocial ?? razonSocial, nombreComercial: existente?.razonSocial ?? razonSocial, nombre: existente?.razonSocial ?? razonSocial };
      });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      if ((error as { code?: string })?.code === "23505") throw new ConflictException("El RUC ya está registrado.");
      throw error;
    }
  }
}
