import { createPortal } from "react-dom";
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
  return <svg className="block h-auto w-[min(300px,100%)] overflow-visible fill-black [&_text]:fill-[#111] [&_text]:font-[Arial,sans-serif] [&_text]:text-[7px] [&_text]:tracking-[.5px] print:w-[44mm] print:max-h-[21mm]" viewBox="0 0 111 76" role="img" aria-label={`Código de barras ${codigo}`}>
    <title>{`Código de barras ${codigo}`}</title>
    {[...patron].flatMap((bit, indice) => bit === "1" ? [<rect key={indice} x={indice + 8} y="0" width="1" height={guardas.has(indice) ? 58 : 48} />] : [])}
    <text x="55.5" y="72" textAnchor="middle">{codigo}</text>
  </svg>;
}

export function EtiquetaCodigoBarras({ producto, alCerrar }: { producto: Producto; alCerrar: () => void }) {
  const codigo = producto.codigos.find((item) => item.tipo === "BARRAS" || item.tipo === "GTIN")?.codigo ?? "";
  return createPortal(<div className="fixed inset-0 z-[13010] grid place-items-center bg-[#081a2db8] p-5 backdrop-blur-[3px] print:static print:block print:bg-white print:p-0 print:backdrop-blur-0" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) alCerrar(); }}>
    <section className="grid w-[min(520px,100%)] gap-[18px] rounded-2xl border border-[#dce6ef] bg-white p-[22px] text-[#193753] shadow-[0_24px_70px_#071a2d40] print:block print:w-auto print:rounded-none print:border-0 print:p-0 print:shadow-none" role="dialog" aria-modal="true" aria-labelledby="barcode-print-title">
      <header className="flex items-center justify-between gap-3 [&_span]:text-[10px] [&_span]:font-extrabold [&_span]:tracking-[.12em] [&_span]:text-[#71869a] [&_h2]:mb-0 [&_h2]:mt-1 [&_h2]:text-xl [&_button]:h-9 [&_button]:w-9 [&_button]:cursor-pointer [&_button]:rounded-[9px] [&_button]:border [&_button]:border-[#dce6ef] [&_button]:bg-white [&_button]:text-[22px] [&_button]:text-[#37526b] print:hidden"><div><span>ETIQUETA DE REPUESTO</span><h2 id="barcode-print-title">Imprimir código de barras</h2></div><button type="button" aria-label="Cerrar" onClick={alCerrar}>×</button></header>
      <div className="barcode-print-label grid min-h-[150px] justify-items-center gap-1.5 rounded-xl border border-dashed border-[#b9c8d5] bg-white p-[18px] text-center text-black print:fixed print:inset-0 print:content-center print:gap-[1mm] print:min-h-0 print:rounded-none print:border-0 print:p-0"><strong className="max-w-[40ch] text-sm">{producto.nombre}</strong><CodigoBarras codigo={codigo} /></div>
      <footer className="flex items-center justify-end gap-3 [&_button]:min-h-10 [&_button]:cursor-pointer [&_button]:rounded-[9px] [&_button]:border [&_button]:border-[#d6e0e8] [&_button]:bg-white [&_button]:px-[14px] [&_button]:text-xs [&_button]:font-bold [&_button]:text-[#35516a] [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_button:last-child]:border-[#155b9c] [&_button:last-child]:bg-[#155b9c] [&_button:last-child]:text-white print:hidden"><button type="button" onClick={alCerrar}>Cerrar</button><button type="button" disabled={!patronEan13(codigo)} onClick={() => window.print()}>Imprimir etiqueta</button></footer>
    </section>
  </div>, document.body);
}
