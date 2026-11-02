import { SetMetadata } from "@nestjs/common";

export const CLAVE_PERMISO_REQUERIDO = "permiso_requerido";
export const RequierePermiso = (codigo: string) => SetMetadata(CLAVE_PERMISO_REQUERIDO, codigo);
