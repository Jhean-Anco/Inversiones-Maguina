import { Dialogo } from "../ui/dialogo/dialogo";
import type { Producto } from "../../services/inventario/productos.service";

const patronesL = ["0001101", "0011001", "0010011", "0111101", "0100011", "0110001", "0101111", "0111011", "0110111", "0001011"];
const paridadPrimero = ["LLLLLL", "LLGLGG", "LLGGLG", "LLGGGL", "LGLLGG", "LGGLLG", "LGGGLL", "LGLGLG", "LGLGGL", "LGGLGL"];

function patronEan13(codigo: string) {
  if (!/^\d{13}$/.test(codigo)) return null;
  const digitos = [...codigo].map(Number);
  const suma = digitos.slice(0, 12).reduce((total, digito, indice) => total + digito * (indice % 2 === 0 ? 1 : 3), 0);
  if ((10 - suma % 10) % 10 !== digitos[12]) return null;
  const invertir = (patron: string) => [...patron].map((bit) => bit === "0" ? "1" : "0").join("");
  const izquierda = digitos.slice(1, 7).map((digito, indice) => {
    const patron = patronesL[digito];
    return paridadPrimero[digitos[0]][indice] === "L" ? patron : invertir([...patron].reverse().join(""));
  }).join("");
  const derecha = digitos.slice(7).map((digito) => invertir(patronesL[digito])).join("");
  return `101${izquierda}01010${derecha}101`;
}

function CodigoBarras({ codigo }: { codigo: string }) {
  const patron = patronEan13(codigo);
  if (!patron) return <p className="max-w-[42ch] text-[13px] leading-[1.5] text-[#a33e34]">El código guardado no tiene formato EAN-13. Edita el repuesto y genera un nuevo código antes de imprimir.</p>;
  const guardas = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  return <svg className="barcode-print-svg block h-auto w-[min(300px,100%)] overflow-visible fill-black" viewBox="0 0 111 60" preserveAspectRatio="none" role="img" aria-label="Código de barras">
    {[...patron].flatMap((bit, indice) => bit === "1" ? [<rect key={indice} x={indice + 8} y="0" width="1" height={guardas.has(indice) ? 58 : 48} />] : [])}
  </svg>;
}

export function EtiquetaCodigoBarras({ producto, alCerrar }: { producto: Producto; alCerrar: () => void }) {
  const codigo = producto.codigos.find((item) => item.tipo === "BARRAS" || item.tipo === "GTIN")?.codigo ?? "";
  const importeGeneral = producto.precioGeneral === null ? null : Number(producto.precioGeneral);
  const precioGeneral = importeGeneral !== null && Number.isFinite(importeGeneral)
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 }).format(importeGeneral)
    : "Sin precio";
  function imprimirEtiqueta() {
    const etiqueta = document.querySelector<HTMLElement>(".barcode-print-label");
    if (!etiqueta) return;

    const etiquetaImprimible = etiqueta.cloneNode(true) as HTMLElement;
    const codigoImprimible = etiquetaImprimible.querySelector<SVGSVGElement>(".barcode-print-svg");
    codigoImprimible?.setAttribute("viewBox", "0 0 111 60");

    const marcoImpresion = document.createElement("iframe");
    marcoImpresion.title = "Vista de impresión de etiqueta";
    marcoImpresion.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;z-index:-1";
    document.body.append(marcoImpresion);

    const documentoImpresion = marcoImpresion.contentDocument;
    const ventanaImpresion = marcoImpresion.contentWindow;
    if (!documentoImpresion || !ventanaImpresion) {
      marcoImpresion.remove();
      return;
    }

    documentoImpresion.open();
    documentoImpresion.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta de repuesto</title><style>
      @page{size:40mm 20mm;margin:0}
      *{box-sizing:border-box}
      html,body{width:40mm;height:20mm;margin:0;padding:0;overflow:hidden;background:#fff}
      body{font-family:Arial,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .barcode-print-label{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;width:40mm!important;height:20mm!important;min-height:20mm!important;max-height:20mm!important;gap:.5mm!important;margin:0!important;padding:0 1mm!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:#fff!important;color:#000!important}
      .barcode-print-name,.barcode-print-price{display:block!important;width:38mm!important;max-width:38mm!important;height:2.5mm!important;overflow:hidden!important;text-align:center!important;color:#000!important}
      .barcode-print-name{font:600 6pt/2.5mm Arial,sans-serif!important;white-space:nowrap!important;text-overflow:ellipsis!important}
      .barcode-print-price{font:700 6.5pt/2.5mm Arial,sans-serif!important;white-space:nowrap!important}
      .barcode-print-svg{display:block!important;flex:none!important;width:38mm!important;height:13mm!important;max-height:13mm!important;overflow:hidden!important;fill:#000!important}
      .barcode-print-svg rect{fill:#000!important}
    </style></head><body>${etiquetaImprimible.outerHTML}</body></html>`);
    documentoImpresion.close();

    let impresionIniciada = false;
    let impresionLimpia = false;
    const limpiarImpresion = () => {
      if (impresionLimpia) return;
      impresionLimpia = true;
      marcoImpresion.remove();
      window.removeEventListener("focus", limpiarImpresion);
    };
    const iniciarImpresion = () => {
      if (impresionIniciada || !marcoImpresion.isConnected) return;
      impresionIniciada = true;
      window.addEventListener("focus", limpiarImpresion, { once: true });
      ventanaImpresion.addEventListener("afterprint", limpiarImpresion, { once: true });
      ventanaImpresion.focus();
      ventanaImpresion.print();
    };
    marcoImpresion.addEventListener("load", iniciarImpresion, { once: true });
    window.setTimeout(iniciarImpresion, 150);
  }

  return (
    <Dialogo
      kicker="ETIQUETA DE REPUESTO"
      titulo="Imprimir código de barras"
      ancho="sm"
      onCerrar={alCerrar}
      pie={
        <>
          <button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" onClick={alCerrar}>Cerrar</button>
          <button type="button" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" disabled={!patronEan13(codigo)} onClick={imprimirEtiqueta}>Imprimir etiqueta</button>
        </>
      }
    >
      <div className="barcode-print-label grid min-h-[150px] justify-items-center gap-1.5 rounded-xl border border-dashed border-[#b9c8d5] bg-white p-[18px] text-center text-black">
        <strong className="barcode-print-name">{producto.nombre}</strong>
        <CodigoBarras codigo={codigo} />
        <span className="barcode-print-price">Precio {precioGeneral}</span>
      </div>
      <p className="m-0 text-right text-xs text-[#71869a]">En la ventana de impresión, selecciona la impresora Xprinter XP-420B y el tamaño 40 × 20 mm.</p>
    </Dialogo>
  );
}
