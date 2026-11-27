/* Tipos mínimos de Web Serial (no incluidos en lib.dom de TypeScript). */
export type PuertoSerial = {
  readable: unknown;
  writable: WritableStream<Uint8Array> | null;
  open: (opciones: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number; bluetoothServiceClassId?: string | number };
};
type ApiSerial = { requestPort: (opciones?: object) => Promise<PuertoSerial>; getPorts: () => Promise<PuertoSerial[]> };

/** UUID del perfil SPP: permite elegir impresoras Bluetooth clásicas emparejadas (Chrome 117+). */
export const SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb";

const api = () => (navigator as Navigator & { serial?: ApiSerial }).serial;

export function serialDisponible() { return Boolean(api()) && window.isSecureContext; }

export async function elegirPuertoSerial(): Promise<PuertoSerial> {
  const serial = api();
  if (!serial || !window.isSecureContext) throw new Error("Este navegador no permite puertos serie. Usa Chrome o Edge en PC con HTTPS.");
  return serial.requestPort({ allowedBluetoothServiceClassIds: [SPP_UUID] });
}

/** Primer puerto ya autorizado (no vuelve a preguntar): así la impresora queda "precargada". */
export async function puertoAutorizado(): Promise<PuertoSerial | null> {
  const serial = api();
  if (!serial) return null;
  const puertos = await serial.getPorts().catch(() => []);
  return puertos[0] ?? null;
}

export function describirPuerto(puerto: PuertoSerial) {
  const info = puerto.getInfo?.() ?? {};
  if (info.bluetoothServiceClassId !== undefined) return "Impresora Bluetooth (puerto serie)";
  if (info.usbVendorId !== undefined) return `USB ${info.usbVendorId.toString(16).padStart(4, "0")}:${(info.usbProductId ?? 0).toString(16).padStart(4, "0")}`;
  return "Puerto serie";
}

export async function enviarSerial(puerto: PuertoSerial, datos: Uint8Array, baudios: number) {
  await puerto.open({ baudRate: baudios });
  try {
    if (!puerto.writable) throw new Error("El puerto serie no permite escritura.");
    const escritor = puerto.writable.getWriter();
    try { await escritor.write(datos); } finally { escritor.releaseLock(); }
  } finally {
    await puerto.close();
  }
}
