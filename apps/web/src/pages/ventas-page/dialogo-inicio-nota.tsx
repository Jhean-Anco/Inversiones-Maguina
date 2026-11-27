import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { DialogoConfirmacion } from "../../components/ui/confirmar-edicion";
import type { NotaRelacionada, VentaListado } from "../../services/ingresos.service";

type Props = {
  venta: VentaListado;
  tipo: NotaRelacionada["tipoComprobante"];
  onCancelar: () => void;
  onContinuar: () => void;
};

export function DialogoInicioNota({ venta, tipo, onCancelar, onContinuar }: Props) {
  const esCredito = tipo === "NOTA_CREDITO";
  const Icono = esCredito ? ArrowDownLeft : ArrowUpRight;
  const nombreNota = esCredito ? "crédito" : "débito";
  const documentoOrigen = venta.tipoComprobante === "BOLETA" ? "Boleta" : "Factura";

  return <DialogoConfirmacion
    titulo={`¿Crear nota de ${nombreNota}?`}
    descripcion={<>
      <span className="mb-3 block rounded-[10px] border border-[#e1eaf1] bg-[#f5f8fb] px-3 py-2 text-[12px] text-[#60778e]">
        {documentoOrigen} de origen <strong className="float-right font-extrabold text-[#173b60]">{venta.codigoComprobante}</strong>
      </span>
      {esCredito
        ? <>Se usará para reducir el precio del comprobante y registrar la devolución desde la cuenta que elijas.</>
        : <>Se usará para aumentar el precio del comprobante y registrar el ingreso de la diferencia en la cuenta que elijas.</>}
      <span className="mt-2 block text-[12px]">Al abrir el formulario todavía podrás revisar los importes. La nota se emitirá e imprimirá al pulsar «Imprimir nota de {nombreNota}».</span>
    </>}
    etiquetaCancelar="Cancelar"
    etiquetaConfirmar="Abrir formulario"
    icono={<Icono size={21} strokeWidth={2.1} />}
    iconoAccion={<ArrowRight size={15} aria-hidden="true" />}
    onCancelar={onCancelar}
    onConfirmar={onContinuar}
  />;
}
