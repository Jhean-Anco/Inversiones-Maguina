import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

type ConfirmarDescarteFormularioProps = {
  elemento: string;
  detalle?: string;
  accion?: string;
  onSeguirEditando: () => void;
  onDescartar: () => void;
};

/** Confirmación común para evitar perder datos al cancelar un formulario. */
export function ConfirmarDescarteFormulario({ elemento, detalle, accion, onSeguirEditando, onDescartar }: ConfirmarDescarteFormularioProps) {
  const dialogoRef = useRef<HTMLElement>(null);
  const seguirEditandoRef = useRef<HTMLButtonElement>(null);
  const onSeguirEditandoRef = useRef(onSeguirEditando);
  onSeguirEditandoRef.current = onSeguirEditando;

  useEffect(() => {
    const elementoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    seguirEditandoRef.current?.focus();
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        onSeguirEditandoRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const botones = dialogoRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!botones?.length) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    };
    window.addEventListener("keydown", manejarTeclado);
    return () => {
      window.removeEventListener("keydown", manejarTeclado);
      if (elementoAnterior?.isConnected) elementoAnterior.focus();
    };
  }, []);

  const titulo = `¿Descartar ${elemento}?`;
  return createPortal(
    <div className="fixed inset-0 z-[13000] grid place-items-center bg-[#071a2d9c] p-5 backdrop-blur-[3px] mobile-portrait:items-end mobile-portrait:p-0" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onSeguirEditando(); }}>
      <section ref={dialogoRef} className="grid w-[min(575px,100%)] grid-cols-[60px_minmax(0,1fr)] items-start gap-x-5 gap-y-0 rounded-[20px] border border-[#ead9d9] bg-[linear-gradient(180deg,#ffffff_0%,#fffafa_100%)] p-[30px] text-[#183b59] shadow-[0_26px_80px_#071a2d45,0_4px_14px_#071a2d12] mobile-portrait:w-full mobile-portrait:rounded-b-none mobile-portrait:rounded-t-[20px] mobile-portrait:p-5" role="alertdialog" aria-modal="true" aria-labelledby="formulario-descartar-titulo" aria-describedby="formulario-descartar-descripcion">
        <span className="grid h-[60px] w-[60px] place-items-center rounded-[17px] border border-[#f0d7d8] bg-[#fff1f1] text-[#bd2735]" aria-hidden="true"><AlertTriangle size={21} strokeWidth={2.1} /></span>
        <div className="pt-0.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0dfe0] bg-[#fff5f5] px-2.5 py-1 text-[11px] font-bold text-[#a7464e]">Confirmación</span>
          <h2 id="formulario-descartar-titulo" className="mb-1 mt-2 text-[19px] font-extrabold leading-[1.25] text-[#153b60]">{titulo}</h2>
          <p id="formulario-descartar-descripcion" className="m-0 text-[14px] leading-[1.6] text-[#657b90]">{detalle ?? `Si sales ahora, se perderá la información que ingresaste en ${elemento}. ¿Quieres descartarla?`}</p>
        </div>
        <footer className="col-span-full mt-7 flex justify-end gap-3 mobile-portrait:flex-col-reverse">
          <button ref={seguirEditandoRef} className="min-h-[50px] rounded-[12px] border border-[#d7e1e9] bg-white px-5 text-[13px] font-bold text-[#47647d] transition-colors hover:bg-[#f4f7fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#85accb] mobile-portrait:w-full" type="button" onClick={onSeguirEditando}>Seguir editando</button>
          <button className="min-h-[50px] rounded-[12px] border border-[#a91f30] bg-[linear-gradient(145deg,#cf2b3d,#a91f30)] px-5 text-[13px] font-bold text-white shadow-[0_3px_9px_#a91f3029,inset_0_1px_0_#ffffff30] transition-[filter,transform,box-shadow] hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d69ba1] mobile-portrait:w-full" type="button" onClick={onDescartar}>{accion ?? `Descartar ${elemento}`}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
