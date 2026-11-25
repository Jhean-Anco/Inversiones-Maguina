import { FileOutput, FilePlus2, FileText, ReceiptText } from "lucide-react";
import { useId } from "react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { Etiqueta } from "../../components/ui/etiqueta";
import { clasesBotonAccion } from "../../components/ui/boton-accion";
import { IconoWhatsApp } from "../../components/ui/icono-whatsapp";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import type { Cotizacion } from "../../services/ingresos.service";
import { cotizacionClases } from "./cotizacion-clases";
import { calcularTotalesCotizacion } from "./gestion-utils";
import { nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";
import { clasesOpcionMenu, claseRetardoOpcionDos, claseRetardoOpcionUno } from "../../components/documentos/menu-accion-classes";

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });

type EstadoVisibleCotizacion = "EMITIDA" | "INACTIVA" | "ACTIVA";

/** Cada estado tiene texto y punto propios; el texto distingue el estado aunque no se perciba el color. */
const tonosEstadoCotizacion: Record<EstadoVisibleCotizacion, { etiqueta: string; caja: string; punto: string }> = {
  ACTIVA: { etiqueta: "Activa", caja: "border-[#c9e3d4] bg-[#edf7f1] text-[#24734e]", punto: "bg-[#2e9467]" },
  EMITIDA: { etiqueta: "Emitida", caja: "border-[#c7d9ea] bg-[#edf4fa] text-[#174b78]", punto: "bg-[#174b78]" },
  INACTIVA: { etiqueta: "Inactiva", caja: "border-[#d5dde5] bg-[#f1f4f7] text-[#52697d]", punto: "bg-[#8497a8]" },
};

type CotizacionRowProps = {
  cotizacion: Cotizacion;
  estado: EstadoVisibleCotizacion;
  mensajeWhatsApp: string;
  mostrarMenuDocumento: boolean;
  documentoPendiente: boolean;
  onImprimirA4: () => void;
  onImprimirTicket: () => void;
  onPrepararDocumento: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeEditar: boolean;
  onEditar: () => void;
};

function SelectorDocumentoCotizacion({ cotizacion, inactiva, alPreparar }: { cotizacion: Cotizacion; inactiva: boolean; alPreparar: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void }) {
  const menu = useMenuAccionExclusivo(`documento-cotizacion-${useId()}`);
  const elegir = (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => { menu.cerrar(); alPreparar(tipo); };
  const opcion = `${clasesOpcionMenu} flex min-h-[34px] items-center gap-2 !m-0 !rounded-none !border-0 !bg-transparent !px-[10px] !text-xs !font-normal !text-[#244562] hover:!bg-[#eef4f9] hover:!text-[#174b80] disabled:!cursor-not-allowed disabled:!opacity-50`;
  return <span ref={menu.raizRef} className="relative inline-flex flex-[0_0_36px]">
    <button type="button" className={clasesBotonAccion("positiva")} title={`Preparar documento de ${cotizacion.codigo}`} aria-label={`Preparar documento de ${cotizacion.codigo}`} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar}><FileOutput aria-hidden="true" size={17}/></button>
    {menu.presente && <div className={`${cotizacionClases.documentOptions} ${menu.fase === "cerrando" ? "pointer-events-none" : ""}`} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label={`Tipo de documento para ${cotizacion.codigo}`}>
      <button className={`${opcion} ${claseRetardoOpcionUno}`} type="button" role="menuitem" disabled={inactiva || !menu.abierto} onClick={() => elegir("FACTURA")}><FileText aria-hidden="true" size={16}/>Factura</button>
      <button className={`${opcion} ${claseRetardoOpcionDos}`} type="button" role="menuitem" disabled={inactiva || !menu.abierto} onClick={() => elegir("BOLETA")}><ReceiptText aria-hidden="true" size={16}/>Boleta de venta</button>
      <button className={opcion} type="button" role="menuitem" disabled={inactiva || !menu.abierto} onClick={() => elegir("NOTA_VENTA")}><FilePlus2 aria-hidden="true" size={16}/>Nota de venta</button>
    </div>}
  </span>;
}

export function CotizacionRow({ cotizacion, estado, mensajeWhatsApp, mostrarMenuDocumento, documentoPendiente, onImprimirA4, onImprimirTicket, onPrepararDocumento, puedeEditar, onEditar }: CotizacionRowProps) {
  const tono = tonosEstadoCotizacion[estado];
  return <tr className={cotizacionClases.tableRow}>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.code}`}>
      <strong className={cotizacionClases.documentCode}>{cotizacion.codigo}</strong>
      <span className={cotizacionClases.minorText}>Cotización</span>
    </td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.client}`}><strong className={`${nombreRelacionListadoClasses} max-w-[280px]`}>{cotizacion.clienteNombre || "Sin cliente"}</strong></td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.columnDates}`}><span className="whitespace-nowrap [font-variant-numeric:tabular-nums]">{cotizacion.fecha} → {cotizacion.vigenteHasta ?? "Sin fecha"}</span></td>
    <td className={cotizacionClases.tableCell}><span className={`${cotizacionClases.statusPill} ${tono.caja}`}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{tono.etiqueta}</span></td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.columnTotal} text-right`}>
      <strong className="cotizacion-total">{formatoSoles.format(calcularTotalesCotizacion(cotizacion.detalles, cotizacion.aplicaIgv).total)}</strong>
    </td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.actionHeader}`}><div className={cotizacionClases.actions}>
      {puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar cotización ${cotizacion.codigo}`} onClick={onEditar} />}
      <BotonImprimir etiqueta={`Imprimir cotización ${cotizacion.codigo}`} tono="neutral" alImprimirA4={onImprimirA4} alImprimirTicket={onImprimirTicket} />
      <a className={clasesBotonAccion("positiva")} href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`} target="_blank" rel="noreferrer" title={`Enviar cotización ${cotizacion.codigo} por WhatsApp`} aria-label={`Enviar cotización ${cotizacion.codigo} por WhatsApp`}><IconoWhatsApp size={17}/></a>
      {mostrarMenuDocumento && <SelectorDocumentoCotizacion cotizacion={cotizacion} inactiva={estado === "INACTIVA"} alPreparar={onPrepararDocumento}/>}
      {documentoPendiente && <Etiqueta compacta tono="advertencia">Documento pendiente de confirmación</Etiqueta>}
    </div></td>
  </tr>;
}
