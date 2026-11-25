import { useEffect, useId, type ReactNode } from "react";

export type AnchoDialogo = "sm" | "md" | "lg";

type DialogoProps = {
  /** Título visible y nombre accesible del diálogo. */
  titulo: string;
  /** Texto pequeño en mayúsculas encima del título, por ejemplo "COMPRA DE REPUESTOS". */
  kicker?: string;
  children: ReactNode;
  /** Botones del pie, normalmente cancelar y acción principal. */
  pie?: ReactNode;
  onCerrar: () => void;
  /** `alerta` usa `role="alertdialog"` para confirmaciones destructivas. */
  tipo?: "dialogo" | "alerta";
  ancho?: AnchoDialogo;
};

const anchos: Record<AnchoDialogo, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[640px]",
  lg: "max-w-[760px]",
};

/**
 * Diálogo modal común. En escritorio aparece centrado; en pantallas pequeñas
 * se convierte en una hoja inferior (ver clases `max-sm:`).
 * Se cierra con Escape y al pulsar el fondo.
 */
export function Dialogo({ titulo, kicker, children, pie, onCerrar, tipo = "dialogo", ancho = "md" }: DialogoProps) {
  const idTitulo = useId();

  useEffect(() => {
    const alPresionarEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alPresionarEscape);
    return () => window.removeEventListener("keydown", alPresionarEscape);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,25,46,0.55)] p-6 max-sm:items-end max-sm:p-0"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        role={tipo === "alerta" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`flex max-h-full w-full ${anchos[ancho]} flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(6,23,43,0.35)] max-sm:max-h-[88%] max-sm:max-w-none max-sm:rounded-b-none max-sm:rounded-t-[20px]`}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-sm bg-[#c5d1db]" />
        </div>
        <header className="flex items-start justify-between gap-4 border-b border-[#dbe3e9] px-6 pb-[18px] pt-[22px] max-sm:px-5">
          <div className="min-w-0">
            {kicker && <span className="block text-[11px] font-bold tracking-[0.08em] text-[#52697d]">{kicker}</span>}
            <h2 id={idTitulo} className="m-0 mt-1 text-xl font-extrabold text-[#0b2545]">{titulo}</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrar}
            className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[#dbe3e9] bg-white text-[#27445f]"
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
    </div>
  );
}
