import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorApi, solicitarApi, urlApi } from "./api-cliente";
import { respuestaFalsa, simularFetch, ultimaSolicitud } from "../test/solicitudes";

function diferido<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (motivo: unknown) => void;
  const promesa = new Promise<T>((res, rej) => { resolver = res; rechazar = rej; });
  return { promesa, resolver, rechazar };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("urlApi", () => {
  it("usa el mismo origen cuando VITE_API_URL no está definida", () => {
    expect(urlApi("/ingresos")).toBe("/ingresos");
  });

  it("antepone VITE_API_URL cuando está configurada", async () => {
    vi.stubEnv("VITE_API_URL", "https://api.magina.test");
    vi.resetModules();
    const modulo = await import("./api-cliente");
    expect(modulo.urlApi("/ingresos")).toBe("https://api.magina.test/ingresos");
  });
});

describe("ErrorApi", () => {
  it("conserva el mensaje, el estado HTTP y el nombre", () => {
    const error = new ErrorApi("Sin permiso", 403);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Sin permiso");
    expect(error.estado).toBe(403);
    expect(error.name).toBe("ErrorApi");
  });
});

describe("solicitarApi", () => {
  it("envía cookies, respeta las opciones y devuelve el JSON", async () => {
    const fetchSimulado = simularFetch({ id: "1" });
    const resultado = await solicitarApi<{ id: string }>("/recurso", { method: "POST", headers: { "X-Prueba": "1" }, body: "{}" });
    expect(resultado).toEqual({ id: "1" });
    const { url, init } = ultimaSolicitud(fetchSimulado);
    expect(url).toBe("/recurso");
    expect(init).toMatchObject({ credentials: "include", method: "POST", headers: { "X-Prueba": "1" }, body: "{}" });
  });

  it("permite sobrescribir las credenciales", async () => {
    const fetchSimulado = simularFetch({});
    await solicitarApi("/publico", { credentials: "omit" });
    expect(ultimaSolicitud(fetchSimulado).init.credentials).toBe("omit");
  });

  it("traduce un fallo de red en un ErrorApi con estado 0", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await solicitarApi("/caido").catch((problema: unknown) => problema);
    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ estado: 0, message: "No se pudo conectar con la API. Verifica que el servidor esté activo." });
  });

  it("usa el mensaje del servidor cuando la respuesta no es exitosa", async () => {
    simularFetch({ message: "Stock insuficiente" }, 409);
    await expect(solicitarApi("/ventas", { method: "POST" })).rejects.toMatchObject({ name: "ErrorApi", estado: 409, message: "Stock insuficiente" });
  });

  it("usa un mensaje genérico cuando el servidor no envía uno", async () => {
    simularFetch({}, 500);
    await expect(solicitarApi("/ventas", { method: "POST" })).rejects.toMatchObject({ estado: 500, message: "La solicitud falló (500)." });
  });

  it("tolera respuestas sin JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, status: 204, json: () => Promise.reject(new SyntaxError("vacío")) } as unknown as Response);
    await expect(solicitarApi("/sin-contenido", { method: "DELETE" })).resolves.toEqual({});
  });

  it("tolera errores sin JSON con el mensaje genérico", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new SyntaxError("html")) } as unknown as Response);
    await expect(solicitarApi("/proxy", { method: "POST" })).rejects.toMatchObject({ estado: 502, message: "La solicitud falló (502)." });
  });

  describe("lecturas GET simultáneas", () => {
    it("comparte una sola solicitud mientras está en curso y la libera al terminar", async () => {
      const pendiente = diferido<Response>();
      const fetchSimulado = vi.spyOn(globalThis, "fetch").mockReturnValue(pendiente.promesa);
      const primera = solicitarApi("/catalogos");
      const segunda = solicitarApi("/catalogos", { method: "get" });
      expect(segunda).toBe(primera);
      expect(fetchSimulado).toHaveBeenCalledTimes(1);
      pendiente.resolver(respuestaFalsa({ items: [] }));
      await expect(primera).resolves.toEqual({ items: [] });

      fetchSimulado.mockResolvedValue(respuestaFalsa({ items: [1] }));
      await expect(solicitarApi("/catalogos")).resolves.toEqual({ items: [1] });
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });

    it("normaliza el orden de las cabeceras al construir la clave", async () => {
      const pendiente = diferido<Response>();
      const fetchSimulado = vi.spyOn(globalThis, "fetch").mockReturnValue(pendiente.promesa);
      const primera = solicitarApi("/x", { headers: { "X-B": "2", "X-A": "1" } });
      const segunda = solicitarApi("/x", { headers: { "X-A": "1", "X-B": "2" } });
      const distinta = solicitarApi("/x", { headers: { "X-A": "otro" } });
      expect(segunda).toBe(primera);
      expect(distinta).not.toBe(primera);
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
      pendiente.resolver(respuestaFalsa({}));
      await Promise.all([primera, distinta]);
    });

    it("no comparte solicitudes con credenciales, modo o caché distintos", async () => {
      const pendiente = diferido<Response>();
      const fetchSimulado = vi.spyOn(globalThis, "fetch").mockReturnValue(pendiente.promesa);
      const solicitudes = [
        solicitarApi("/y"),
        solicitarApi("/y", { credentials: "same-origin" }),
        solicitarApi("/y", { mode: "cors" }),
        solicitarApi("/y", { cache: "no-store" }),
      ];
      expect(new Set(solicitudes).size).toBe(4);
      expect(fetchSimulado).toHaveBeenCalledTimes(4);
      pendiente.resolver(respuestaFalsa({}));
      await Promise.all(solicitudes);
    });

    it("no comparte escrituras ni lecturas cancelables", async () => {
      const pendiente = diferido<Response>();
      const fetchSimulado = vi.spyOn(globalThis, "fetch").mockReturnValue(pendiente.promesa);
      const controlador = new AbortController();
      const solicitudes = [
        solicitarApi("/z", { method: "POST" }),
        solicitarApi("/z", { method: "POST" }),
        solicitarApi("/z", { signal: controlador.signal }),
        solicitarApi("/z", { signal: controlador.signal }),
      ];
      expect(fetchSimulado).toHaveBeenCalledTimes(4);
      expect(ultimaSolicitud(fetchSimulado).init.signal).toBe(controlador.signal);
      pendiente.resolver(respuestaFalsa({}));
      await Promise.all(solicitudes);
    });

    it("libera la clave cuando la lectura falla para permitir reintentos", async () => {
      const fetchSimulado = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(respuestaFalsa({ message: "caído" }, 503));
      await expect(solicitarApi("/reintento")).rejects.toMatchObject({ estado: 503 });
      fetchSimulado.mockResolvedValueOnce(respuestaFalsa({ listo: true }));
      await expect(solicitarApi("/reintento")).resolves.toEqual({ listo: true });
      expect(fetchSimulado).toHaveBeenCalledTimes(2);
    });
  });
});
