import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CircleHelp, Pencil } from "lucide-react";

type ConfirmarEdicionOrdenProps = {
  codigo: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmarEdicionOrden({ codigo, onCancelar, onConfirmar }: ConfirmarEdicionOrdenProps) {
  const dialogoRef = useRef<HTMLElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const onCancelarRef = useRef(onCancelar);
  onCancelarRef.current = onCancelar;

  useEffect(() => {
    const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelarRef.current?.focus();
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onCancelarRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const botones = dialogoRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!botones?.length) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
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
      if (elementoAnterior?.isConnected) elementoAnterior.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[13000] grid place-items-center bg-[#071a2d9c] p-5 backdrop-blur-[3px] mobile-portrait:items-end mobile-portrait:p-0"
      role="presentation"
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onCancelar(); }}
    >
      <section
        ref={dialogoRef}
        className="grid w-[min(460px,100%)] grid-cols-[48px_minmax(0,1fr)] items-start gap-x-4 gap-y-0 rounded-[18px] border border-[#d9e4ed] bg-[linear-gradient(180deg,#ffffff_0%,#fafdff_100%)] p-6 text-[#183b59] shadow-[0_26px_80px_#071a2d45,0_4px_14px_#071a2d12] mobile-portrait:w-full mobile-portrait:rounded-b-none mobile-portrait:rounded-t-[20px] mobile-portrait:p-5"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmar-edicion-orden-titulo"
        aria-describedby="confirmar-edicion-orden-descripcion"
      >
        <span className="grid h-12 w-12 place-items-center rounded-[14px] border border-[#d6e7f3] bg-[linear-gradient(145deg,#f2f8fc,#e6f0f7)] text-[#1c5f8a]" aria-hidden="true"><Pencil size={19} strokeWidth={2.1} /></span>
        <div className="pt-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#dbe7f1] bg-[#f2f7fb] px-2 py-1 text-[10px] font-bold text-[#416783]"><CircleHelp size={12} aria-hidden="true" />Confirmación</span>
          <h2 id="confirmar-edicion-orden-titulo" className="mb-1 mt-2 text-[17px] font-extrabold leading-[1.25] text-[#153b60]">¿Editar esta orden de servicio?</h2>
          <p id="confirmar-edicion-orden-descripcion" className="m-0 text-[13px] leading-[1.55] text-[#657b90]">Vas a abrir <strong className="font-bold text-[#315675]">{codigo}</strong> para revisar sus datos. Los cambios solo se aplicarán cuando pulses “Guardar cambios”.</p>
        </div>
        <footer className="col-span-full mt-6 flex justify-end gap-2.5 mobile-portrait:flex-col-reverse">
          <button ref={cancelarRef} className="min-h-10 rounded-[10px] border border-[#d7e1e9] bg-white px-4 text-[12px] font-bold text-[#47647d] transition-colors hover:bg-[#f4f7fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#85accb] mobile-portrait:w-full" type="button" onClick={onCancelar}>Volver al listado</button>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#174b78] bg-[linear-gradient(145deg,#205d8d,#123f69)] px-4 text-[12px] font-bold text-white shadow-[0_3px_9px_#174b7829,inset_0_1px_0_#ffffff30] transition-[filter,transform,box-shadow] hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#85accb] mobile-portrait:w-full" type="button" onClick={onConfirmar}><Pencil size={15} aria-hidden="true" />Sí, editar orden</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
