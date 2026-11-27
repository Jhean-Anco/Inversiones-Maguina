/** "2026-11-25" → "25/11/2026"; cualquier otro texto se devuelve tal cual. */
export function fechaCorta(iso: string) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

const formateador = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1250.5" → "S/ 1,250.50" (los importes inválidos se muestran como S/ 0.00). */
export function montoSoles(valor: string | number) {
  const numero = Number(valor);
  return `S/ ${formateador.format(Number.isFinite(numero) ? numero : 0)}`;
}

export function escaparHtml(valor: unknown) {
  return String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] ?? caracter);
}
