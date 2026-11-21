import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RotateCcw } from "lucide-react";
import { createPortal } from "react-dom";
import type { VentaListado } from "../../services/ingresos.service";
import { Button } from "../../components/ui/button";
import { ventasClasses as c } from "./ventas-classes";

type DialogoRechazoProps = {
  venta: VentaListado;
  error: string;
  guardando: boolean;
  consultando: boolean;
  puedeCrear: boolean;
  onClose: () => void;
  onConsultar: () => void;
  onReintentar: () => void;
};

export function DialogoRechazo({ venta, error, guardando, consultando, puedeCrear, onClose, onConsultar, onReintentar }: DialogoRechazoProps) {
  const ocupado = guardando || consultando;
  const rechazado = venta.estadoProveedor === "RECHAZADO_SUNAT";

  return createPortal((
    <div className={c.modalBackdrop} role="presentation" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget && !ocupado) onClose();
    }}>
      <section className={`${c.modal} ${c.rejectionModal}`} role="dialog" aria-modal="true" aria-labelledby="ventas-rejection-title">
        <header className={c.modalHeader}>
          <div><span>ESTADO DEL COMPROBANTE</span><h2 id="ventas-rejection-title">{venta.codigoComprobante}</h2></div>
          <button type="button" aria-label="Cerrar detalle del comprobante" disabled={ocupado} onClick={onClose}>×</button>
        </header>
        <div className={`${c.modalBody} ${c.rejectionBody}`}>
          <p className={c.rejectionLead}>
            <strong>{rechazado ? "El comprobante fue rechazado y no tiene validez tributaria." : "NubeFact aún no confirma el resultado de este comprobante."}</strong> Consulta el estado actual en NubeFact. Solo podrás reintentar si el rechazo de SUNAT queda confirmado; si el comprobante sigue pendiente, no lo vuelvas a enviar.
          </p>
          <section className={c.rejectionReason} aria-label="Detalle del comprobante">
            <span>{rechazado ? "Motivo de rechazo devuelto por el proveedor" : "Estado informado por el proveedor"}</span>
            <p>{venta.detalleProveedor || "NubeFact no devolvió un detalle. Consulta el estado del comprobante antes de volver a enviarlo."}</p>
          </section>
          <p className={c.rejectionRetry}>
            {rechazado
              ? "El reintento usará los datos guardados en esta venta y el siguiente correlativo electrónico. No volverá a descontar inventario ni a registrar otro cobro."
              : "El comprobante está pendiente de confirmación. Consulta nuevamente más tarde; no se emitirá otro documento ni se modificará inventario o pagos."}
          </p>
          {error && <NotificacionFlotante mensaje={error} />}
          <div className={c.rejectionActions}>
            <Button className={`${c.modalButton} ${c.rejectionActionsMobile}`} disabled={ocupado} onClick={onClose}>Cerrar</Button>
            <Button className={`${c.modalButton} ${c.rejectionActionsMobile}`} disabled={ocupado} onClick={onConsultar}>
              {consultando ? "Consultando NubeFact…" : rechazado ? "Actualizar motivo" : "Consultar estado"}
            </Button>
            {rechazado && puedeCrear && (
              <Button className={`${c.modalButton} ${c.retryButton} ${c.rejectionActionsMobile}`} disabled={ocupado} onClick={onReintentar}>
                <RotateCcw aria-hidden="true" size={15} />
                {guardando ? "Reintentando emisión…" : "Reintentar emisión"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  ), document.body);
}
