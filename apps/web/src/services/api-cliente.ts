const API = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:3000" : "");

export function urlApi(ruta: string) { return `${API}${ruta}`; }

export class ErrorApi extends Error {
  constructor(mensaje: string, readonly estado: number) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

export async function solicitarApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(urlApi(ruta), { credentials: "include", ...opciones });
  } catch {
    throw new ErrorApi("No se pudo conectar con la API. Verifica que el servidor esté activo.", 0);
  }
  const contenido = await respuesta.json().catch(() => ({})) as { message?: string };
  if (!respuesta.ok) throw new ErrorApi(contenido.message ?? `La solicitud falló (${respuesta.status}).`, respuesta.status);
  return contenido as T;
}

export function srcImagen(ruta: string | null): string {
  if (!ruta) return "";
  if (ruta.startsWith("/catalogo/")) return ruta;
  return ruta.startsWith("/") ? `${API}${ruta}` : ruta;
}
