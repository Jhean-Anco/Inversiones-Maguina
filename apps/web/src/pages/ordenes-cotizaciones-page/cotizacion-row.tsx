import { FileOutput, FilePlus2, FileText, ReceiptText } from "lucide-react";
import { useId } from "react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { BotonAccion } from "../../components/ui/boton-accion";
import { IconoWhatsApp } from "../../components/ui/icono-whatsapp";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import type { ObtenerDocumento } from "../../impresion/servicio-impresion";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import type { Cotizacion } from "../../services/ingresos.service";
import { calcularTotalesCotizacion } from "./gestion-utils";
import { cotizacionesListadoClasses as c } from "./cotizaciones-tabla-classes";
import { etiquetasEstadoCotizacion, grupoEstado, tonosEstadoCotizacion } from "./estados-cotizacion";
import type { EstadoVisibleCotizacion } from "./use-gestion-listado";
import { clasesOpcionMenu, clasesOpcionesMenu, claseRetardoOpcionDos, claseRetardoOpcionUno } from "../../components/documentos/menu-accion-classes";

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const formatoFecha = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short", timeZone: "UTC" });
function fechaBreve(valor: string) {
  const fecha = new Date(`${valor.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? valor : formatoFecha.format(fecha).replace(/\.$/, "");
}

/** Detalle mostrado al pasar el cursor sobre la píldora de estado. */
const detalleEstado: Record<EstadoVisibleCotizacion, string> = { ACTIVA: "Vigente", EMITIDA: "Documento emitido", INACTIVA: "Vencida o anulada" };

type CotizacionRowProps = {
  cotizacion: Cotizacion;
  estado: EstadoVisibleCotizacion;
  mensajeWhatsApp: string;
  mostrarMenuDocumento: boolean;
  documentoPendiente: boolean;
  documentoImprimible: ObtenerDocumento;
  onPrepararDocumento: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void;
  puedeEditar: boolean;
  onEditar: () => void;
};

function SelectorDocumentoCotizacion({ cotizacion, inactiva, alPreparar }: { cotizacion: Cotizacion; inactiva: boolean; alPreparar: (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => void }) {
  const menu = useMenuAccionExclusivo(`documento-cotizacion-${useId()}`);
  const elegir = (tipo: "BOLETA" | "FACTURA" | "NOTA_VENTA") => { menu.cerrar(); alPreparar(tipo); };
  const opcion = `${clasesOpcionMenu} flex items-center gap-2`;
  return <span ref={menu.raizRef} className="relative inline-flex items-center">
    <BotonAccion etiqueta={inactiva ? "La cotización está vencida o anulada" : `Emitir documento de ${cotizacion.codigo}`} tono="positiva" icono={<FileOutput aria-hidden="true" />} disabled={inactiva} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar} />
    {menu.presente && <span className={clasesOpcionesMenu} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label={`Tipo de documento para ${cotizacion.codigo}`}>
      <button className={`${opcion} ${claseRetardoOpcionUno}`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("BOLETA")}><ReceiptText aria-hidden="true" size={16}/>Boleta de venta</button>
      <button className={`${opcion} ${claseRetardoOpcionDos}`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("FACTURA")}><FileText aria-hidden="true" size={16}/>Factura</button>
      <button className={`${opcion} data-[menu-state=abriendo]:[animation-delay:70ms] data-[menu-state=cerrando]:[animation-delay:0ms]`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir("NOTA_VENTA")}><FilePlus2 aria-hidden="true" size={16}/>Nota de venta</button>
    </span>}
  </span>;
}

export function CotizacionRow({ cotizacion, estado, mensajeWhatsApp, mostrarMenuDocumento, documentoPendiente, documentoImprimible, onPrepararDocumento, puedeEditar, onEditar }: CotizacionRowProps) {
  const grupo = grupoEstado(estado);
  const tono = tonosEstadoCotizacion[grupo];
  return <tr>
    <td><strong className={`block ${c.documentCode}`}>{cotizacion.codigo}</strong><small className={`block ${c.minorText}`}>Cotización</small></td>
    <td className="w-[30%]"><strong className={`block ${c.clientName}`}>{cotizacion.clienteNombre || "Clientes varios"}</strong></td>
    <td className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
      <span className="block text-[#142b42]">{fechaBreve(cotizacion.fecha)}</span>
      <small className={`block ${c.minorText}`}>{cotizacion.vigenteHasta ? `Vigente hasta ${fechaBreve(cotizacion.vigenteHasta)}` : "Sin fecha de vigencia"}</small>
    </td>
    <td>
      <span className={`${c.status} ${tono.caja}`} title={detalleEstado[estado]}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{etiquetasEstadoCotizacion[grupo]}</span>
      {documentoPendiente && <small className={`block ${c.pending}`}>Documento pendiente</small>}
    </td>
    <td className={`${c.number} ${c.total}`}><strong className="block">{formatoSoles.format(calcularTotalesCotizacion(cotizacion.detalles, cotizacion.aplicaIgv).total)}</strong></td>
    <td className="whitespace-nowrap"><div className={c.rowActions}>
      {puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar cotización ${cotizacion.codigo}`} confirmacion={{ titulo: "¿Editar esta cotización?", descripcion: `Vas a abrir ${cotizacion.codigo} para revisar sus datos. Los cambios se aplicarán al guardarlos.`, etiquetaCancelar: "Volver al listado", etiquetaConfirmar: "Sí, editar cotización" }} onClick={onEditar} />}
      <MenuImpresion codigo={cotizacion.codigo} etiqueta={`Imprimir cotización ${cotizacion.codigo}`} tono="neutral" obtener={documentoImprimible} />
      <BotonAccion etiqueta={`Enviar cotización ${cotizacion.codigo} por WhatsApp`} tono="positiva" icono={<IconoWhatsApp size={16} />} href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`} target="_blank" rel="noreferrer" />
      {mostrarMenuDocumento && <SelectorDocumentoCotizacion cotizacion={cotizacion} inactiva={estado === "INACTIVA"} alPreparar={onPrepararDocumento}/>}    </div></td>
  </tr>;
}
