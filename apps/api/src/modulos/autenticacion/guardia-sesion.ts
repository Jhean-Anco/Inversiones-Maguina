import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, isNull } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db, personas, trabajadores, usuarios } from "@magina/database";
import type { UsuarioAutenticado } from "./usuario-actual";

type SolicitudConUsuario = FastifyRequest & { usuario: UsuarioAutenticado };

@Injectable()
export class GuardiaSesion implements CanActivate {
  constructor(private readonly jwt: JwtService) { }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudConUsuario>();
    const token = solicitud.cookies?.magina_sesion;
    if (!token) throw new UnauthorizedException("Inicia sesión para continuar.");

    let carga: { sub: string };
    try {
      carga = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException("La sesión venció. Inicia sesión nuevamente.");
    }

    const [usuarioActivo] = await db.select({ id: usuarios.id })
      .from(usuarios)
      .innerJoin(trabajadores, eq(usuarios.trabajadorId, trabajadores.personaId))
      .innerJoin(personas, eq(trabajadores.personaId, personas.id))
      .where(and(
        eq(usuarios.id, carga.sub),
        eq(usuarios.activo, true),
        eq(personas.activo, true),
        isNull(trabajadores.fechaCese),
      ))
      .limit(1);
    if (!usuarioActivo) throw new UnauthorizedException("La cuenta ya no está disponible.");

    solicitud.usuario = { id: carga.sub };
    return true;
  }
}
