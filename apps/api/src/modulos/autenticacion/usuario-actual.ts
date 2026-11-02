import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { FastifyRequest } from "fastify";

export interface UsuarioAutenticado {
  id: string;
}

type SolicitudConUsuario = FastifyRequest & { usuario: UsuarioAutenticado };

export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const solicitud = contexto.switchToHttp().getRequest<SolicitudConUsuario>();
    return solicitud.usuario;
  },
);
