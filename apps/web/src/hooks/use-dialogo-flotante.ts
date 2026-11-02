import { useEffect, useRef, type RefObject } from "react";

/** Gestiona foco, Escape y scroll de fondo para diálogos flotantes. */
export function useDialogoFlotante<T extends HTMLElement>(referencia: RefObject<T | null>, abierto: boolean, cerrar: () => void) {
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;

  useEffect(() => {
    if (!abierto) return;
    const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialogo = referencia.current;
    window.requestAnimationFrame(() => dialogo?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])')?.focus());

    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarRef.current();
      if (evento.key !== "Tab" || !dialogo) return;
      const elementos = Array.from(dialogo.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter((elemento) => elemento.offsetParent !== null);
      if (!elementos.length) return;
      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    };
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener("keydown", alPresionarTecla);
      elementoAnterior?.focus();
    };
  }, [abierto, referencia]);
}
