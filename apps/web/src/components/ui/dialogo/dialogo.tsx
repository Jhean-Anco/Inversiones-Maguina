import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type AnchoDialogo = "sm" | "md" | "lg";

type DialogoProps = {
  /** Título visible y nombre accesible del diálogo. */
  titulo: string;
  /** Texto pequeño en mayúsculas encima del título, por ejemplo "COMPRA DE REPUESTOS". */
  kicker?: ReactNode;
  children: ReactNode;
  /** Botones del pie, normalmente cancelar y acción principal. */
  pie?: ReactNode;
  onCerrar: () => void;
  /** `false` impide cerrar con Escape, fondo o botón X (p. ej. mientras se guarda). */
  cerrable?: boolean;
  /** `alerta` usa `role="alertdialog"` para confirmaciones. */
  tipo?: "dialogo" | "alerta";
  ancho?: AnchoDialogo;
  /** Elemento que recibe el foco al abrir. Si no se indica, se usa el primer control enfocable. */
  enfocarAlAbrir?: RefObject<HTMLElement | null>;
  /** Clases extra para el contenedor del diálogo (p. ej. un borde de color). */
  className?: string;
  /** Icono o logo a la izquierda del título. */
  icono?: ReactNode;
  /** Texto debajo del título (p. ej. nombre de un artículo y su código). */
  subtitulo?: ReactNode;
};

const anchos: Record<AnchoDialogo, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[640px]",
  lg: "max-w-[760px]",
};

/** Diálogos abiertos, del más antiguo al más reciente. Solo el de arriba responde a Escape y a Tab. */
const pilaDialogos: string[] = [];

const SELECTOR_ENFOCABLE = "a[href], button:not(:disabled), input:not(:disabled):not([type=hidden]), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";

/**
 * Diálogo modal común. Se renderiza en `document.body`, mueve el foco dentro,
 * atrapa Tab y devuelve el foco al elemento anterior al cerrarse.
 * En escritorio aparece centrado; en pantallas pequeñas se convierte en hoja inferior.
 */
export function Dialogo({ titulo, kicker, children, pie, onCerrar, cerrable = true, tipo = "dialogo", ancho = "md", enfocarAlAbrir, className = "", icono, subtitulo }: DialogoProps) {
  const idTitulo = useId();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;
  const cerrableRef = useRef(cerrable);
  cerrableRef.current = cerrable;

  useEffect(() => {
    pilaDialogos.push(idTitulo);
    const esElTope = () => pilaDialogos[pilaDialogos.length - 1] === idTitulo;
    const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const contenedor = contenedorRef.current;
    const enfocables = () => Array.from(contenedor?.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLE) ?? []).filter((el) => el.getClientRects().length > 0);
    (enfocarAlAbrir?.current ?? enfocables()[0])?.focus();

    const manejarTeclado = (evento: KeyboardEvent) => {
      if (!esElTope()) return;
      if (evento.key === "Escape") {
        if (!cerrableRef.current) return;
        evento.preventDefault();
        onCerrarRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const lista = enfocables();
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    window.addEventListener("keydown", manejarTeclado);
    return () => {
      window.removeEventListener("keydown", manejarTeclado);
      const posicion = pilaDialogos.indexOf(idTitulo);
      if (posicion >= 0) pilaDialogos.splice(posicion, 1);
      if (elementoAnterior?.isConnected) elementoAnterior.focus();
    };
  }, [enfocarAlAbrir, idTitulo]);

  const cerrarSiPermitido = () => {
    if (cerrableRef.current) onCerrarRef.current();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,25,46,0.55)] p-6 max-sm:items-end max-sm:p-0"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) cerrarSiPermitido();
      }}
    >
      <div
        ref={contenedorRef}
        role={tipo === "alerta" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`flex max-h-full w-full ${anchos[ancho]} flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(6,23,43,0.35)] max-sm:max-h-[88%] max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[20px] ${className}`}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-sm bg-[#c5d1db]" />
        </div>
        <header className="flex items-start justify-between gap-4 border-b border-[#dbe3e9] px-6 pb-[18px] pt-[22px] max-sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            {icono}
            <div className="min-w-0">
              {kicker && <span className="block text-[11px] font-bold tracking-[0.08em] text-[#52697d]">{kicker}</span>}
              <h2 id={idTitulo} className="m-0 mt-1 text-xl font-extrabold text-[#0b2545]">{titulo}</h2>
              {subtitulo && <div className="mt-1 text-sm text-[#52697d]">{subtitulo}</div>}
            </div>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            disabled={!cerrable}
            onClick={cerrarSiPermitido}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#dbe3e9] bg-white text-[#27445f] disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-6 py-5 max-sm:px-5">{children}</div>
        {pie && (
          <footer className="flex flex-wrap justify-end gap-2.5 border-t border-[#dbe3e9] bg-[#f7f9fb] px-6 py-4 max-sm:flex-col-reverse max-sm:px-5 max-sm:pb-[18px]">
            {pie}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
