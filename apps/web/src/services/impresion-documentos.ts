export type FormatoFisico = "A4" | "TICKET";

export type DatosImpresion = {
  tipo: string;
  codigo: string;
  fecha: string;
  cliente?: string | null;
  documentoCliente?: string | null;
  vehiculo?: string | null;
  fechaAcabado?: string | null;
  vigencia?: string | null;
  estado?: string | null;
  referencia?: string | null;
  motivo?: string | null;
  adelanto?: string | null;
  cuentaAdelanto?: string | null;
  observacion?: string | null;
  lineas?: { descripcion: string; cantidad?: string; precio?: string; total?: string }[];
  total?: string;
};

const escapar = (valor: unknown) => String(valor ?? "").replace(/[&<>"']/g, (caracter) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caracter] ?? caracter);

export function imprimirDocumento(datos: DatosImpresion, formato: FormatoFisico) {
  const ventana = window.open("", "_blank", "popup,width=900,height=900");
  if (!ventana) {
    window.alert("Permite las ventanas emergentes para abrir la impresión.");
    return;
  }
  const ticket = formato === "TICKET";
  const lineas = datos.lineas ?? [];
  const tabla = lineas.length ? `<table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead><tbody>${lineas.map((linea) => `<tr><td>${escapar(linea.descripcion)}</td><td>${escapar(linea.cantidad ?? "1")}</td><td>${escapar(linea.precio ?? "—")}</td><td>${escapar(linea.total ?? "—")}</td></tr>`).join("")}</tbody></table>` : "";
  const metadatos = [datos.documentoCliente ? `<p><b>Documento:</b> ${escapar(datos.documentoCliente)}</p>` : "", datos.vehiculo ? `<p><b>Vehículo:</b> ${escapar(datos.vehiculo)}</p>` : "", datos.fechaAcabado ? `<p><b>Fecha estimada de acabado:</b> ${escapar(datos.fechaAcabado)}</p>` : "", datos.vigencia ? `<p><b>Vigente hasta:</b> ${escapar(datos.vigencia)}</p>` : "", datos.estado ? `<p><b>Estado:</b> ${escapar(datos.estado)}</p>` : "", datos.referencia ? `<p><b>Documento relacionado:</b> ${escapar(datos.referencia)}</p>` : "", datos.motivo ? `<p><b>Motivo:</b> ${escapar(datos.motivo)}</p>` : "", datos.adelanto ? `<p><b>Adelanto recibido:</b> ${escapar(datos.adelanto)}</p>` : "", datos.cuentaAdelanto ? `<p><b>Cuenta del adelanto:</b> ${escapar(datos.cuentaAdelanto)}</p>` : ""].join("");
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapar(datos.tipo)} ${escapar(datos.codigo)}</title><style>@page{size:${ticket ? "80mm 250mm" : "A4 portrait"};margin:${ticket ? "3mm" : "12mm"}}*{box-sizing:border-box}body{font:12px Arial,sans-serif;color:#102d4d;margin:0 auto;width:${ticket ? "72mm" : "100%"};max-width:100%}header{border-bottom:3px solid #df263e;padding:0 0 12px;margin-bottom:16px}header .brand{display:flex;align-items:center;gap:9px;font-size:12px;font-weight:800;letter-spacing:.08em;color:#174b76}.brand img{width:36px;height:36px;object-fit:contain}h1{font-size:${ticket ? "19px" : "24px"};margin:12px 0 5px;color:#123f6a}p{margin:5px 0;line-height:1.4}.code{font-size:18px;font-weight:bold;color:#d9273e}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:${ticket ? "6px 2px" : "9px 6px"};border-bottom:1px solid #d6e0e9;text-align:left;vertical-align:top}th{background:#f1f5f8;text-transform:uppercase;font-size:9px;letter-spacing:.05em}.total{border-top:2px solid #173f68;padding-top:12px;text-align:right;font-size:18px;font-weight:800}.note{border-top:1px solid #d6e0e9;margin-top:20px;padding-top:12px}.footer{margin-top:26px;color:#60768a;font-size:10px}@media print{body{width:${ticket ? "72mm" : "100%"}}}${ticket ? ".ticket,.ticket *{color:#000!important;background-color:#fff!important;border-color:#000!important;box-shadow:none!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.ticket img{filter:grayscale(1)!important}" : ""}</style></head><body class="${ticket ? "ticket" : "a4"}"><header><div class="brand"><img src="/logo.png" alt=""><span>INVERSIONES MAGUIÑA</span></div><h1>${escapar(datos.tipo)}</h1><p class="code">${escapar(datos.codigo)}</p><p>Fecha: ${escapar(datos.fecha)}</p></header>${datos.cliente ? `<p><b>Cliente:</b> ${escapar(datos.cliente)}</p>` : ""}${metadatos}${tabla}${datos.total ? `<p class="total">Total: ${escapar(datos.total)}</p>` : ""}${datos.observacion ? `<p class="note"><b>Observaciones:</b> ${escapar(datos.observacion)}</p>` : ""}<p class="footer">Documento para impresión física · Inversiones Maguiña</p><script>window.addEventListener('load',()=>{window.focus();window.print()})</script></body></html>`);
  ventana.document.close();
}
