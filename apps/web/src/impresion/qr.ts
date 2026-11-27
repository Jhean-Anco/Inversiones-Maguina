import qrcode from "qrcode-generator";

/** Matriz de módulos del QR (true = oscuro). Nivel de corrección M, como recomienda SUNAT. */
export function matrizQr(texto: string): boolean[][] {
  const qr = qrcode(0, "M");
  qr.addData(texto, "Byte");
  qr.make();
  const tamano = qr.getModuleCount();
  return Array.from({ length: tamano }, (_, fila) => Array.from({ length: tamano }, (_, columna) => qr.isDark(fila, columna)));
}

/** SVG nítido (un `path` por módulo oscuro) apto para ticket térmico y A4. */
export function qrSvg(texto: string, tamanoPx = 132, margenModulos = 2): string {
  const matriz = matrizQr(texto);
  const total = matriz.length + margenModulos * 2;
  const trazos: string[] = [];
  matriz.forEach((fila, y) => fila.forEach((oscuro, x) => { if (oscuro) trazos.push(`M${x + margenModulos} ${y + margenModulos}h1v1h-1z`); }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${tamanoPx}" height="${tamanoPx}" shape-rendering="crispEdges" role="img" aria-label="Código QR del comprobante"><rect width="100%" height="100%" fill="#fff"/><path d="${trazos.join("")}" fill="#000"/></svg>`;
}
