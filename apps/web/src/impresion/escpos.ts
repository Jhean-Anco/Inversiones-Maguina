const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** Caracteres españoles en la página de códigos PC850 (ESC t 2), soportada por casi todas las térmicas. */
const CP850: Record<string, number> = {
  "á": 0xa0, "é": 0x82, "í": 0xa1, "ó": 0xa2, "ú": 0xa3, "ñ": 0xa4, "Ñ": 0xa5, "ü": 0x81, "Ü": 0x9a, "¿": 0xa8, "¡": 0xad,
  "Á": 0xb5, "É": 0x90, "Í": 0xd6, "Ó": 0xe0, "Ú": 0xe9, "°": 0xf8, "º": 0xa7, "ª": 0xa6, "·": 0xfa, "€": 0xd5,
};

/** Convierte texto a bytes PC850; lo que no existe en la tabla se translitera (sin tilde) o se reemplaza por "?". */
export function codificarTexto(texto: string): number[] {
  const bytes: number[] = [];
  for (const caracter of texto.replace(/[\r\t]/g, " ")) {
    const codigo = caracter.charCodeAt(0);
    if (codigo === LF || (codigo >= 0x20 && codigo < 0x7f)) bytes.push(codigo);
    else if (CP850[caracter] !== undefined) bytes.push(CP850[caracter]);
    else {
      const base = caracter.normalize("NFD").replace(/[̀-ͯ]/g, "");
      bytes.push(base.length === 1 && base.charCodeAt(0) < 0x7f ? base.charCodeAt(0) : 0x3f);
    }
  }
  return bytes;
}

export type Alineacion = "izquierda" | "centro" | "derecha";

/** Constructor fluido de comandos ESC/POS. */
export class EscPos {
  private readonly datos: number[] = [];

  iniciar() { this.datos.push(ESC, 0x40, ESC, 0x74, 0x02); return this; }
  alinear(alineacion: Alineacion) { this.datos.push(ESC, 0x61, alineacion === "centro" ? 1 : alineacion === "derecha" ? 2 : 0); return this; }
  negrita(activa: boolean) { this.datos.push(ESC, 0x45, activa ? 1 : 0); return this; }
  /** Multiplicadores de ancho y alto (1 a 8). */
  tamano(ancho = 1, alto = 1) {
    const limitar = (valor: number) => Math.min(8, Math.max(1, Math.trunc(valor)));
    this.datos.push(GS, 0x21, ((limitar(ancho) - 1) << 4) | (limitar(alto) - 1));
    return this;
  }
  texto(texto: string) { this.datos.push(...codificarTexto(texto)); return this; }
  linea(texto = "") { return this.texto(texto).saltos(1); }
  saltos(cantidad = 1) { for (let i = 0; i < cantidad; i += 1) this.datos.push(LF); return this; }
  /** QR nativo (modelo 2, corrección M). Requiere firmware compatible con `GS ( k`. */
  qr(contenido: string, tamanoModulo = 6) {
    const datos = new TextEncoder().encode(contenido);
    const largo = datos.length + 3;
    this.datos.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    this.datos.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, tamanoModulo)));
    this.datos.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31);
    this.datos.push(GS, 0x28, 0x6b, largo & 0xff, largo >> 8, 0x31, 0x50, 0x30, ...datos);
    this.datos.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }
  /** Avanza papel y hace corte parcial. */
  cortar() { this.datos.push(GS, 0x56, 0x42, 0x03); return this; }
  /** Pulso al cajón de dinero conectado a la impresora (pin 2). */
  resultado() { return Uint8Array.from(this.datos); }
}

/** Parte un texto en renglones de `ancho` columnas sin cortar palabras salvo que excedan el ancho. */
export function envolver(texto: string, ancho: number): string[] {
  const renglones: string[] = [];
  for (const parrafo of texto.split("\n")) {
    let actual = "";
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      for (let resto = palabra; resto.length;) {
        const espacio = actual ? 1 : 0;
        if (actual.length + espacio + resto.length <= ancho) { actual += (espacio ? " " : "") + resto; resto = ""; }
        else if (!actual && resto.length > ancho) { renglones.push(resto.slice(0, ancho)); resto = resto.slice(ancho); }
        else { renglones.push(actual); actual = ""; }
      }
    }
    renglones.push(actual);
  }
  return renglones;
}

/** Renglón con texto a la izquierda y a la derecha (la izquierda se recorta si no cabe). */
export function columnas(izquierda: string, derecha: string, ancho: number) {
  const espacio = Math.max(1, ancho - derecha.length);
  const izq = izquierda.length >= espacio ? `${izquierda.slice(0, Math.max(0, espacio - 1))} ` : izquierda.padEnd(espacio, " ");
  return `${izq}${derecha}`.slice(0, ancho);
}

/** Divide los bytes en bloques (las impresoras BLE suelen aceptar 20–512 bytes por escritura). */
export function trocear(datos: Uint8Array, tamano: number): Uint8Array[] {
  if (tamano < 1) throw new RangeError("El tamaño de bloque debe ser positivo.");
  const bloques: Uint8Array[] = [];
  for (let inicio = 0; inicio < datos.length; inicio += tamano) bloques.push(datos.subarray(inicio, inicio + tamano));
  return bloques;
}
