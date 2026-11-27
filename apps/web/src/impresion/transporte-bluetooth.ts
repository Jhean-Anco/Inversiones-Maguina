import { trocear } from "./escpos";

/* Tipos mínimos de Web Bluetooth (no incluidos en lib.dom de TypeScript). */
type Caracteristica = {
  uuid: string;
  properties: { write: boolean; writeWithoutResponse: boolean };
  writeValueWithResponse?: (datos: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (datos: BufferSource) => Promise<void>;
  writeValue?: (datos: BufferSource) => Promise<void>;
};
type Servicio = { uuid: string; getCharacteristics: () => Promise<Caracteristica[]> };
type ServidorGatt = { connected: boolean; connect: () => Promise<ServidorGatt>; disconnect: () => void; getPrimaryServices: () => Promise<Servicio[]> };
export type DispositivoBluetooth = { id: string; name?: string; gatt?: ServidorGatt };
type ApiBluetooth = {
  getAvailability?: () => Promise<boolean>;
  requestDevice: (opciones: { acceptAllDevices?: boolean; filters?: { services: string[] }[]; optionalServices: string[] }) => Promise<DispositivoBluetooth>;
  getDevices?: () => Promise<DispositivoBluetooth[]>;
};

/** Servicios GATT usados por las impresoras térmicas BLE más comunes (genéricas chinas, Xprinter, MPT, Zjiang, ISSC/Microchip, Nordic UART). */
export const SERVICIOS_IMPRESORA = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "6e400001-b5a3-f393-e0a9-e50e24dcca9e",
];

const api = () => (navigator as Navigator & { bluetooth?: ApiBluetooth }).bluetooth;

export function bluetoothDisponible() { return Boolean(api()) && window.isSecureContext; }

/** Pide al usuario elegir la impresora (requiere gesto del usuario). */
export async function elegirImpresoraBluetooth(): Promise<DispositivoBluetooth> {
  const bluetooth = api();
  if (!bluetooth || !window.isSecureContext) throw new Error("Este navegador no permite Bluetooth. Usa Chrome o Edge (en Android o PC) con HTTPS.");
  return bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: SERVICIOS_IMPRESORA });
}

/** Recupera la impresora ya autorizada sin volver a preguntar (Chrome con permisos persistentes). */
export async function recuperarImpresoraBluetooth(id: string): Promise<DispositivoBluetooth | null> {
  const bluetooth = api();
  if (!bluetooth?.getDevices) return null;
  const dispositivos = await bluetooth.getDevices().catch(() => []);
  return dispositivos.find((dispositivo) => dispositivo.id === id) ?? null;
}

/** Busca la característica escribible de la impresora. */
export async function caracteristicaEscritura(servidor: ServidorGatt): Promise<Caracteristica> {
  const servicios = await servidor.getPrimaryServices();
  const ordenados = [...servicios].sort((a, b) => Number(!SERVICIOS_IMPRESORA.includes(a.uuid)) - Number(!SERVICIOS_IMPRESORA.includes(b.uuid)));
  for (const servicio of ordenados) {
    const caracteristicas = await servicio.getCharacteristics().catch(() => []);
    const escribible = caracteristicas.find((c) => c.properties.writeWithoutResponse) ?? caracteristicas.find((c) => c.properties.write);
    if (escribible) return escribible;
  }
  throw new Error("La impresora Bluetooth no expone un canal de escritura compatible (ESC/POS).");
}

const esperar = (ms: number) => new Promise((resolver) => window.setTimeout(resolver, ms));

/** Envía bytes ESC/POS en bloques pequeños con pausas cortas para no saturar el búfer de la impresora. */
export async function enviarBluetooth(dispositivo: DispositivoBluetooth, datos: Uint8Array, opciones: { bloque?: number; pausaMs?: number } = {}) {
  if (!dispositivo.gatt) throw new Error("El dispositivo elegido no admite conexión Bluetooth LE.");
  const servidor = dispositivo.gatt.connected ? dispositivo.gatt : await dispositivo.gatt.connect();
  try {
    const caracteristica = await caracteristicaEscritura(servidor);
    const sinRespuesta = caracteristica.properties.writeWithoutResponse;
    for (const bloque of trocear(datos, opciones.bloque ?? 180)) {
      const copia = bloque.slice();
      if (sinRespuesta && caracteristica.writeValueWithoutResponse) await caracteristica.writeValueWithoutResponse(copia);
      else if (caracteristica.writeValueWithResponse) await caracteristica.writeValueWithResponse(copia);
      else if (caracteristica.writeValue) await caracteristica.writeValue(copia);
      else throw new Error("El navegador no puede escribir en la impresora Bluetooth.");
      await esperar(opciones.pausaMs ?? 20);
    }
  } finally {
    // Espera a que el último bloque salga antes de liberar el enlace.
    await esperar(300);
    servidor.disconnect();
  }
}
