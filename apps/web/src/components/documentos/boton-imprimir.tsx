import { useId } from "react";
import { useMenuAccionExclusivo } from "./menu-accion-exclusivo";
import { Printer } from "lucide-react";
import "./boton-imprimir.css";

export function BotonImprimir({ alImprimirA4, alImprimirTicket, etiqueta = "Imprimir documento" }: { alImprimirA4: () => void; alImprimirTicket: () => void; etiqueta?: string }) {
  const id = useId();
  const menu = useMenuAccionExclusivo(`impresion-${id}`);
  const elegir = (accion: () => void) => {
    menu.cerrar();
    accion();
  };

  return <span className="document-print-menu">
    <button type="button" className="erp-icon-action" aria-label={etiqueta} title={etiqueta} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar}>
      <Printer aria-hidden="true" size={16} />
    </button>
    {menu.presente && <span className="document-print-options" data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label="Formato de impresión">
      <button type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir(alImprimirA4)}>A4 a color</button>
      <button type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir(alImprimirTicket)}>Ticket en blanco y negro</button>
    </span>}
  </span>;
}
