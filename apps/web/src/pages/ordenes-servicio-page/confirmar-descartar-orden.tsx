import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";

type ConfirmarDescartarOrdenProps = {
  onSeguirEditando: () => void;
  onDescartar: () => void;
};

export function ConfirmarDescartarOrden({ onSeguirEditando, onDescartar }: ConfirmarDescartarOrdenProps) {
  return <ConfirmarDescarteFormulario elemento="la orden" accion="Descartar orden" onSeguirEditando={onSeguirEditando} onDescartar={onDescartar} />;
}
