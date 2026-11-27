import type { FormatoImpresion } from "./tipos";

const CLAVE_FORMATO = "magina.impresion.formato.v2";
const CLAVE_DIRECTO = "magina.impresion.directo.v2";

/** Cómo salió el último ticket en este equipo: impresora directa elegida una vez, o diálogo del sistema. */
export type MemoriaDirecta = { tipo: "bluetooth"; id: string; nombre: string } | { tipo: "serial" } | { tipo: "sistema" };

function leer(clave: string) {
  try { return window.localStorage.getItem(clave); } catch { return null; }
}
function escribir(clave: string, valor: string | null) {
  try { if (valor === null) window.localStorage.removeItem(clave); else window.localStorage.setItem(clave, valor); } catch { /* sin almacenamiento: se decide de nuevo cada vez */ }
}

/** Último tamaño usado en este equipo (Ticket por defecto). */
export function leerFormato(): FormatoImpresion { return leer(CLAVE_FORMATO) === "A4" ? "A4" : "TICKET"; }
export function guardarFormato(formato: FormatoImpresion) { escribir(CLAVE_FORMATO, formato); }

export function leerDirecto(): MemoriaDirecta | null {
  try {
    const valor = JSON.parse(leer(CLAVE_DIRECTO) ?? "null") as Partial<MemoriaDirecta> | null;
    if (valor?.tipo === "serial" || valor?.tipo === "sistema") return { tipo: valor.tipo };
    if (valor?.tipo === "bluetooth" && typeof valor.id === "string" && typeof valor.nombre === "string") return { tipo: "bluetooth", id: valor.id.slice(0, 200), nombre: valor.nombre.slice(0, 120) };
  } catch { /* dato corrupto: se ignora */ }
  return null;
}
export function guardarDirecto(memoria: MemoriaDirecta | null) { escribir(CLAVE_DIRECTO, memoria && JSON.stringify(memoria)); }
