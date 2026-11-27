import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialogo } from "./dialogo/dialogo";

type ConfirmarAnulacionProps = {
  titulo: string;
  descripcion: string;
  etiquetaConfirmar: string;
  onCancelar: () => void;
  /** Debe rechazar con el mensaje del servidor si la anulación no procede. */
  onConfirmar: (motivo: string) => Promise<void>;
};

/** Confirmación de una anulación irreversible: exige el motivo y muestra por qué el servidor la rechazó. */
export function ConfirmarAnulacion({ titulo, descripcion, etiquetaConfirmar, onCancelar, onConfirmar }: ConfirmarAnulacionProps) {
  const motivoRef = useRef<HTMLTextAreaElement>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    if (motivo.trim().length < 5) { setError("Indica el motivo de la anulación (mínimo 5 caracteres)."); return; }
    setError(""); setEnviando(true);
    try { await onConfirmar(motivo.trim()); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo anular."); setEnviando(false); }
  }

  return (
    <Dialogo
      tipo="alerta"
      ancho="sm"
      titulo={titulo}
      kicker="Confirmación"
      cerrable={!enviando}
      onCerrar={onCancelar}
      enfocarAlAbrir={motivoRef}
      pie={
        <>
          <button className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" type="button" disabled={enviando} onClick={onCancelar}>Volver</button>
          <button className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" type="submit" form="formulario-anulacion" disabled={enviando}>{enviando ? "Anulando…" : etiquetaConfirmar}</button>
        </>
      }
    >
      <form id="formulario-anulacion" className="grid gap-4" onSubmit={(evento) => void confirmar(evento)}>
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-[#fdf1ee] text-[#b3341f]" aria-hidden="true"><AlertTriangle size={21} strokeWidth={2.1} /></span>
          <p className="m-0 text-sm leading-relaxed text-[#52697d]">{descripcion}</p>
        </div>
        <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Motivo de la anulación
          <textarea ref={motivoRef} className="min-h-[88px] rounded-xl border border-[#c5d1db] p-3 text-sm font-normal" maxLength={500} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} />
        </label>
        {error && <p className="m-0 text-sm font-semibold text-[#b3341f]" role="alert">{error}</p>}
      </form>
    </Dialogo>
  );
}
