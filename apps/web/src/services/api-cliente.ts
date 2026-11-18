const API = import.meta.env.VITE_API_URL ?? "";

export function urlApi(ruta: string) { return `${API}${ruta}`; }

export class ErrorApi extends Error {
  constructor(mensaje: string, readonly estado: number) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

const lecturasGetEnCurso = new Map<string, Promise<unknown>>();

async function solicitarJson<T>(ruta: string, opciones: RequestInit): Promise<T> {
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

export function solicitarApi<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const metodo = (opciones.method ?? "GET").toUpperCase();
  if (metodo !== "GET" || opciones.signal || opciones.body) return solicitarJson<T>(ruta, opciones);

  const cabeceras = Array.from(new Headers(opciones.headers).entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([nombre, valor]) => `${nombre}:${valor}`)
    .join("|");
  const credenciales = opciones.credentials ?? "include";
  const clave = `${urlApi(ruta)}|${credenciales}|${opciones.mode ?? ""}|${opciones.cache ?? ""}|${cabeceras}`;
  const existente = lecturasGetEnCurso.get(clave);
  if (existente) return existente as Promise<T>;

  const solicitud = solicitarJson<T>(ruta, opciones);
  lecturasGetEnCurso.set(clave, solicitud);
  const retirar = () => { if (lecturasGetEnCurso.get(clave) === solicitud) lecturasGetEnCurso.delete(clave); };
  void solicitud.then(retirar, retirar);
  return solicitud;
}
