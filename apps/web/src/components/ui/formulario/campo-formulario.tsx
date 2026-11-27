import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";
import { claseContenedorUnidad, claseControlConUnidad, claseControlFormulario } from "./estilos-formulario";

/** Atributos que el campo entrega al control para asociar etiqueta, ayuda y error. */
export type PropsControlFormulario = {
  id: string;
  className: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type Props = {
  id: string;
  etiqueta: ReactNode;
  requerido?: boolean;
  /** Texto de ayuda breve debajo del control. */
  ayuda?: ReactNode;
  /** Mensaje de validación; marca el control como inválido. */
  error?: string;
  /** Unidad pegada al control, por ejemplo "cc", "kg" o "S/". */
  unidad?: string;
  /** `completo` ocupa todas las columnas de la sección. */
  ancho?: "columna" | "completo";
  children: (control: PropsControlFormulario) => ReactNode;
};

/** Etiqueta, control, ayuda y error con asociaciones accesibles. El control se recibe como función. */
export function CampoFormulario({ id, etiqueta, requerido, ayuda, error, unidad, ancho = "columna", children }: Props) {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describedBy = [error ? idError : null, ayuda ? idAyuda : null].filter(Boolean).join(" ") || undefined;
  const control = children({
    id,
    className: unidad ? claseControlConUnidad : claseControlFormulario,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", ancho === "completo" && "col-span-full")}>
      <label htmlFor={id} className={cn("text-[length:var(--erp-text-sm)] font-semibold text-[var(--erp-ink-muted)]", requerido && "after:ml-0.5 after:text-[var(--erp-accent)] after:content-['*']")}>{etiqueta}</label>
      {unidad ? (
        <div className={claseContenedorUnidad}>
          {control}
          <span className="grid shrink-0 place-items-center border-l border-[var(--erp-border)] bg-[var(--erp-surface-muted)] px-3 text-[length:var(--erp-text-sm)] font-semibold text-[var(--erp-ink-soft)]">{unidad}</span>
        </div>
      ) : control}
      {error && <p id={idError} className="m-0 text-[length:var(--erp-text-sm)] font-medium text-[var(--erp-danger)]">{error}</p>}
      {ayuda && <p id={idAyuda} className="m-0 text-[length:var(--erp-text-sm)] leading-snug text-[var(--erp-ink-soft)]">{ayuda}</p>}
    </div>
  );
}
