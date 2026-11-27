import { altoPaginaMm } from "./ticket-html";

type MarcoImpresion = { marco: HTMLIFrameElement; limpiar: () => void };

function crearMarco(): MarcoImpresion {
  const marco = document.createElement("iframe");
  marco.setAttribute("aria-hidden", "true");
  marco.tabIndex = -1;
  marco.title = "Documento para impresión";
  marco.className = "marco-impresion-oculto";
  marco.setAttribute("style", "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none");
  let respaldo = 0;
  const limpiar = () => { window.clearTimeout(respaldo); marco.remove(); };
  respaldo = window.setTimeout(limpiar, 180_000);
  return { marco, limpiar };
}

function lanzarImpresion(ventana: Window, limpiar: () => void) {
  ventana.addEventListener("afterprint", () => window.setTimeout(limpiar, 500), { once: true });
  ventana.focus();
  ventana.print();
}

/**
 * Imprime HTML con el diálogo del sistema sin abrir pestañas.
 * Para tickets (`anchoMm`), ajusta el alto de página al contenido para no desperdiciar rollo.
 */
export function imprimirHtml(html: string, opciones: { anchoMm?: number } = {}): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const { marco, limpiar } = crearMarco();
    marco.addEventListener("load", () => {
      const ventana = marco.contentWindow;
      const doc = marco.contentDocument;
      if (!ventana || !doc) { limpiar(); rechazar(new Error("No se pudo preparar la vista de impresión.")); return; }
      const lanzar = () => {
        if (opciones.anchoMm) {
          const estilo = doc.createElement("style");
          estilo.textContent = `@page{size:${opciones.anchoMm}mm ${altoPaginaMm(doc.body.scrollHeight)}mm;margin:0}`;
          doc.head.append(estilo);
        }
        lanzarImpresion(ventana, limpiar);
        resolver();
      };
      // Espera a que las fuentes/QR estén listos para medir el alto real.
      void (doc.fonts?.ready ?? Promise.resolve()).then(lanzar, lanzar);
    }, { once: true });
    marco.srcdoc = html;
    document.body.append(marco);
  });
}

/** Abre el documento en una pestaña nueva (respaldo para navegadores que no imprimen PDF embebido). */
export function abrirEnPestana(url: string) {
  // Con "noopener" window.open siempre devuelve null; se corta el vínculo manualmente para detectar bloqueos.
  const ventana = window.open(url, "_blank");
  if (!ventana) throw new Error("El navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.");
  ventana.opener = null;
}

const imprimePdfEmbebido = () => !/^((?!chrome|android).)*safari/i.test(navigator.userAgent) && !/iPad|iPhone|iPod|Android/i.test(navigator.userAgent);

/**
 * Imprime el PDF archivado (mismo origen del API, con sesión) directamente con el diálogo del sistema.
 * Si el navegador no puede imprimir PDF embebido (Safari, móviles) o el PDF es externo, lo abre en una pestaña.
 */
export async function imprimirPdf(url: string, esPropio: boolean): Promise<"impreso" | "abierto"> {
  if (!esPropio || !imprimePdfEmbebido()) { abrirEnPestana(url); return "abierto"; }
  const respuesta = await fetch(url, { credentials: "include" });
  if (!respuesta.ok) throw new Error(`No se pudo descargar el PDF (${respuesta.status}).`);
  const blob = await respuesta.blob();
  const pdf = blob.type === "application/pdf" ? blob : new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
  const enlace = URL.createObjectURL(pdf);
  const { marco, limpiar } = crearMarco();
  const limpiarTodo = () => { limpiar(); URL.revokeObjectURL(enlace); };
  return new Promise((resolver) => {
    marco.addEventListener("load", () => {
      const ventana = marco.contentWindow;
      if (!ventana) { limpiarTodo(); abrirEnPestana(url); resolver("abierto"); return; }
      // El visor de PDF necesita un instante para montar el documento antes de imprimir.
      window.setTimeout(() => {
        try { lanzarImpresion(ventana, limpiarTodo); resolver("impreso"); }
        catch { limpiarTodo(); abrirEnPestana(url); resolver("abierto"); }
      }, 350);
    }, { once: true });
    marco.src = enlace;
    document.body.append(marco);
  });
}
