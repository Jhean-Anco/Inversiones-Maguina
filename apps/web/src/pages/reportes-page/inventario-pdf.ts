import type { FiltroReporte, ReporteInventario } from "../../services/reportes.service";
import { numero, soles } from "./reportes-formatters";

type VistaInventarioPdf = "repuestos" | "mototaxis";
const ANCHO = 842;
const ALTO = 595;
const ESCALA = 2;
const MARGEN = 34;
const COLOR_TEXTO = "#173b59";
const COLOR_SUAVE = "#536b7d";
const FAMILIA = 'Inter, "Segoe UI", system-ui, sans-serif';
const fechaCorta = (valor: string) => { const [anio, mes, dia] = valor.split("-"); return `${dia}/${mes}/${anio}`; };

function juntarBytes(...partes: Uint8Array[]) {
  const salida = new Uint8Array(partes.reduce((total, parte) => total + parte.length, 0));
  let inicio = 0;
  for (const parte of partes) { salida.set(parte, inicio); inicio += parte.length; }
  return salida;
}

function imagenABytes(dataUrl: string) {
  const base64 = atob(dataUrl.split(",")[1]);
  return Uint8Array.from(base64, (caracter) => caracter.charCodeAt(0));
}

async function cargarLogo() {
  const imagen = new Image();
  imagen.src = "/logo.webp";
  await new Promise<void>((resolver, rechazar) => {
    imagen.onload = () => resolver();
    imagen.onerror = () => rechazar(new Error("No se pudo cargar el logo de Inversiones Maguiña."));
  });
  return imagen;
}

function crearMarcaAgua(logo: HTMLImageElement) {
  const lienzo = document.createElement("canvas");
  lienzo.width = logo.naturalWidth;
  lienzo.height = logo.naturalHeight;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar la marca de agua del PDF.");
  contexto.drawImage(logo, 0, 0);
  const pixeles = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
  for (let i = 0; i < pixeles.data.length; i += 4) {
    const gris = Math.round(pixeles.data[i] * 0.299 + pixeles.data[i + 1] * 0.587 + pixeles.data[i + 2] * 0.114);
    pixeles.data[i] = gris;
    pixeles.data[i + 1] = gris;
    pixeles.data[i + 2] = gris;
  }
  contexto.putImageData(pixeles, 0, 0);
  return lienzo;
}

function dibujarPagina(
  logo: HTMLImageElement,
  marcaAgua: HTMLCanvasElement,
  columnas: string[],
  filas: unknown[][],
  titulo: string,
  filtro: FiltroReporte,
  resumen: { modelos: number; modelosConStock: number; sinStock: number; modelosConMovimiento: number },
  motos: boolean,
  pagina: number,
  paginas: number,
) {
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO * ESCALA; lienzo.height = ALTO * ESCALA;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("No se pudo preparar una página del PDF.");
  contexto.scale(ESCALA, ESCALA); contexto.fillStyle = "#fff"; contexto.fillRect(0, 0, ANCHO, ALTO);

  const selloAncho = 340, selloAlto = selloAncho * marcaAgua.height / marcaAgua.width;
  contexto.save(); contexto.globalAlpha = 0.105;
  contexto.drawImage(marcaAgua, (ANCHO - selloAncho) / 2, (ALTO - selloAlto) / 2, selloAncho, selloAlto);
  contexto.restore();

  const texto = (valor: unknown, x: number, y: number, size: number, color = COLOR_TEXTO, weight = 400, maxWidth?: number) => {
    contexto.fillStyle = color; contexto.font = `${weight} ${size}px ${FAMILIA}`; contexto.textBaseline = "alphabetic";
    let contenido = String(valor ?? "").replace(/[\r\n]/g, " ");
    if (maxWidth && contexto.measureText(contenido).width > maxWidth) {
      while (contenido.length > 2 && contexto.measureText(`${contenido}…`).width > maxWidth) contenido = contenido.slice(0, -1);
      contenido += "…";
    }
    contexto.fillText(contenido, x, y);
  };

  contexto.drawImage(logo, MARGEN, 26, 38, 38);
  texto("INVERSIONES MAGUIÑA · INVENTARIO", MARGEN + 48, 51, 11, "#1769aa", 700);
  contexto.strokeStyle = "#d42d4b"; contexto.lineWidth = 2;
  contexto.beginPath(); contexto.moveTo(MARGEN, 77); contexto.lineTo(ANCHO - MARGEN, 77); contexto.stroke();
  texto(titulo, MARGEN, 108, 20, COLOR_TEXTO, 700);
  texto(`Periodo de movimientos: ${fechaCorta(filtro.desde)} al ${fechaCorta(filtro.hasta)}`, MARGEN, 125, 9, COLOR_SUAVE);
  texto(`Generado: ${new Date().toLocaleString("es-PE")}`, MARGEN, 139, 8, COLOR_SUAVE);

  const etiquetas = [motos ? "Modelos activos" : "Repuestos activos", "Con stock", "Sin stock", "Con movimiento"];
  const valores = [resumen.modelos, resumen.modelosConStock, resumen.sinStock, resumen.modelosConMovimiento];
  const espacio = 8, tarjetaW = (ANCHO - MARGEN * 2 - espacio * 3) / 4, tarjetaY = 153, tarjetaH = 34;
  etiquetas.forEach((etiqueta, indice) => {
    const x = MARGEN + indice * (tarjetaW + espacio);
    contexto.fillStyle = "#fff"; contexto.fillRect(x, tarjetaY, tarjetaW, tarjetaH);
    contexto.strokeStyle = "#dce5eb"; contexto.lineWidth = 1; contexto.strokeRect(x, tarjetaY, tarjetaW, tarjetaH);
    texto(etiqueta, x + 7, tarjetaY + 13, 7, COLOR_SUAVE, 400, tarjetaW - 14);
    texto(numero(valores[indice]), x + 7, tarjetaY + 28, 10, COLOR_TEXTO, 700);
  });

  const tablaY = 201, encabezadoH = 19, altoFila = 15;
  const anchoColumna = (ANCHO - MARGEN * 2) / columnas.length;
  contexto.fillStyle = "#edf3f7"; contexto.fillRect(MARGEN, tablaY, ANCHO - MARGEN * 2, encabezadoH);
  columnas.forEach((columna, indice) => texto(columna, MARGEN + indice * anchoColumna + 4, tablaY + 13, 7, COLOR_TEXTO, 700, anchoColumna - 8));
  filas.forEach((fila, indiceFila) => {
    const y = tablaY + encabezadoH + indiceFila * altoFila;
    contexto.strokeStyle = "#d6e0e9"; contexto.lineWidth = 0.5;
    contexto.beginPath(); contexto.moveTo(MARGEN, y + altoFila); contexto.lineTo(ANCHO - MARGEN, y + altoFila); contexto.stroke();
    fila.forEach((celda, indiceColumna) => texto(celda, MARGEN + indiceColumna * anchoColumna + 4, y + 10, 7, COLOR_TEXTO, 400, anchoColumna - 8));
  });
  texto(`Reporte de inventario · Inversiones Maguiña · Página ${pagina} de ${paginas}`, MARGEN, ALTO - 18, 7, "#718797");
  return lienzo.toDataURL("image/jpeg", 0.94);
}
export async function descargarReporteInventarioPdf(datos: ReporteInventario, filtro: FiltroReporte, vista: VistaInventarioPdf) {
  await document.fonts?.ready;
  const logo = await cargarLogo();
  const marcaAgua = crearMarcaAgua(logo);
  const motos = vista === "mototaxis" ? datos.mototaxis : undefined;
  const filas: unknown[][] = motos
    ? motos.items.map((item) => [item.codigo, item.nombre, item.marca, numero(item.stockActual), Number(item.precioPromedioCompra) > 0 ? soles(item.precioPromedioCompra) : "—", Number(item.precioPromedioVenta) > 0 ? soles(item.precioPromedioVenta) : "—"])
    : datos.items.map((item) => [item.codigo, item.nombre, item.marca, item.categoria || "—", `${numero(item.stockActual)} ${item.unidad}`, Number(item.precioPromedioCompra) > 0 ? soles(item.precioPromedioCompra) : "—", Number(item.precioPromedioVenta) > 0 ? soles(item.precioPromedioVenta) : "—"]);
  const columnas = motos ? ["Código", "Modelo", "Marca", "Stock actual", "Precio promedio de compra", "Precio promedio de venta"] : ["Código", "Repuesto", "Marca", "Categoría", "Stock actual", "Precio promedio de compra", "Precio promedio de venta"];
  const resumen = motos ? motos.resumen : { modelos: datos.resumen.productos, modelosConStock: datos.resumen.productosConStock, sinStock: datos.resumen.sinStock, modelosConMovimiento: datos.resumen.productosConMovimiento };
  const titulo = motos ? "Inventario de mototaxis" : "Inventario de repuestos";
  const filasPorPagina = 22;
  const grupos = Array.from({ length: Math.max(1, Math.ceil(filas.length / filasPorPagina)) }, (_, indice) => filas.slice(indice * filasPorPagina, (indice + 1) * filasPorPagina));

  const codificar = (texto: string) => new TextEncoder().encode(texto);
  const objetos: Uint8Array[] = [];
  const asignar = (id: number, contenido: Uint8Array) => { objetos[id] = contenido; };
  const idCatalogo = 1, idPaginas = 2, idFuente = 3;
  asignar(idFuente, codificar("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  const idsPagina: number[] = [];

  grupos.forEach((grupo, indice) => {
    const idImagen = 4 + indice * 3;
    const idPagina = idImagen + 1;
    const idContenido = idImagen + 2;
    idsPagina.push(idPagina);
    const jpeg = imagenABytes(dibujarPagina(logo, marcaAgua, columnas, grupo, titulo, filtro, resumen, Boolean(motos), indice + 1, grupos.length));
    asignar(idImagen, juntarBytes(codificar(`<< /Type /XObject /Subtype /Image /Width ${ANCHO * ESCALA} /Height ${ALTO * ESCALA} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, codificar("\nendstream")));
    const contenido = codificar(`q ${ANCHO} 0 0 ${ALTO} 0 0 cm /Pagina Do Q`);
    asignar(idContenido, juntarBytes(codificar(`<< /Length ${contenido.length} >>\nstream\n`), contenido, codificar("\nendstream")));
    asignar(idPagina, codificar(`<< /Type /Page /Parent ${idPaginas} 0 R /MediaBox [0 0 ${ANCHO} ${ALTO}] /Resources << /Font << /F1 ${idFuente} 0 R >> /XObject << /Pagina ${idImagen} 0 R >> >> /Contents ${idContenido} 0 R >>`));
  });
  asignar(idPaginas, codificar(`<< /Type /Pages /Kids [${idsPagina.map((id) => `${id} 0 R`).join(" ")}] /Count ${idsPagina.length} >>`));
  asignar(idCatalogo, codificar(`<< /Type /Catalog /Pages ${idPaginas} 0 R >>`));

  const partes: Uint8Array[] = [new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 226, 227, 207, 211, 10])];
  const offsets = [0];
  let longitud = partes[0].length;
  for (let id = 1; id < objetos.length; id++) {
    offsets[id] = longitud;
    const objeto = juntarBytes(codificar(`${id} 0 obj\n`), objetos[id], codificar("\nendobj\n"));
    partes.push(objeto);
    longitud += objeto.length;
  }
  let xref = `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objetos.length; id++) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objetos.length} /Root ${idCatalogo} 0 R >>\nstartxref\n${longitud}\n%%EOF`;
  const archivo = juntarBytes(...partes, codificar(xref));
  const datosArchivo = archivo.buffer.slice(archivo.byteOffset, archivo.byteOffset + archivo.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([datosArchivo], { type: "application/pdf" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `inventario-${vista}-${filtro.desde}-${filtro.hasta}.pdf`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
