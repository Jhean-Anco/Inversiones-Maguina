import { useId } from "react";
import { useMenuAccionExclusivo } from "./menu-accion-exclusivo";
import { Printer, ReceiptText, FileText } from "lucide-react";
import { BotonAccion, type TonoAccion } from "../ui/boton-accion";
import { clasesOpcionMenu, clasesOpcionesMenu, claseRetardoOpcionDos, claseRetardoOpcionUno } from "./menu-accion-classes";

export function BotonImprimir({ alImprimirA4, alImprimirTicket, etiqueta = "Imprimir documento", tono = "principal" }: { alImprimirA4: () => void; alImprimirTicket: () => void; etiqueta?: string; tono?: TonoAccion }) {
  const id = useId();
  const menu = useMenuAccionExclusivo(`impresion-${id}`);
  const elegir = (accion: () => void) => {
    menu.cerrar();
    accion();
  };

  return <span ref={menu.raizRef} className="relative inline-flex items-center">
    <BotonAccion etiqueta={etiqueta} tono={tono} icono={<Printer aria-hidden="true" />} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar} />
    {menu.presente && <span className={clasesOpcionesMenu} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label="Formato de impresión">
      <button className={`${clasesOpcionMenu} ${claseRetardoOpcionUno} flex items-center gap-2`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir(alImprimirA4)}><FileText aria-hidden="true" size={16} />A4 a color</button>
      <button className={`${clasesOpcionMenu} ${claseRetardoOpcionDos} flex items-center gap-2`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir(alImprimirTicket)}><ReceiptText aria-hidden="true" size={16} />Ticket en blanco y negro</button>
    </span>}
  </span>;
}
