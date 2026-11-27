import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { FormEvent } from "react";
import type { DocumentoAnulacion } from "./ventas-types";
import { Dialogo } from "../../components/ui/dialogo/dialogo";

type Props = {
  documento: DocumentoAnulacion;
  motivo: string;
  confirmado: boolean;
  error: string;
  guardando: boolean;
  onClose: () => void;
  onMotivo: (value: string) => void;
  onConfirmar: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const ID_FORMULARIO = "ventas-anulacion-form";

export function DialogoAnulacion({ documento, motivo, confirmado, error, guardando, onClose, onMotivo, onConfirmar, onSubmit }: Props) {
  const deshabilitarEnvio = guardando || (!documento.pendiente && (!motivo.trim() || (!documento.interna && !confirmado)));
  const tipoError = error.startsWith("La baja fue aceptada") || error.startsWith("La nota de venta fue anulada") ? "exito" : error.toLocaleLowerCase("es-PE").includes("pendiente") ? "advertencia" : "error";

  return (
    <Dialogo
      kicker={documento.interna ? "ANULACIÓN INTERNA" : "COMUNICACIÓN DE BAJA A SUNAT"}
      titulo={documento.codigo}
      ancho="md"
      cerrable={!guardando}
      onCerrar={onClose}
      pie={
        <button
          form={ID_FORMULARIO}
          type="submit"
          disabled={deshabilitarEnvio}
          className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full"
        >
          {guardando ? "Procesando..." : documento.pendiente ? "Consultar estado con NubeFact" : documento.interna ? "Anular nota de venta" : "Confirmar comunicación de baja"}
        </button>
      }
    >
      <form id={ID_FORMULARIO} className="flex flex-col gap-[18px]" onSubmit={onSubmit}>
        <p className="m-0 text-sm leading-relaxed text-[#27445f]">
          <strong className="text-[#0b2545]">{documento.tipo}</strong> - {documento.interna ? "Es un documento interno: se anula al instante y no se comunica a SUNAT." : "La solicitud se enviará a NubeFact para comunicar la baja a SUNAT. SUNAT puede dejarla pendiente y requerir una consulta posterior."}
        </p>
        <p className="m-0 rounded-xl border border-[#f0d9a6] bg-[#fff8e8] p-3 text-[13px] leading-relaxed text-[#6b4a00]">
          {documento.esNota ? "Al aceptarse la baja, el ajuste de la nota deja de afectar cuentas, saldo por cobrar y reportes." : documento.interna ? "Se revierten sus cobros y regresan al inventario los repuestos y mototaxis vendidos." : "Cuando SUNAT acepte la baja se revierten los cobros y regresan al inventario los repuestos y mototaxis vendidos. Mientras esté pendiente no cambia nada."}
        </p>
        {!documento.pendiente && (
          <label className="flex flex-col gap-1.5 text-xs font-bold text-[#52697d]">
            {documento.interna ? "Motivo de anulación" : "Motivo de baja"}
            <input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42]" required maxLength={100} value={motivo} onChange={(event) => onMotivo(event.target.value)} placeholder={documento.interna ? "Describe por qué se anula" : "Describe por qué se comunica la baja"} />
          </label>
        )}
        {!documento.pendiente && !documento.interna && (
          <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#27445f]">
            <input className="mt-1 h-4 w-4 accent-[#0b2545]" type="checkbox" checked={confirmado} onChange={(event) => onConfirmar(event.target.checked)} />
            Confirmo que el documento no fue entregado al cliente. SUNAT establece un plazo de 7 días calendario desde el día siguiente de su generación.
          </label>
        )}
        {documento.pendiente && <p className="m-0 text-sm text-[#52697d]">La solicitud ya fue enviada. Consulta el resultado antes de intentar otra acción.</p>}
        {error && <NotificacionFlotante tipo={tipoError} mensaje={error} />}
      </form>
    </Dialogo>
  );
}
