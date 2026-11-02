import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import * as argon2 from "argon2";
import {
  db,
  permisos,
  personas,
  roles,
  rolesPermisos,
  trabajadores,
  usuarios,
  usuariosRoles,
} from "@magina/database";
import { validarConfiguracionEntorno } from "../../configuracion-entorno";

@Injectable()
export class ServicioAutenticacion {
  constructor(private readonly jwt: JwtService) { }

  async iniciarSesion(usuarioOCorreo: string, contrasena: string, recordar = false) {
    const identificador = usuarioOCorreo.trim().toLocaleLowerCase("es-PE");
    const [registro] = await db
      .select({
        id: usuarios.id,
        contrasenaHash: usuarios.contrasenaHash,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        razonSocial: personas.razonSocial,
      })
      .from(usuarios)
      .innerJoin(trabajadores, eq(usuarios.trabajadorId, trabajadores.personaId))
      .innerJoin(personas, eq(trabajadores.personaId, personas.id))
      .where(and(
        eq(usuarios.activo, true),
        eq(personas.activo, true),
        isNull(trabajadores.fechaCese),
        or(
          eq(sql`lower(${usuarios.nombreUsuario})`, identificador),
          eq(sql`lower(${usuarios.correo})`, identificador),
        ),
      ))
      .limit(1);

    if (!registro || !(await argon2.verify(registro.contrasenaHash, contrasena))) {
      throw new UnauthorizedException("Usuario o contraseña incorrectos.");
    }

    await db.update(usuarios)
      .set({ ultimoAccesoEn: new Date() })
      .where(eq(usuarios.id, registro.id));

    const perfil = await this.obtenerPerfil(registro.id);
    if (!perfil) throw new UnauthorizedException("La cuenta no está disponible.");

    const token = await this.jwt.signAsync(
      { sub: registro.id },
      { expiresIn: recordar ? validarConfiguracionEntorno().segundosSesionRecordada : validarConfiguracionEntorno().segundosSesion },
    );
    return { token, usuario: perfil };
  }

  async obtenerPerfil(idUsuario: string) {
    const [registro] = await db
      .select({
        id: usuarios.id,
        nombres: personas.nombres,
        apellidoPaterno: personas.apellidoPaterno,
        apellidoMaterno: personas.apellidoMaterno,
        razonSocial: personas.razonSocial,
      })
      .from(usuarios)
      .innerJoin(trabajadores, eq(usuarios.trabajadorId, trabajadores.personaId))
      .innerJoin(personas, eq(trabajadores.personaId, personas.id))
      .where(and(
        eq(usuarios.id, idUsuario),
        eq(usuarios.activo, true),
        eq(personas.activo, true),
        isNull(trabajadores.fechaCese),
      ))
      .limit(1);

    if (!registro) return null;

    const asignaciones = await db
      .select({ rol: roles.nombre, codigoPermiso: permisos.codigo })
      .from(usuariosRoles)
      .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
      .leftJoin(rolesPermisos, eq(roles.id, rolesPermisos.rolId))
      .leftJoin(permisos, eq(rolesPermisos.permisoId, permisos.id))
      .where(and(eq(usuariosRoles.usuarioId, idUsuario), eq(roles.activo, true)));

    const nombreCompleto = [
      registro.nombres,
      registro.apellidoPaterno,
      registro.apellidoMaterno,
      registro.razonSocial,
    ].filter(Boolean).join(" ");

    return {
      id: registro.id,
      nombreCompleto,
      roles: [...new Set(asignaciones.map(({ rol }) => rol))],
      permisos: [...new Set(asignaciones.flatMap(({ codigoPermiso }) => codigoPermiso ? [codigoPermiso] : []))],
    };
  }
}
