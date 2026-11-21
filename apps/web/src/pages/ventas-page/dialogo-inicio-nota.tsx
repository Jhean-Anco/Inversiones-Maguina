import { useEffect, useId, useRef } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import type { NotaRelacionada, VentaListado } from "../../services/ingresos.service";
import "./nota-ajuste.css";

type Props = {
  venta: VentaListado;
  tipo: NotaRelacionada["tipoComprobante"];
  onCancelar: () => void;
  onContinuar: () => void;
};

export function DialogoInicioNota({ venta, tipo, onCancelar, onContinuar }: Props) {
  const dialogoRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const esCredito = tipo === "NOTA_CREDITO";
  const Icono = esCredito ? ArrowDownLeft : ArrowUpRight;

  useEffect(() => {
    const dialogo = dialogoRef.current;
    dialogo?.showModal();
    return () => dialogo?.close();
  }, []);

  function cerrar(accion: () => void) {
    dialogoRef.current?.close();
    accion();
  }

  return (
    <dialog
      ref={dialogoRef}
      className="nota-inicio"
      data-tipo={esCredito ? "credito" : "debito"}
      aria-labelledby={`${id}-titulo`}
      aria-describedby={`${id}-uso ${id}-emision`}
      onCancel={(evento) => { evento.preventDefault(); cerrar(onCancelar); }}
    >
      <header className="nota-inicio-cabecera">
        <span className="nota-tipo-icono"><Icono size={22} aria-hidden="true" /></span>
        <h2 id={`${id}-titulo`}>Crear nota de {esCredito ? "crédito" : "débito"}</h2>
      </header>
      <div className="nota-inicio-contenido">
        <div className="nota-inicio-origen">
          <span>{venta.tipoComprobante === "BOLETA" ? "Boleta" : "Factura"} de origen</span>
          <strong>{venta.codigoComprobante}</strong>
        </div>
        <p id={`${id}-uso`}>
          {esCredito
            ? "Úsala para reducir el precio de uno o más ítems del comprobante. Indicarás el descuento y la cuenta desde la que se devuelve la diferencia."
            : "Úsala para aumentar el precio de uno o más ítems del comprobante. Indicarás el aumento y la cuenta en la que ingresa la diferencia."}
        </p>
        <p id={`${id}-emision`} className="nota-inicio-aclaracion">La nota se emitirá al completar el formulario y pulsar Continuar.</p>
      </div>
      <footer className="nota-acciones">
        <button className="nota-boton" type="button" autoFocus onClick={() => cerrar(onCancelar)}>Cancelar</button>
        <button className="nota-boton nota-boton-primario" type="button" onClick={() => cerrar(onContinuar)}>
          Abrir formulario <ArrowRight size={17} aria-hidden="true" />
        </button>
      </footer>
    </dialog>
  );
}
