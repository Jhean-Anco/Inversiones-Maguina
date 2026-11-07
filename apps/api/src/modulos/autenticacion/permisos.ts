import { SetMetadata } from "@nestjs/common";

export const CLAVE_PERMISO_REQUERIDO = "permiso_requerido";
export const CLAVE_PERMISOS_ALTERNATIVOS = "permisos_alternativos_requeridos";
export const RequierePermiso = (codigo: string) => SetMetadata(CLAVE_PERMISO_REQUERIDO, codigo);
export const RequiereCualquieraPermiso = (...codigos: string[]) => SetMetadata(CLAVE_PERMISOS_ALTERNATIVOS, codigos);
