const API = import.meta.env.VITE_API_URL ?? "";

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

export function subirApiConProgreso<T>(ruta: string, datos: FormData, alProgresar?: (porcentaje: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const solicitud = new XMLHttpRequest();
    solicitud.open("POST", urlApi(ruta));
    solicitud.withCredentials = true;
    solicitud.upload.addEventListener("progress", (evento) => {
      if (evento.lengthComputable) alProgresar?.(Math.round((evento.loaded / evento.total) * 100));
    });
    solicitud.addEventListener("error", () => reject(new ErrorApi("No se pudo conectar con la API. Verifica que el servidor esté activo.", 0)));
    solicitud.addEventListener("load", () => {
      const contenido = (() => { try { return JSON.parse(solicitud.responseText) as { message?: string }; } catch { return {}; } })();
      if (solicitud.status < 200 || solicitud.status >= 300) { reject(new ErrorApi(contenido.message ?? `La solicitud falló (${solicitud.status}).`, solicitud.status)); return; }
      resolve(contenido as T);
    });
    solicitud.send(datos);
  });
}

export function srcImagen(ruta: string | null): string {
  if (!ruta) return "";
  if (ruta.startsWith("/catalogo/")) return ruta;
  return ruta.startsWith("/") ? `${API}${ruta}` : ruta;
}
