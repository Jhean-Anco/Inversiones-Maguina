import { solicitarApi } from "./api-cliente";
export type PersonaPersonal = { id: string; codigo: string | null; fechaIngreso: string; cargo: string | null; numeroDocumento: string; tipoDocumento: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string | null };
export const servicioPersonal = { listar: () => solicitarApi<PersonaPersonal[]>("/personas/personal") };
