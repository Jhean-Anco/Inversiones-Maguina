import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { createPortal } from "react-dom";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";

type Props = {
  documento: DocumentoAnulacion;
  motivo: string;
  confirmado: boolean;
  error: string;
  guardando: boolean;
  onClose: () => void;
  onMotivo: (value: string) => void;
  onConfirmar: (value: boolean) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function DialogoAnulacion({ documento, motivo, confirmado, error, guardando, onClose, onMotivo, onConfirmar, onSubmit }: Props) {
  return createPortal(<div className={c.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !guardando) onClose(); }}>
    <section className={`${c.modal} ${c.cancelModal}`} role="dialog" aria-modal="true" aria-labelledby="ventas-cancel-title">
      <header className={c.modalHeader}><div><span>COMUNICACION DE BAJA A SUNAT</span><h2 id="ventas-cancel-title">{documento.codigo}</h2></div><button type="button" aria-label="Cerrar" disabled={guardando} onClick={onClose}>X</button></header>
      <div className={c.modalBody}><p><strong>{documento.tipo}</strong> - La solicitud se enviara a NubeFact para comunicar la baja a SUNAT. SUNAT puede dejarla pendiente y requerir una consulta posterior.</p>
        <p className={c.cancelWarning}>Esta accion solo anula el documento tributario. No revierte cobros, pagos ni movimientos de inventario.</p>
        {!documento.pendiente && <label className={c.cancelReason}>Motivo de baja<input required maxLength={100} value={motivo} onChange={(event) => onMotivo(event.target.value)} placeholder="Describe por que se comunica la baja" /></label>}
        {!documento.pendiente && <label className={c.cancelConfirm}><input type="checkbox" checked={confirmado} onChange={(event) => onConfirmar(event.target.checked)} /> Confirmo que el documento no fue entregado al cliente. SUNAT establece un plazo de 7 dias calendario desde el dia siguiente de su generacion.</label>}
        {documento.pendiente && <p>La solicitud ya fue enviada. Consulta el resultado antes de intentar otra accion.</p>}
        {error && <NotificacionFlotante tipo={error.startsWith("La baja fue aceptada") ? "exito" : error.toLocaleLowerCase("es-PE").includes("pendiente") ? "advertencia" : "error"} mensaje={error} />}
        <form className="mt-5 grid gap-[11px] pt-1" onSubmit={onSubmit}><button className={`${c.modalButton} ${c.cancelButton} min-h-[42px] justify-self-end`} type="submit" disabled={guardando || (!documento.pendiente && (!motivo.trim() || !confirmado))}>{guardando ? "Procesando..." : documento.pendiente ? "Consultar estado con NubeFact" : "Confirmar comunicacion de baja"}</button></form>
      </div>
    </section>
  </div>, document.body);
}
