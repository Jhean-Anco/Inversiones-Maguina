import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { FastifyRequest } from "fastify";
import type { UsuarioAutenticado } from "./usuario-actual";

type SolicitudConUsuario = FastifyRequest & { usuario: UsuarioAutenticado };

@Injectable()
export class GuardiaSesion implements CanActivate {
  constructor(private readonly jwt: JwtService) { }

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudConUsuario>();
    const token = solicitud.cookies?.magina_sesion;
    if (!token) throw new UnauthorizedException("Inicia sesión para continuar.");

    try {
      const carga = await this.jwt.verifyAsync<{ sub: string }>(token);
      solicitud.usuario = { id: carga.sub };
      return true;
    } catch {
      throw new UnauthorizedException("La sesión venció. Inicia sesión nuevamente.");
    }
  }
}
