import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { documentoEjemplo } from "../test/documento-ejemplo";
import { guardarDirecto, leerDirecto, leerFormato } from "./memoria-impresion";

const navegador = vi.hoisted(() => ({ imprimirHtml: vi.fn(async () => undefined), imprimirPdf: vi.fn(async () => "impreso" as "impreso" | "abierto") }));
const bt = vi.hoisted(() => ({ disponible: vi.fn(() => false), elegir: vi.fn(), recuperar: vi.fn(), enviar: vi.fn(async () => undefined) }));
const serial = vi.hoisted(() => ({ disponible: vi.fn(() => false), autorizado: vi.fn(), elegir: vi.fn(), enviar: vi.fn(async () => undefined) }));
const api = vi.hoisted(() => ({ solicitarApi: vi.fn() }));
vi.mock("./imprimir-navegador", () => navegador);
vi.mock("./transporte-bluetooth", () => ({ bluetoothDisponible: bt.disponible, elegirImpresoraBluetooth: bt.elegir, recuperarImpresoraBluetooth: bt.recuperar, enviarBluetooth: bt.enviar }));
vi.mock("./transporte-serial", () => ({ serialDisponible: serial.disponible, puertoAutorizado: serial.autorizado, elegirPuertoSerial: serial.elegir, enviarSerial: serial.enviar }));
vi.mock("../services/api-cliente", () => ({ solicitarApi: api.solicitarApi, urlApi: (r: string) => `http://api${r}` }));

const { documentoDeIngreso, ejecutarImpresion, imprimirDocumento, obtenerDocumentoImprimible, prepararImpresion, resolverDestinoTicket } = await import("./servicio-impresion");
const { avisarResultado, mensajeErrorImpresion, useImpresion } = await import("./use-impresion");
const { tamanoInicial, useImprimirAlEmitir } = await import("./use-imprimir-al-emitir");

const doc = { ...documentoEjemplo(), electronico: true, enlacePdf: "/archivos/1/contenido", advertencias: ["ojo"] };
const avisos = () => ({ exito: vi.fn(), error: vi.fn(), advertencia: vi.fn() });
const cancelar = () => new DOMException("cerrado", "NotFoundError");

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  bt.disponible.mockReturnValue(false);
  serial.disponible.mockReturnValue(false);
  serial.autorizado.mockResolvedValue(null);
  bt.recuperar.mockResolvedValue(null);
  api.solicitarApi.mockResolvedValue(doc);
});

describe("obtención del documento", () => {
  it("consulta comprobantes y notas", async () => {
    await obtenerDocumentoImprimible({ ingresoId: "a b" });
    await documentoDeIngreso({ ingresoId: "1", notaId: "2" })();
    expect(api.solicitarApi.mock.calls.map((c) => c[0])).toEqual(["/impresion/ingresos/a%20b", "/impresion/ingresos/1/notas/2"]);
  });
});

describe("selección automática de la salida del ticket", () => {
  it("usa el diálogo del sistema cuando no hay APIs de impresora", async () => {
    expect(await resolverDestinoTicket()).toEqual({ tipo: "sistema" });
    expect(leerDirecto()).toBeNull();
  });
  it("respeta la decisión recordada de usar el diálogo del sistema", async () => {
    guardarDirecto({ tipo: "sistema" });
    serial.disponible.mockReturnValue(true);
    expect(await resolverDestinoTicket()).toEqual({ tipo: "sistema" });
    expect(serial.elegir).not.toHaveBeenCalled();
  });
  it("reutiliza un puerto serie ya autorizado sin preguntar", async () => {
    serial.disponible.mockReturnValue(true);
    serial.autorizado.mockResolvedValue({ p: 1 });
    expect(await resolverDestinoTicket()).toEqual({ tipo: "serial", puerto: { p: 1 } });
    expect(serial.elegir).not.toHaveBeenCalled();
  });
  it("reutiliza la impresora Bluetooth recordada sin preguntar", async () => {
    bt.disponible.mockReturnValue(true);
    guardarDirecto({ tipo: "bluetooth", id: "d1", nombre: "MPT" });
    bt.recuperar.mockResolvedValue({ id: "d1" });
    expect(await resolverDestinoTicket()).toEqual({ tipo: "bluetooth", dispositivo: { id: "d1" } });
    expect(bt.elegir).not.toHaveBeenCalled();
  });
  it("la primera vez en escritorio muestra el selector serie una sola vez y lo recuerda", async () => {
    serial.disponible.mockReturnValue(true);
    bt.disponible.mockReturnValue(true);
    serial.elegir.mockResolvedValueOnce({ p: 2 });
    expect(await resolverDestinoTicket()).toEqual({ tipo: "serial", puerto: { p: 2 } });
    expect(leerDirecto()).toEqual({ tipo: "serial" });
  });
  it("la primera vez en móvil muestra el selector Bluetooth y recuerda el dispositivo", async () => {
    bt.disponible.mockReturnValue(true);
    bt.elegir.mockResolvedValueOnce({ id: "n1", name: "" });
    expect(await resolverDestinoTicket()).toEqual({ tipo: "bluetooth", dispositivo: { id: "n1", name: "" } });
    expect(leerDirecto()).toEqual({ tipo: "bluetooth", id: "n1", nombre: "Impresora Bluetooth" });
  });
  it("si se pierde el permiso Bluetooth recordado, vuelve a preguntar", async () => {
    bt.disponible.mockReturnValue(true);
    guardarDirecto({ tipo: "bluetooth", id: "viejo", nombre: "MPT" });
    bt.elegir.mockResolvedValueOnce({ id: "nuevo", name: "MPT 2" });
    expect((await resolverDestinoTicket()).tipo).toBe("bluetooth");
    expect(leerDirecto()).toMatchObject({ id: "nuevo", nombre: "MPT 2" });
    expect(await resolverDestinoTicket()).toMatchObject({ tipo: "bluetooth", dispositivo: { id: "nuevo" } });
    expect(bt.elegir).toHaveBeenCalledOnce();
  });
  it("cerrar el selector equivale a usar el diálogo del sistema y no se vuelve a preguntar", async () => {
    serial.disponible.mockReturnValue(true);
    serial.elegir.mockRejectedValueOnce(cancelar());
    expect(await resolverDestinoTicket()).toEqual({ tipo: "sistema" });
    expect(leerDirecto()).toEqual({ tipo: "sistema" });
  });
  it("otros errores caen al diálogo sin recordar la decisión", async () => {
    bt.disponible.mockReturnValue(true);
    bt.elegir.mockRejectedValueOnce(new DOMException("x", "SecurityError"));
    expect(await resolverDestinoTicket()).toEqual({ tipo: "sistema" });
    expect(leerDirecto()).toBeNull();
  });
  it("prepara el tamaño: recuerda la elección y solo resuelve impresora para ticket", async () => {
    expect(await prepararImpresion("A4")).toEqual({ formato: "A4", destino: null });
    expect(leerFormato()).toBe("A4");
    expect(tamanoInicial()).toBe("A4");
    expect(await prepararImpresion("TICKET")).toEqual({ formato: "TICKET", destino: { tipo: "sistema" } });
    expect(tamanoInicial()).toBe("TICKET");
  });
});

describe("envío a la salida elegida", () => {
  it("A4: PDF propio, PDF externo y A4 propio sin PDF", async () => {
    expect(await imprimirDocumento(doc, { formato: "A4", destino: null })).toEqual({ modo: "dialogo" });
    expect(navegador.imprimirPdf).toHaveBeenCalledWith("http://api/archivos/1/contenido", true);
    navegador.imprimirPdf.mockResolvedValueOnce("abierto");
    expect(await imprimirDocumento({ ...doc, enlacePdf: "https://n/x.pdf" }, { formato: "A4", destino: null })).toEqual({ modo: "pestana" });
    expect(await imprimirDocumento({ ...doc, electronico: false }, { formato: "A4", destino: null })).toEqual({ modo: "dialogo" });
    expect(navegador.imprimirHtml).toHaveBeenCalledTimes(1);
  });
  it("ticket por el diálogo del sistema (con o sin destino resuelto)", async () => {
    expect(await imprimirDocumento(doc, { formato: "TICKET", destino: { tipo: "sistema" } })).toEqual({ modo: "dialogo" });
    await imprimirDocumento(doc, { formato: "TICKET", destino: null });
    expect(navegador.imprimirHtml).toHaveBeenCalledWith(expect.stringContaining("80mm"), { anchoMm: 80 });
  });
  it("ticket directo por Bluetooth y por serie", async () => {
    expect(await imprimirDocumento(doc, { formato: "TICKET", destino: { tipo: "bluetooth", dispositivo: { id: "d" } as never } })).toEqual({ modo: "directo" });
    expect(await imprimirDocumento(doc, { formato: "TICKET", destino: { tipo: "serial", puerto: { p: 1 } as never } })).toEqual({ modo: "directo" });
    expect(bt.enviar).toHaveBeenCalledOnce();
    expect(serial.enviar).toHaveBeenCalledWith({ p: 1 }, expect.any(Uint8Array), 9600);
    expect(navegador.imprimirHtml).not.toHaveBeenCalled();
  });
  it("si la impresora conectada falla, abre el diálogo del sistema y reporta el error", async () => {
    const error = new Error("apagada");
    bt.enviar.mockRejectedValueOnce(error);
    expect(await imprimirDocumento(doc, { formato: "TICKET", destino: { tipo: "bluetooth", dispositivo: {} as never } })).toEqual({ modo: "dialogo", errorDirecto: error });
    expect(navegador.imprimirHtml).toHaveBeenCalledOnce();
  });
  it("ejecuta obteniendo el documento", async () => {
    const resultado = await ejecutarImpresion(async () => doc, { formato: "TICKET", destino: { tipo: "sistema" } });
    expect(resultado).toMatchObject({ modo: "dialogo", documento: doc });
  });
});

describe("avisos y hooks de impresión", () => {
  it("traduce errores del navegador", () => {
    for (const nombre of ["NotFoundError", "SecurityError", "NetworkError"]) expect(mensajeErrorImpresion(new DOMException("x", nombre))).not.toBe("x");
    expect(mensajeErrorImpresion(new Error("falla"))).toBe("falla");
    expect(mensajeErrorImpresion("?")).toMatch(/No se pudo/);
  });
  it("comunica cada tipo de resultado", () => {
    const a = avisos();
    avisarResultado({ modo: "directo", documento: doc }, a);
    avisarResultado({ modo: "pestana", documento: { ...doc, advertencias: [] } }, a);
    avisarResultado({ modo: "dialogo", documento: { ...doc, advertencias: [] }, errorDirecto: new Error("sin papel") }, a);
    expect(a.exito).toHaveBeenCalledOnce();
    expect(a.advertencia).toHaveBeenCalledWith("ojo");
    expect(a.advertencia).not.toHaveBeenCalledWith(expect.stringContaining("otra pestaña"));
    expect(a.advertencia).toHaveBeenCalledWith(expect.stringContaining("sin papel"));
  });
  it("useImpresion evita dobles envíos, avisa y reporta errores", async () => {
    const a = avisos();
    const { result } = renderHook(() => useImpresion(a));
    let primero: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      primero = result.current.imprimir(async () => doc, "TICKET");
      expect(await result.current.imprimir(async () => doc, "TICKET")).toBe(false);
      await primero;
    });
    expect(await primero).toBe(true);
    expect(a.advertencia).toHaveBeenCalledWith("ojo");
    await act(async () => { await result.current.imprimir(async () => doc, "A4"); });
    expect(navegador.imprimirPdf).toHaveBeenCalled();
    await act(async () => { expect(await result.current.imprimir(() => Promise.reject(new Error("sin red")), "TICKET")).toBe(false); });
    expect(a.error).toHaveBeenCalledWith("sin red");
  });
  it("useImprimirAlEmitir imprime sin romper la venta ante cualquier falla", async () => {
    const a = avisos();
    const { result } = renderHook(() => useImprimirAlEmitir(a));
    const preparada = await result.current.preparar();
    expect(preparada).toEqual({ formato: "TICKET", destino: { tipo: "sistema" } });
    await result.current.imprimir(async () => doc, preparada);
    expect(navegador.imprimirHtml).toHaveBeenCalledOnce();
    serial.disponible.mockReturnValue(true);
    serial.autorizado.mockResolvedValue({ p: 1 });
    await result.current.imprimir(async () => doc, await result.current.preparar("TICKET"));
    expect(a.exito).toHaveBeenCalled();
    await result.current.imprimir(() => Promise.reject(new Error("caído")), preparada);
    expect(a.error).toHaveBeenCalledWith(expect.stringContaining("caído"));
    window.localStorage.setItem("magina.impresion.directo.v2", "{}");
    serial.autorizado.mockRejectedValue(new Error("x"));
    serial.disponible.mockImplementation(() => { throw new Error("api rota"); });
    expect(await result.current.preparar("A4")).toEqual({ formato: "A4", destino: null });
    expect(await result.current.preparar("TICKET")).toEqual({ formato: "TICKET", destino: { tipo: "sistema" } });
  });
});
