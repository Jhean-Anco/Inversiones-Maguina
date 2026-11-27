import { FileText, LoaderCircle, Printer, ReceiptText } from "lucide-react";
import { useId } from "react";
import { documentoDeIngreso, type ObtenerDocumento, type OrigenImpresion } from "../../impresion/servicio-impresion";
import type { FormatoImpresion } from "../../impresion/tipos";
import { useImpresion } from "../../impresion/use-impresion";
import { useMenuAccionExclusivo } from "../documentos/menu-accion-exclusivo";
import { clasesOpcionMenu, clasesOpcionesMenu, claseRetardoOpcionDos, claseRetardoOpcionUno } from "../documentos/menu-accion-classes";
import { BotonAccion, type TonoAccion } from "../ui/boton-accion";
import { useAlertas } from "../ui/notificacion-flotante/notificacion-flotante";

type Props = {
  /** Comprobante de venta o nota: el documento se pide al API. */
  origen?: OrigenImpresion;
  /** Órdenes, cotizaciones, guías y compras: el documento se arma con los datos ya cargados. */
  obtener?: ObtenerDocumento;
  codigo: string;
  etiqueta?: string;
  tono?: TonoAccion;
};

/**
 * Menú único de impresión con dos tamaños: A4 y Ticket (80 mm). La salida (PDF de NubeFact,
 * impresora conectada o diálogo del sistema) se decide sola; ver `servicio-impresion.ts`.
 */
export function MenuImpresion({ origen, obtener, codigo, etiqueta, tono = "principal" }: Props) {
  const alertas = useAlertas();
  const { imprimir, imprimiendo } = useImpresion(alertas);
  const menu = useMenuAccionExclusivo(`impresion-${useId()}`);
  const elegir = (formato: FormatoImpresion) => {
    menu.cerrar();
    const documento = obtener ?? (origen ? documentoDeIngreso(origen) : null);
    if (documento) void imprimir(documento, formato);
  };
  const opcion = `${clasesOpcionMenu} flex w-full items-center gap-2`;

  return <span ref={menu.raizRef} className="relative inline-flex items-center">
    <BotonAccion etiqueta={imprimiendo ? `Imprimiendo ${codigo}…` : etiqueta ?? `Imprimir ${codigo}`} tono={tono} disabled={imprimiendo} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar}
      icono={imprimiendo ? <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <Printer aria-hidden="true" />} />
    {menu.presente && <span className={clasesOpcionesMenu} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label={`Imprimir ${codigo}`}>
      <button className={`${opcion} ${claseRetardoOpcionUno}`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("A4")}><FileText aria-hidden="true" size={16} />A4</button>
      <button className={`${opcion} ${claseRetardoOpcionDos}`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("TICKET")}><ReceiptText aria-hidden="true" size={16} />Ticket</button>
    </span>}
  </span>;
}
