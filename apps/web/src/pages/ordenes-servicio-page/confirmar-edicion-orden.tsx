import { Pencil } from "lucide-react";
import { DialogoConfirmacion } from "../../components/ui/confirmar-edicion";

type ConfirmarEdicionOrdenProps = {
  codigo: string;
  onCancelar: () => void;
  onConfirmar: () => void;
};

export function ConfirmarEdicionOrden({ codigo, onCancelar, onConfirmar }: ConfirmarEdicionOrdenProps) {
  return <DialogoConfirmacion
    titulo="¿Editar esta orden de servicio?"
    descripcion={<>Vas a abrir <strong className="font-bold text-[#315675]">{codigo}</strong> para revisar sus datos. Los cambios solo se aplicarán cuando pulses “Guardar cambios”.</>}
    etiquetaCancelar="Volver al listado"
    etiquetaConfirmar="Sí, editar orden"
    icono={<Pencil size={19} strokeWidth={2.1} />}
    iconoAccion={<Pencil size={15} aria-hidden="true" />}
    onCancelar={onCancelar}
    onConfirmar={onConfirmar}
  />;
}
