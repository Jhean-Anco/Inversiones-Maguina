import { useEffect } from "react";

type ControlDialogo = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
type ValorBorrador = { valor: string; marcado?: boolean };
type Borrador = Record<string, ValorBorrador>;

const prefijoBorrador = "magina:dialogo:";

function huella(texto: string) {
  let valor = 2166136261;
  for (let indice = 0; indice < texto.length; indice += 1) valor = Math.imul(valor ^ texto.charCodeAt(indice), 16777619);
  return (valor >>> 0).toString(36);
}

function controlesDe(formulario: HTMLFormElement) {
  return Array.from(formulario.elements).filter((elemento): elemento is ControlDialogo =>
    elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement || elemento instanceof HTMLTextAreaElement,
  ).filter((elemento) => !["button", "submit", "reset", "file", "password", "hidden"].includes(elemento.type));
}

function claveControl(elemento: ControlDialogo, indice: number) {
  if (elemento.id) return `${elemento.tagName}:${elemento.id}`;
  if (elemento.name) return `${elemento.tagName}:${elemento.name}:${elemento instanceof HTMLInputElement ? `${elemento.type}:${elemento.value}` : ""}`;
  const etiqueta = elemento.closest("label")?.textContent?.replace(elemento.value, "").replace(/\s+/g, " ").trim();
  return `${elemento.tagName}:${etiqueta || "campo"}:${indice}`;
}

function leerBorrador(clave: string): Borrador | null {
  try {
    const valor = sessionStorage.getItem(clave);
    return valor ? JSON.parse(valor) as Borrador : null;
  } catch { return null; }
}

function restaurarControl(elemento: ControlDialogo, valor: ValorBorrador) {
  if (elemento instanceof HTMLInputElement && (elemento.type === "checkbox" || elemento.type === "radio")) {
    const asignar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    asignar?.call(elemento, Boolean(valor.marcado));
    elemento.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  const prototipo = elemento instanceof HTMLInputElement ? HTMLInputElement.prototype : elemento instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLTextAreaElement.prototype;
  const asignar = Object.getOwnPropertyDescriptor(prototipo, "value")?.set;
  asignar?.call(elemento, valor.valor);
  elemento.dispatchEvent(new Event(elemento instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/** Guarda los campos de los diálogos flotantes en la sesión actual y restaura borradores al abrirlos. */
export function useBorradoresDialogos(ruta: string, usuarioId: string | null) {
  useEffect(() => {
    const formularios = new Map<HTMLFormElement, { clave: string; guardar: () => void; enviar: () => void }>();
    const formulariosEnviados = new WeakSet<HTMLFormElement>();
    const claveDe = (dialogo: HTMLElement, formulario: HTMLFormElement) => {
      const titulo = dialogo.getAttribute("aria-labelledby") ?? dialogo.className;
      const entidad = dialogo.querySelector<HTMLElement>("h1, h2, h3")?.textContent?.trim() ?? "formulario";
      const contexto = dialogo.querySelector<HTMLElement>("h1, h2, h3")?.parentElement?.querySelector("p")?.textContent?.trim() ?? "";
      return `${prefijoBorrador}${usuarioId ?? "sesion"}:${ruta}:${titulo}:${huella(`${entidad}:${contexto}`)}:${formulario.className}`;
    };
    const enlazar = () => {
      document.querySelectorAll<HTMLFormElement>("form").forEach((formulario) => {
          const dialogo = formulario.closest<HTMLElement>('[role="dialog"], [class*="backdrop"], .catalog-modal, .moto-modal');
          if (!dialogo || formularios.has(formulario)) return;
          const clave = claveDe(dialogo, formulario);
          const borrador = leerBorrador(clave);
          if (borrador) window.requestAnimationFrame(() => {
            if (!formulario.isConnected) return;
            controlesDe(formulario).forEach((control, indice) => {
              const valor = borrador[claveControl(control, indice)];
              if (valor) restaurarControl(control, valor);
            });
          });
          const guardar = () => {
            formulariosEnviados.delete(formulario);
            const valores: Borrador = {};
            controlesDe(formulario).forEach((control, indice) => {
              valores[claveControl(control, indice)] = {
                valor: control.value,
                ...(control instanceof HTMLInputElement && (control.type === "checkbox" || control.type === "radio") ? { marcado: control.checked } : {}),
              };
            });
            try { sessionStorage.setItem(clave, JSON.stringify(valores)); } catch { /* El formulario sigue funcionando si el navegador bloquea el almacenamiento. */ }
          };
          const enviar = () => {
            formulariosEnviados.add(formulario);
            window.setTimeout(() => {
              if (!formulario.isConnected && !formulario.querySelector('[role="alert"]')) {
                try { sessionStorage.removeItem(clave); } catch { /* El formulario sigue funcionando si el almacenamiento falla. */ }
              }
            }, 1200);
          };
          formulario.addEventListener("input", guardar);
          formulario.addEventListener("change", guardar);
          formulario.addEventListener("submit", enviar);
          formularios.set(formulario, { clave, guardar, enviar });
      });
      for (const [formulario, handlers] of formularios) {
        if (formulario.isConnected) continue;
        if (formulariosEnviados.has(formulario) && !formulario.querySelector('[role="alert"]')) {
          try { sessionStorage.removeItem(handlers.clave); } catch { /* El formulario sigue funcionando si el almacenamiento falla. */ }
        }
        formulario.removeEventListener("input", handlers.guardar);
        formulario.removeEventListener("change", handlers.guardar);
        formulario.removeEventListener("submit", handlers.enviar);
        formularios.delete(formulario);
      }
    };
    const observador = new MutationObserver(enlazar);
    observador.observe(document.body, { childList: true, subtree: true });
    enlazar();
    return () => {
      observador.disconnect();
      for (const [formulario, handlers] of formularios) {
        formulario.removeEventListener("input", handlers.guardar);
        formulario.removeEventListener("change", handlers.guardar);
        formulario.removeEventListener("submit", handlers.enviar);
      }
    };
  }, [ruta, usuarioId]);
}
