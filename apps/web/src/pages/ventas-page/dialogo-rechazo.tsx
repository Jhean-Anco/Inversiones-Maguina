import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RotateCcw } from "lucide-react";
import type { VentaListado } from "../../services/ingresos.service";
import { Button } from "../../components/ui/button";
import { Dialogo } from "../../components/ui/dialogo/dialogo";

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

  return (
    <Dialogo
      kicker="ESTADO DEL COMPROBANTE"
      titulo={venta.codigoComprobante}
      ancho="md"
      cerrable={!ocupado}
      onCerrar={onClose}
      pie={
        <>
          <Button disabled={ocupado} onClick={onClose}>Cerrar</Button>
          <Button disabled={ocupado} onClick={onConsultar}>
            {consultando ? "Consultando NubeFact…" : rechazado ? "Actualizar motivo" : "Consultar estado"}
          </Button>
          {rechazado && puedeCrear && (
            <Button disabled={ocupado} onClick={onReintentar}>
              <RotateCcw aria-hidden="true" size={15} />
              {guardando ? "Reintentando emisión…" : "Reintentar emisión"}
            </Button>
          )}
        </>
      }
    >
      <p className="m-0 text-sm leading-relaxed text-[#27445f]">
        <strong className="text-[#0b2545]">{rechazado ? "El comprobante fue rechazado y no tiene validez tributaria." : "NubeFact aún no confirma el resultado de este comprobante."}</strong> Consulta el estado actual en NubeFact. Solo podrás reintentar si el rechazo de SUNAT queda confirmado; si el comprobante sigue pendiente, no lo vuelvas a enviar.
      </p>
      <section className="rounded-xl border border-[#f3cfc7] bg-[#fdf1ee] p-4" aria-label="Detalle del comprobante">
        <span className="text-xs font-bold text-[#8a2a18]">{rechazado ? "Motivo de rechazo devuelto por el proveedor" : "Estado informado por el proveedor"}</span>
        <p className="m-0 mt-1.5 text-sm leading-relaxed text-[#52697d]">{venta.detalleProveedor || "NubeFact no devolvió un detalle. Consulta el estado del comprobante antes de volver a enviarlo."}</p>
      </section>
      <p className="m-0 text-[13px] leading-relaxed text-[#52697d]">
        {rechazado
          ? "El reintento usará los datos guardados en esta venta y el siguiente correlativo electrónico. No volverá a descontar inventario ni a registrar otro cobro."
          : "El comprobante está pendiente de confirmación. Consulta nuevamente más tarde; no se emitirá otro documento ni se modificará inventario o pagos."}
      </p>
      {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo>
  );
}
