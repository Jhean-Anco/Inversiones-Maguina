import type { ReactNode } from "react";
import { Eye, Mail, Phone } from "lucide-react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { clasesOpcionMenu } from "../../components/documentos/menu-accion-classes";
import type { OrdenServicio } from "../../services/ingresos.service";
import { ordenesListadoClasses as c } from "./ordenes-tabla-classes";
import { tonosEstadoOrden } from "./estados-orden";
import { AccionesWhatsAppOrden, MenuMasAccionesOrden } from "./orden-servicio-menu-acciones";
import { anchoMinimoColumnaRelacionClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

type OrdenServicioRowProps = {
  orden: OrdenServicio;
  fecha: string;
  estado: string;
  total: string;
  puedeCrear: boolean;
  menuDocumento: ReactNode;
  formatearFecha: (fecha: string) => string;
  alImprimirA4: () => void;
  alImprimirTicket: () => void;
  alEditar: () => void;
};

const telefonoParaLlamar = (telefono: string) => telefono.trim().replace(/[^+\d]/g, "");

export function OrdenServicioRow({ orden, fecha, estado, total, puedeCrear, menuDocumento, formatearFecha, alImprimirA4, alImprimirTicket, alEditar }: OrdenServicioRowProps) {
  const tono = tonosEstadoOrden[orden.estado];
  const modificable = orden.estado !== "FACTURADA" && orden.estado !== "ANULADA";
  return (
    <tr>
      <td><strong className={`block ${c.documentCode}`}>{orden.codigo}</strong><small className={`block ${c.minorText}`}>Orden de servicio</small></td>
      <td><span className={c.plate}>{orden.vehiculoPlaca || "Sin identificador"}</span></td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[26%]`}><strong className={`block ${c.clientName}`}>{orden.clienteNombre}</strong></td>
      <td className="whitespace-nowrap [font-variant-numeric:tabular-nums]">
        <span className="block text-[#142b42]">{fecha}</span>
        <small className={`block ${c.minorText}`}>{orden.fechaAcabado ? `Entrega ${formatearFecha(orden.fechaAcabado)}` : "Sin fecha de entrega"}</small>
      </td>
      <td><span className={`${c.status} ${tono.caja}`}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{estado}</span></td>
      <td className={`${c.number} ${c.total}`}><strong className="block">{total}</strong></td>
      <td><div className={`${c.rowActions} ordenes-row-actions`}>
        {modificable && <AccionIcono accion="editar" etiqueta={`Editar orden ${orden.codigo}`} confirmacion={{ titulo: "¿Editar esta orden de servicio?", descripcion: `Vas a abrir ${orden.codigo} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`, etiquetaCancelar: "Volver al listado", etiquetaConfirmar: "Sí, editar orden" }} onClick={alEditar} />}
        <BotonImprimir etiqueta={`Imprimir orden ${orden.codigo}`} tono="neutral" alImprimirA4={alImprimirA4} alImprimirTicket={alImprimirTicket} />
        {modificable && puedeCrear && menuDocumento}
        {(orden.clienteTelefono || orden.clienteCorreo || orden.ingresoId) && <MenuMasAccionesOrden>
          {orden.clienteTelefono && <a className={`${clasesOpcionMenu} flex items-center gap-2 text-[12px]`} href={`tel:${telefonoParaLlamar(orden.clienteTelefono)}`} role="menuitem"><Phone aria-hidden="true" size={16} />Llamar</a>}
          {orden.clienteTelefono && <AccionesWhatsAppOrden orden={orden} formatearFecha={formatearFecha} />}
          {orden.clienteCorreo && <a className={`${clasesOpcionMenu} flex items-center gap-2 text-[12px]`} href={`mailto:${orden.clienteCorreo}`} role="menuitem"><Mail aria-hidden="true" size={16} />Enviar correo</a>}
          {orden.ingresoId && <button className={`${clasesOpcionMenu} flex items-center gap-2 text-[12px]`} type="button" role="menuitem" onClick={alEditar}><Eye aria-hidden="true" size={16} />Ver orden emitida</button>}
        </MenuMasAccionesOrden>}
      </div></td>
    </tr>
  );
}
