import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { and, eq } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db, permisos, roles, rolesPermisos, usuariosRoles } from "@magina/database";
import { CLAVE_PERMISO_REQUERIDO, CLAVE_PERMISOS_ALTERNATIVOS } from "./permisos";
import type { UsuarioAutenticado } from "./usuario-actual";

type SolicitudConUsuario = FastifyRequest & { usuario: UsuarioAutenticado };

@Injectable()
export class GuardiaPermiso implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(contexto: ExecutionContext) {
    const codigosAlternativos = this.reflector.getAllAndOverride<string[]>(CLAVE_PERMISOS_ALTERNATIVOS, [contexto.getHandler(), contexto.getClass()]);
    const codigo = this.reflector.getAllAndOverride<string>(CLAVE_PERMISO_REQUERIDO, [contexto.getHandler(), contexto.getClass()]);
    const requeridos = codigosAlternativos?.length ? codigosAlternativos : codigo ? [codigo] : [];
    const solicitud = contexto.switchToHttp().getRequest<SolicitudConUsuario>();
    if (!solicitud.usuario?.id) throw new ForbiddenException("No se pudo comprobar el permiso de esta operación.");
    const asignaciones = await db.select({ codigo: permisos.codigo }).from(usuariosRoles)
      .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
      .innerJoin(rolesPermisos, eq(roles.id, rolesPermisos.rolId))
      .innerJoin(permisos, eq(rolesPermisos.permisoId, permisos.id))
      .where(and(eq(usuariosRoles.usuarioId, solicitud.usuario.id), eq(roles.activo, true)));
    const permisosUsuario = [...new Set(asignaciones.map(({ codigo }) => codigo))];
    solicitud.usuario.permisos = permisosUsuario;
    if (requeridos.length && !requeridos.some((permiso) => permisosUsuario.includes(permiso))) {
      throw new ForbiddenException("Tu usuario no tiene permiso para realizar esta operación.");
    }
    return true;
  }
}
