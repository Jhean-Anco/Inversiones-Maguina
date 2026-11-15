import { solicitarApi } from "./api-cliente";

export type TransportistaRegistrado = { id: string; tipoDocumento: "RUC"; numeroDocumento: string; razonSocial: string; nombreComercial: string; nombre: string };

export const servicioTransportistas = {
  listar: (busqueda = "") => solicitarApi<TransportistaRegistrado[]>(`/personas/transportistas?busqueda=${encodeURIComponent(busqueda)}`),
  crear: (datos: { numeroDocumento: string; razonSocial: string }) => solicitarApi<TransportistaRegistrado>("/personas/transportistas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) }),
};
