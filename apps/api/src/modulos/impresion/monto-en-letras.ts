const UNIDADES = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS", "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
const DECENAS = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
const CENTENAS = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

function menorQueMil(numero: number): string {
  if (numero === 0) return "";
  if (numero === 100) return "CIEN";
  const centena = Math.floor(numero / 100);
  const resto = numero % 100;
  let decenas = "";
  if (resto < 30) decenas = UNIDADES[resto];
  else {
    const unidad = resto % 10;
    decenas = `${DECENAS[Math.floor(resto / 10)]}${unidad ? ` Y ${UNIDADES[unidad]}` : ""}`;
  }
  return [CENTENAS[centena], decenas].filter(Boolean).join(" ");
}

/** Convierte un entero no negativo (hasta 999 999 999 999) a palabras en español, en mayúsculas. */
export function enteroEnLetras(numero: number): string {
  if (!Number.isInteger(numero) || numero < 0 || numero > 999_999_999_999) throw new RangeError("El importe está fuera del rango admitido.");
  if (numero === 0) return "CERO";
  const millones = Math.floor(numero / 1_000_000);
  const miles = Math.floor((numero % 1_000_000) / 1000);
  const resto = numero % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "UN MILLÓN" : `${apocopar(enteroEnLetras(millones))} MILLONES`);
  if (miles) partes.push(miles === 1 ? "MIL" : `${apocopar(menorQueMil(miles))} MIL`);
  if (resto) partes.push(menorQueMil(resto));
  return partes.join(" ");
}

/** "VEINTIUNO MIL" → "VEINTIÚN MIL"; "UNO MILLONES" nunca ocurre porque 1 se trata aparte. */
function apocopar(texto: string) {
  return texto.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
}

/**
 * Importe en letras como en la representación impresa SUNAT:
 * 1250.5 → "SON: MIL DOSCIENTOS CINCUENTA CON 50/100 SOLES".
 */
export function montoEnLetras(importe: number | string, moneda = "SOLES"): string {
  const valor = typeof importe === "string" ? Number(importe) : importe;
  if (!Number.isFinite(valor) || valor < 0) throw new RangeError("El importe no es válido.");
  const centimosTotales = Math.round((valor + Number.EPSILON) * 100);
  const entero = Math.floor(centimosTotales / 100);
  const centimos = centimosTotales % 100;
  return `SON: ${enteroEnLetras(entero)} CON ${String(centimos).padStart(2, "0")}/100 ${moneda}`;
}
