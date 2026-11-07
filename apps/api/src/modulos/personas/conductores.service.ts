import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { conductores, db, personas, tiposDocumento, tiposPersona } from "@magina/database";

function texto(valor: unknown, etiqueta: string, maximo: number, requerido = false) {
  if (typeof valor !== "string" || !valor.trim()) {
    if (requerido) throw new BadRequestException(`${etiqueta} es obligatorio.`);
    return null;
  }
  if (valor.trim().length > maximo) throw new BadRequestException(`${etiqueta} supera el máximo permitido.`);
  return valor.trim();
}

@Injectable()
export class ServicioConductores {
  async listar(busqueda = "") {
    const q = busqueda.trim().slice(0, 100);
    const filas = await db.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento,
      nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
      numeroLicencia: conductores.numeroLicencia, telefono: conductores.telefono })
      .from(conductores).innerJoin(personas, eq(conductores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(and(eq(conductores.activo, true), q ? or(ilike(personas.nombres, `%${q}%`), ilike(personas.apellidoPaterno, `%${q}%`), ilike(personas.apellidoMaterno, `%${q}%`), ilike(personas.numeroDocumento, `%${q}%`), ilike(conductores.numeroLicencia, `%${q}%`)) : undefined))
      .orderBy(asc(personas.apellidoPaterno), asc(personas.nombres)).limit(100);
    return filas.map((fila) => ({ ...fila, tipoDocumento: ({ "01": "DNI", "04": "CE", "07": "PASAPORTE" } as Record<string, "DNI" | "CE" | "PASAPORTE">)[fila.tipoDocumento] ?? "DNI" }));
  }

  async listarPaginado(paginaEntrada?: string, porPaginaEntrada?: string, busquedaEntrada?: string) {
    const pagina = Math.max(1, Number.parseInt(paginaEntrada ?? "1", 10) || 1);
    const porPagina = Math.min(50, Math.max(1, Number.parseInt(porPaginaEntrada ?? "12", 10) || 12));
    const q = typeof busquedaEntrada === "string" ? busquedaEntrada.trim().slice(0, 100) : "";
    const filtroBusqueda = q ? or(ilike(personas.nombres, `%${q}%`), ilike(personas.apellidoPaterno, `%${q}%`), ilike(personas.apellidoMaterno, `%${q}%`), ilike(personas.numeroDocumento, `%${q}%`), ilike(conductores.numeroLicencia, `%${q}%`)) : undefined;
    const condicion = and(eq(conductores.activo, true), filtroBusqueda);
    const [{ total }] = await db.select({ total: count() }).from(conductores)
      .innerJoin(personas, eq(conductores.personaId, personas.id)).where(condicion);
    const filas = await db.select({ id: personas.id, tipoDocumento: tiposDocumento.codigo, numeroDocumento: personas.numeroDocumento,
      nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno,
      numeroLicencia: conductores.numeroLicencia, telefono: conductores.telefono })
      .from(conductores).innerJoin(personas, eq(conductores.personaId, personas.id)).innerJoin(tiposDocumento, eq(personas.tipoDocumentoId, tiposDocumento.id))
      .where(condicion).orderBy(asc(personas.apellidoPaterno), asc(personas.nombres))
      .limit(porPagina).offset((pagina - 1) * porPagina);
    const items = filas.map((fila) => ({ ...fila, tipoDocumento: ({ "01": "DNI", "04": "CE", "07": "PASAPORTE" } as Record<string, "DNI" | "CE" | "PASAPORTE">)[fila.tipoDocumento] ?? "DNI" }));
    return { items, pagina, porPagina, total, totalPaginas: Math.max(1, Math.ceil(total / porPagina)) };
  }

  async crear(valor: unknown) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new BadRequestException("Los datos del conductor no son válidos.");
    const datos = valor as Record<string, unknown>;
    const tipoDocumento = texto(datos.tipoDocumento, "El tipo de documento", 12, true)!;
    const codigoDocumento = ({ DNI: "01", CE: "04", PASAPORTE: "07" } as Record<string, string>)[tipoDocumento];
    if (!codigoDocumento) throw new BadRequestException("Selecciona DNI, carné de extranjería o pasaporte.");
    const numeroDocumento = texto(datos.numeroDocumento, "El número de documento", 15, true)!;
    if (tipoDocumento === "DNI" && !/^\d{8}$/.test(numeroDocumento)) throw new BadRequestException("El DNI debe tener 8 dígitos.");
    if (tipoDocumento === "CE" && !/^[A-Za-z0-9-]{6,15}$/.test(numeroDocumento)) throw new BadRequestException("El carné de extranjería debe tener entre 6 y 15 caracteres válidos.");
    if (tipoDocumento === "PASAPORTE" && !/^[A-Za-z0-9-]{5,15}$/.test(numeroDocumento)) throw new BadRequestException("El pasaporte debe tener entre 5 y 15 caracteres válidos.");
    const nombres = texto(datos.nombres, "Los nombres", 120, true)!;
    const apellidoPaterno = texto(datos.apellidoPaterno, "El apellido paterno", 120, true)!;
    const apellidoMaterno = texto(datos.apellidoMaterno, "El apellido materno", 120);
    const numeroLicencia = texto(datos.numeroLicencia, "El número de licencia", 10, true)!.toLocaleUpperCase("es-PE");
    const telefono = texto(datos.telefono, "El teléfono", 30);
    const [tipoDoc] = await db.select({ id: tiposDocumento.id }).from(tiposDocumento).where(and(eq(tiposDocumento.codigo, codigoDocumento), eq(tiposDocumento.activo, true))).limit(1);
    const [tipoPer] = await db.select({ id: tiposPersona.id }).from(tiposPersona).where(and(eq(tiposPersona.codigo, "NATURAL"), eq(tiposPersona.activo, true))).limit(1);
    if (!tipoDoc || !tipoPer) throw new NotFoundException("Falta configurar el tipo de persona o documento requerido.");
    try {
      return await db.transaction(async (tx) => {
        const [personaExistente] = await tx.select({ id: personas.id, nombres: personas.nombres, apellidoPaterno: personas.apellidoPaterno, apellidoMaterno: personas.apellidoMaterno }).from(personas).where(and(eq(personas.tipoDocumentoId, tipoDoc.id), eq(personas.numeroDocumento, numeroDocumento))).limit(1);
        let personaId = personaExistente?.id;
        let nombresGuardados = personaExistente?.nombres ?? nombres;
        let apellidoPaternoGuardado = personaExistente?.apellidoPaterno ?? apellidoPaterno;
        let apellidoMaternoGuardado = personaExistente?.apellidoMaterno ?? apellidoMaterno;
        if (personaId) {
          const [conductorExistente] = await tx.select({ personaId: conductores.personaId }).from(conductores).where(eq(conductores.personaId, personaId)).limit(1);
          if (conductorExistente) throw new ConflictException("Esta persona ya está registrada como conductor.");
        } else {
          const [creada] = await tx.insert(personas).values({ tipoPersonaId: tipoPer.id, tipoDocumentoId: tipoDoc.id, numeroDocumento, nombres, apellidoPaterno, apellidoMaterno }).returning({ id: personas.id });
          personaId = creada.id;
        }
        await tx.insert(conductores).values({ personaId, numeroLicencia, telefono });
        return { id: personaId, tipoDocumento, numeroDocumento, nombres: nombresGuardados, apellidoPaterno: apellidoPaternoGuardado, apellidoMaterno: apellidoMaternoGuardado, numeroLicencia, telefono };
      });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) throw error;
      const codigo = (error as { code?: string })?.code;
      if (codigo === "23505") throw new ConflictException("El documento o la licencia ya está registrado.");
      if (codigo === "23503") throw new NotFoundException("No se encontró la configuración del documento seleccionado.");
      throw error;
    }
  }
}
