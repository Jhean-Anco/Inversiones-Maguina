import { afterEach, describe, expect, it, vi } from "vitest";
import { abrirEnPestana, imprimirHtml, imprimirPdf } from "./imprimir-navegador";
import { bluetoothDisponible, caracteristicaEscritura, elegirImpresoraBluetooth, enviarBluetooth, recuperarImpresoraBluetooth, SERVICIOS_IMPRESORA } from "./transporte-bluetooth";
import { describirPuerto, elegirPuertoSerial, enviarSerial, puertoAutorizado, serialDisponible } from "./transporte-serial";

const navegador = navigator as unknown as Record<string, unknown>;
afterEach(() => { delete navegador.bluetooth; delete navegador.serial; vi.useRealTimers(); });
const seguro = (valor: boolean) => Object.defineProperty(window, "isSecureContext", { value: valor, configurable: true });

function caracteristica(props: { write?: boolean; writeWithoutResponse?: boolean }, metodos: Record<string, unknown> = {}) {
  return { uuid: "c", properties: { write: false, writeWithoutResponse: false, ...props }, ...metodos };
}
function dispositivo(caracteristicas: unknown[], conectado = false) {
  const servidor = { connected: conectado, disconnect: vi.fn(), connect: vi.fn(), getPrimaryServices: vi.fn(async () => [
    { uuid: "otro", getCharacteristics: async () => { throw new Error("x"); } },
    { uuid: SERVICIOS_IMPRESORA[0], getCharacteristics: async () => caracteristicas },
  ]) };
  servidor.connect.mockResolvedValue(servidor);
  return { id: "d1", name: "MPT", gatt: servidor };
}

describe("Bluetooth", () => {
  it("detecta disponibilidad y exige contexto seguro", async () => {
    seguro(true);
    expect(bluetoothDisponible()).toBe(false);
    await expect(elegirImpresoraBluetooth()).rejects.toThrow(/Bluetooth/);
    expect(await recuperarImpresoraBluetooth("x")).toBeNull();
    navegador.bluetooth = { requestDevice: vi.fn(async () => ({ id: "n" })), getDevices: vi.fn(async () => [{ id: "d1" }]) };
    expect(bluetoothDisponible()).toBe(true);
    expect((await elegirImpresoraBluetooth()).id).toBe("n");
    expect(await recuperarImpresoraBluetooth("d1")).toEqual({ id: "d1" });
    expect(await recuperarImpresoraBluetooth("zz")).toBeNull();
    seguro(false);
    await expect(elegirImpresoraBluetooth()).rejects.toThrow();
    seguro(true);
  });
  it("elige característica escribible o falla con mensaje claro", async () => {
    const d = dispositivo([caracteristica({ write: true })]);
    expect((await caracteristicaEscritura(d.gatt as never)).properties.write).toBe(true);
    await expect(caracteristicaEscritura(dispositivo([]).gatt as never)).rejects.toThrow(/canal de escritura/);
  });
  it("envía en bloques por cada método de escritura y desconecta", async () => {
    vi.useFakeTimers();
    const sinRespuesta = vi.fn(async () => undefined);
    const d = dispositivo([caracteristica({ writeWithoutResponse: true }, { writeValueWithoutResponse: sinRespuesta })]);
    const envio = enviarBluetooth(d as never, new Uint8Array(5), { bloque: 2, pausaMs: 1 });
    await vi.runAllTimersAsync(); await envio;
    expect(sinRespuesta).toHaveBeenCalledTimes(3);
    expect(d.gatt.disconnect).toHaveBeenCalled();
    for (const metodo of ["writeValueWithResponse", "writeValue"]) {
      const escribir = vi.fn(async () => undefined);
      const otro = dispositivo([caracteristica({ write: true }, { [metodo]: escribir })], true);
      const p = enviarBluetooth(otro as never, new Uint8Array(1)); await vi.runAllTimersAsync(); await p;
      expect(escribir).toHaveBeenCalledOnce();
    }
    const sinMetodo = dispositivo([caracteristica({ write: true })], true);
    const fallo = expect(enviarBluetooth(sinMetodo as never, new Uint8Array(1))).rejects.toThrow(/no puede escribir/);
    await vi.runAllTimersAsync(); await fallo;
    await expect(enviarBluetooth({ id: "x" }, new Uint8Array(1))).rejects.toThrow(/Bluetooth LE/);
  });
});

describe("Serial", () => {
  it("autoriza, describe y escribe en el puerto", async () => {
    seguro(true);
    expect(serialDisponible()).toBe(false);
    expect(await puertoAutorizado()).toBeNull();
    await expect(elegirPuertoSerial()).rejects.toThrow(/puertos serie/);
    const write = vi.fn(async () => undefined);
    const puerto = { readable: null, writable: { getWriter: () => ({ write, releaseLock: vi.fn() }) }, open: vi.fn(async () => undefined), close: vi.fn(async () => undefined), getInfo: () => ({ usbVendorId: 0x4b8, usbProductId: 0xe }) };
    navegador.serial = { requestPort: vi.fn(async () => puerto), getPorts: vi.fn(async () => [puerto]) };
    expect(serialDisponible()).toBe(true);
    expect(await elegirPuertoSerial()).toBe(puerto);
    expect(await puertoAutorizado()).toBe(puerto);
    expect(describirPuerto(puerto as never)).toBe("USB 04b8:000e");
    expect(describirPuerto({ getInfo: () => ({ bluetoothServiceClassId: 1 }) } as never)).toMatch(/Bluetooth/);
    expect(describirPuerto({} as never)).toBe("Puerto serie");
    expect(describirPuerto({ getInfo: () => ({ usbVendorId: 1 }) } as never)).toBe("USB 0001:0000");
    await enviarSerial(puerto as never, new Uint8Array([1]), 9600);
    expect(puerto.open).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(write).toHaveBeenCalled();
    expect(puerto.close).toHaveBeenCalled();
    await expect(enviarSerial({ ...puerto, writable: null } as never, new Uint8Array([1]), 9600)).rejects.toThrow(/escritura/);
    navegador.serial = { requestPort: vi.fn(), getPorts: vi.fn(async () => { throw new Error("x"); }) };
    expect(await puertoAutorizado()).toBeNull();
  });
});

describe("impresión por navegador", () => {
  it("imprime HTML en un marco oculto y ajusta el alto de ticket", async () => {
    const print = vi.fn();
    const promesa = imprimirHtml("<p>hola</p>", { anchoMm: 80 });
    const marco = document.querySelector("iframe")!;
    Object.defineProperty(marco.contentWindow!, "print", { value: print, configurable: true });
    marco.dispatchEvent(new Event("load"));
    await promesa;
    await new Promise((r) => setTimeout(r, 0));
    expect(print).toHaveBeenCalled();
    expect(marco.contentDocument!.head.innerHTML).toContain("@page{size:80mm");
    marco.contentWindow!.dispatchEvent(new Event("afterprint"));
    marco.remove();
  });
  it("abre pestañas y detecta bloqueos", () => {
    const ventana = { opener: {} };
    const abrir = vi.spyOn(window, "open").mockReturnValueOnce(ventana as never).mockReturnValueOnce(null);
    abrirEnPestana("https://x");
    expect(ventana.opener).toBeNull();
    expect(() => abrirEnPestana("https://x")).toThrow(/bloqueó/);
    abrir.mockRestore();
  });
  it("PDF externo se abre en pestaña; PDF propio se descarga y se imprime", async () => {
    const abrir = vi.spyOn(window, "open").mockReturnValue({ opener: null } as never);
    expect(await imprimirPdf("https://nubefact/x.pdf", false)).toBe("abierto");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("pdf", { status: 500 })));
    await expect(imprimirPdf("/archivos/1", true)).rejects.toThrow(/500/);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("%PDF", { headers: { "content-type": "text/plain" } })));
    URL.createObjectURL = vi.fn(() => "blob:x"); URL.revokeObjectURL = vi.fn();
    vi.useFakeTimers();
    const promesa = imprimirPdf("/archivos/1", true);
    await vi.waitFor(() => expect(document.querySelector("iframe")).not.toBeNull());
    const marco = document.querySelector("iframe")!;
    Object.defineProperty(marco.contentWindow!, "print", { value: vi.fn(), configurable: true });
    marco.dispatchEvent(new Event("load"));
    await vi.advanceTimersByTimeAsync(400);
    expect(await promesa).toBe("impreso");
    marco.remove();
    vi.unstubAllGlobals();
    abrir.mockRestore();
  });
});
