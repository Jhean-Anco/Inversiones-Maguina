import { useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialogo } from "./dialogo/dialogo";

type ConfirmarDescarteFormularioProps = {
  elemento: string;
  detalle?: string;
  accion?: string;
  onSeguirEditando: () => void;
  onDescartar: () => void;
};

/** Confirmación común para evitar perder datos al cancelar un formulario. */
export function ConfirmarDescarteFormulario({ elemento, detalle, accion, onSeguirEditando, onDescartar }: ConfirmarDescarteFormularioProps) {
  const seguirEditandoRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialogo
      tipo="alerta"
      ancho="sm"
      titulo={`¿Descartar ${elemento}?`}
      kicker="Confirmación"
      onCerrar={onSeguirEditando}
      enfocarAlAbrir={seguirEditandoRef}
      pie={
        <>
          <button ref={seguirEditandoRef} className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" type="button" onClick={onSeguirEditando}>Seguir editando</button>
          <button className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" type="button" onClick={onDescartar}>{accion ?? `Descartar ${elemento}`}</button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-[#fdf1ee] text-[#b3341f]" aria-hidden="true"><AlertTriangle size={21} strokeWidth={2.1} /></span>
        <p className="m-0 text-sm leading-relaxed text-[#52697d]">{detalle ?? `Si sales ahora, se perderá la información que ingresaste en ${elemento}. ¿Quieres descartarla?`}</p>
      </div>
    </Dialogo>
  );
}
