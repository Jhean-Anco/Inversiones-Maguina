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
const formatoFecha = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" });
function fechaBreve(valor: string) {
  const fecha = new Date(`${valor.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? valor : formatoFecha.format(fecha).replace(/\.$/, "");
}

type EstadoVisibleCotizacion = "EMITIDA" | "INACTIVA" | "ACTIVA";
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
  return <tr className={cotizacionClases.tableRow}>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.code}`}><strong>{cotizacion.codigo}</strong><small className="cotizacion-subtitulo">Cotización</small></td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.actionHeader} ${cotizacionClases.columnClient} ${cotizacionClases.client}`}><strong className={nombreRelacionListadoClasses}>{cotizacion.clienteNombre || "Sin cliente"}</strong></td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.actionHeader} ${cotizacionClases.columnValidity} whitespace-nowrap`} title={`${cotizacion.fecha} → ${cotizacion.vigenteHasta ?? "Sin fecha"}`}>{fechaBreve(cotizacion.fecha)} → {cotizacion.vigenteHasta ? fechaBreve(cotizacion.vigenteHasta) : "Sin fecha"}</td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.actionHeader}`}><Etiqueta tono={estado === "EMITIDA" ? "informativa" : estado === "INACTIVA" ? "neutral" : "positiva"}>{estado === "EMITIDA" ? "Emitida" : estado === "INACTIVA" ? "Inactiva" : "Activa"}</Etiqueta></td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.columnTotal}`}>
      <strong className="cotizacion-total">{formatoSoles.format(calcularTotalesCotizacion(cotizacion.detalles, cotizacion.aplicaIgv).total)}</strong>
    </td>
    <td className={`${cotizacionClases.tableCell} ${cotizacionClases.actionHeader}`}><div className={cotizacionClases.actions}>
      {puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar cotización ${cotizacion.codigo}`} confirmacion={{ titulo: "¿Editar esta cotización?", descripcion: `Vas a abrir ${cotizacion.codigo} para revisar sus datos. Los cambios se aplicarán al guardarlos.`, etiquetaCancelar: "Volver al listado", etiquetaConfirmar: "Sí, editar cotización" }} onClick={onEditar} />}
      <BotonImprimir etiqueta={`Imprimir cotización ${cotizacion.codigo}`} tono="neutral" alImprimirA4={onImprimirA4} alImprimirTicket={onImprimirTicket} />
      <a className={clasesBotonAccion("positiva")} href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`} target="_blank" rel="noreferrer" title={`Enviar cotización ${cotizacion.codigo} por WhatsApp`} aria-label={`Enviar cotización ${cotizacion.codigo} por WhatsApp`}><IconoWhatsApp size={17}/></a>
      {mostrarMenuDocumento && <SelectorDocumentoCotizacion cotizacion={cotizacion} inactiva={estado === "INACTIVA"} alPreparar={onPrepararDocumento}/>}
      {documentoPendiente && <Etiqueta compacta tono="advertencia">Documento pendiente de confirmación</Etiqueta>}
    </div></td>
  </tr>;
}
