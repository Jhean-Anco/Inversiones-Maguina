/** Logo del emisor listo para ticket: bitmap de 1 bit (ESC/POS) y PNG en blanco y negro (HTML). */
export type LogoTicket = { ancho: number; alto: number; bytes: Uint8Array; dataUrl: string };

/** Puntos del logo en una térmica de 80 mm (576 puntos de ancho útil): la mitad queda proporcionado. */
export const ANCHO_LOGO_PUNTOS = 288;
const RUTA_LOGO = "/logo.webp";

/**
 * Convierte píxeles RGBA a 1 bit con tramado Floyd–Steinberg (el logo es a color: un umbral simple
 * lo dejaría como una mancha). `bytes` va empaquetado de a 8 puntos por byte, bit alto a la izquierda,
 * 1 = punto negro, que es el formato de `GS v 0`.
 */
export function logoDesdePixeles(rgba: Uint8ClampedArray | Uint8Array, ancho: number, alto: number): { bytes: Uint8Array; negro: Uint8Array } {
  const gris = new Float32Array(ancho * alto);
  for (let i = 0; i < gris.length; i += 1) {
    const alfa = rgba[i * 4 + 3] / 255;
    const luz = 0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2];
    gris[i] = luz * alfa + 255 * (1 - alfa);
  }
  const negro = new Uint8Array(ancho * alto);
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const i = y * ancho + x;
      const nuevo = gris[i] < 128 ? 0 : 255;
      const error = gris[i] - nuevo;
      negro[i] = nuevo === 0 ? 1 : 0;
      if (x + 1 < ancho) gris[i + 1] += (error * 7) / 16;
      if (y + 1 < alto) {
        if (x > 0) gris[i + ancho - 1] += (error * 3) / 16;
        gris[i + ancho] += (error * 5) / 16;
        if (x + 1 < ancho) gris[i + ancho + 1] += (error * 1) / 16;
      }
    }
  }
  const anchoBytes = Math.ceil(ancho / 8);
  const bytes = new Uint8Array(anchoBytes * alto);
  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) if (negro[y * ancho + x]) bytes[y * anchoBytes + (x >> 3)] |= 0x80 >> (x & 7);
  }
  return { bytes, negro };
}

let enCache: Promise<LogoTicket | null> | null = null;

async function cargar(): Promise<LogoTicket | null> {
  try {
    const respuesta = await fetch(RUTA_LOGO);
    if (!respuesta.ok) return null;
    const imagen = await createImageBitmap(await respuesta.blob());
    const ancho = ANCHO_LOGO_PUNTOS;
    const alto = Math.max(1, Math.round((imagen.height / imagen.width) * ancho));
    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext("2d");
    if (!contexto) return null;
    contexto.fillStyle = "#fff";
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    const { bytes, negro } = logoDesdePixeles(contexto.getImageData(0, 0, ancho, alto).data, ancho, alto);
    // El mismo bitmap tramado se usa en HTML para que ambas salidas se vean igual.
    const salida = contexto.createImageData(ancho, alto);
    for (let i = 0; i < negro.length; i += 1) {
      const valor = negro[i] ? 0 : 255;
      salida.data.set([valor, valor, valor, 255], i * 4);
    }
    contexto.putImageData(salida, 0, 0);
    return { ancho, alto, bytes, dataUrl: lienzo.toDataURL("image/png") };
  } catch {
    return null;
  }
}

/** Carga el logo una sola vez; si falla (sin red, sin canvas) el ticket se imprime sin él. */
export function cargarLogoTicket(): Promise<LogoTicket | null> {
  enCache ??= cargar().then((logo) => { if (!logo) enCache = null; return logo; });
  return enCache;
}
