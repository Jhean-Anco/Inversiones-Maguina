type FilaPropuesta = Record<string, unknown>;

function normalizarEncabezado(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function obtenerCampoPropuesta(fila: FilaPropuesta, alias: string[]) {
  const objetivos = new Set(alias.map(normalizarEncabezado));
  const clave = Object.keys(fila).find((item) => objetivos.has(normalizarEncabezado(item)));
  return clave ? String(fila[clave] ?? "").trim() : "";
}

export function mismoCorrelativoPropuesta(izquierdo: string, derecho: string) {
  const normalizar = (valor: string) => /^\d+$/.test(valor) ? valor.replace(/^0+(?=\d)/, "") : valor;
  return normalizar(izquierdo.trim().toUpperCase()) === normalizar(derecho.trim().toUpperCase());
}
