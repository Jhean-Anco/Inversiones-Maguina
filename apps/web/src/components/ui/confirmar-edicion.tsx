import { cloneElement, useRef, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";
import { CircleHelp, Pencil } from "lucide-react";
import { Dialogo } from "./dialogo/dialogo";

export type DialogoConfirmacionProps = {
  titulo: string;
  descripcion: ReactNode;
  etiquetaCancelar: string;
  etiquetaConfirmar: string;
  onCancelar: () => void;
  onConfirmar: () => void;
  icono?: ReactNode;
  iconoAccion?: ReactNode;
};

export function DialogoConfirmacion({ titulo, descripcion, etiquetaCancelar, etiquetaConfirmar, onCancelar, onConfirmar, icono = <Pencil size={19} strokeWidth={2.1} />, iconoAccion = <Pencil size={15} aria-hidden="true" /> }: DialogoConfirmacionProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialogo
      tipo="alerta"
      ancho="sm"
      titulo={titulo}
      kicker={<span className="inline-flex items-center gap-1.5"><CircleHelp size={12} aria-hidden="true" />Confirmación</span>}
      onCerrar={onCancelar}
      enfocarAlAbrir={cancelarRef}
      pie={
        <>
          <button ref={cancelarRef} className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" type="button" onClick={onCancelar}>{etiquetaCancelar}</button>
          <button className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" type="button" onClick={onConfirmar}>{iconoAccion}{etiquetaConfirmar}</button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 flex-none place-items-center rounded-[14px] bg-[#eef4fa] text-[#174b78]" aria-hidden="true">{icono}</span>
        <p className="m-0 text-sm leading-[1.55] text-[#52697d]">{descripcion}</p>
      </div>
    </Dialogo>
  );
}

type BotonEditarConfirmacionProps = {
  children: ReactElement<ButtonHTMLAttributes<HTMLButtonElement>>;
  titulo: string;
  descripcion: string;
  etiquetaCancelar?: string;
  etiquetaConfirmar?: string;
  onConfirmar: () => void;
};

export function BotonEditarConfirmacion({ children, titulo, descripcion, etiquetaCancelar = "Volver al listado", etiquetaConfirmar = "Sí, editar", onConfirmar }: BotonEditarConfirmacionProps) {
  const [abierto, setAbierto] = useState(false);
  const confirmar = () => {
    setAbierto(false);
    onConfirmar();
  };
  return <>
    {cloneElement(children, { onClick: () => setAbierto(true) })}
    {abierto && <DialogoConfirmacion titulo={titulo} descripcion={descripcion} etiquetaCancelar={etiquetaCancelar} etiquetaConfirmar={etiquetaConfirmar} onCancelar={() => setAbierto(false)} onConfirmar={confirmar} />}
  </>;
}
