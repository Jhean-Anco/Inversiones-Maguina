import { randomInt } from "node:crypto";

export function calcularDigitoVerificadorEAN13(base: string): number {
  if (!/^\d{12}$/.test(base)) throw new Error("La base del código EAN-13 debe tener 12 dígitos.");
  const suma = [...base].reduce((total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 1 : 3), 0);
  return (10 - suma % 10) % 10;
}

export function generarCodigoBarrasInterno(): string {
  const base = `20${randomInt(0, 10_000_000_000).toString().padStart(10, "0")}`;
  return `${base}${calcularDigitoVerificadorEAN13(base)}`;
}

export function esCodigoEAN13Valido(codigo: string): boolean {
  return /^\d{13}$/.test(codigo) && calcularDigitoVerificadorEAN13(codigo.slice(0, 12)) === Number(codigo[12]);
}
