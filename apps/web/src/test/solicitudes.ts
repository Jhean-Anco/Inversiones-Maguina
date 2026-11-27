import { expect, it, vi } from "vitest";

/** Respuesta mínima compatible con lo que consume `api-cliente`. */
export function respuestaFalsa(cuerpo: unknown = {}, estado = 200) {
  return {
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: async () => cuerpo,
  } as unknown as Response;
}

export function simularFetch(cuerpo: unknown = {}, estado = 200) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => respuestaFalsa(cuerpo, estado));
}

export function ultimaSolicitud(fetchSimulado: { mock: { calls: unknown[][] } }) {
  const llamada = fetchSimulado.mock.calls.at(-1);
  if (!llamada) throw new Error("No se realizó ninguna solicitud.");
  const [url, init = {}] = llamada as [string, RequestInit | undefined];
  return { url: String(url), init, cuerpo: init.body ? JSON.parse(String(init.body)) as unknown : undefined };
}

export type CasoSolicitud = {
  nombre: string;
  llamar: () => Promise<unknown>;
  url: string;
  metodo?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  cuerpo?: unknown;
  respuesta?: unknown;
  esperado?: unknown;
};

/**
 * Verifica para cada caso la URL, el método, las credenciales y el cuerpo JSON enviados,
 * y que el servicio devuelva la respuesta de la API.
 */
export function probarSolicitudes(casos: CasoSolicitud[]) {
  it.each(casos)("$nombre", async (caso) => {
    const { llamar, url, metodo = "GET", cuerpo, respuesta = { ok: true } } = caso;
    const fetchSimulado = simularFetch(respuesta);
    const resultado = await llamar();
    expect(fetchSimulado).toHaveBeenCalledTimes(1);
    const solicitud = ultimaSolicitud(fetchSimulado);
    expect(solicitud.url).toBe(url);
    expect((solicitud.init.method ?? "GET").toUpperCase()).toBe(metodo);
    expect(solicitud.init.credentials).toBe("include");
    if (cuerpo === undefined) {
      expect(solicitud.cuerpo).toBeUndefined();
    } else {
      expect(new Headers(solicitud.init.headers).get("Content-Type")).toBe("application/json");
      expect(solicitud.cuerpo).toEqual(cuerpo);
    }
    expect(resultado).toEqual("esperado" in caso ? caso.esperado : respuesta);
  });
}
