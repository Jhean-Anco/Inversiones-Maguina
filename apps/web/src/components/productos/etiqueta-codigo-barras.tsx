import { createPortal } from "react-dom";
import type { Producto } from "../../services/inventario/productos.service";
import "./etiqueta-codigo-barras.css";

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
  if (!patron) return <p className="barcode-print-error">El código guardado no tiene formato EAN-13. Edita el repuesto y genera un nuevo código antes de imprimir.</p>;
  const guardas = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  return <svg className="barcode-print-svg" viewBox="0 0 111 76" role="img" aria-label={`Código de barras ${codigo}`}>
    <title>{`Código de barras ${codigo}`}</title>
    {[...patron].flatMap((bit, indice) => bit === "1" ? [<rect key={indice} x={indice + 8} y="0" width="1" height={guardas.has(indice) ? 58 : 48} />] : [])}
    <text x="55.5" y="72" textAnchor="middle">{codigo}</text>
  </svg>;
}

export function EtiquetaCodigoBarras({ producto, alCerrar }: { producto: Producto; alCerrar: () => void }) {
  const codigo = producto.codigos.find((item) => item.tipo === "BARRAS" || item.tipo === "GTIN")?.codigo ?? "";
  return createPortal(<div className="barcode-print-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) alCerrar(); }}>
    <section className="barcode-print-dialog" role="dialog" aria-modal="true" aria-labelledby="barcode-print-title">
      <header><div><span>ETIQUETA DE REPUESTO</span><h2 id="barcode-print-title">Imprimir código de barras</h2></div><button type="button" aria-label="Cerrar" onClick={alCerrar}>×</button></header>
      <div className="barcode-print-label"><strong>{producto.nombre}</strong><CodigoBarras codigo={codigo} /></div>
      <footer><button type="button" onClick={alCerrar}>Cerrar</button><button type="button" disabled={!patronEan13(codigo)} onClick={() => window.print()}>Imprimir etiqueta</button></footer>
    </section>
  </div>, document.body);
}
