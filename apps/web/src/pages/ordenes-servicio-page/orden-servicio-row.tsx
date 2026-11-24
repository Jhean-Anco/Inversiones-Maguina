import type { ReactNode } from "react";
import { Eye, Mail, Phone } from "lucide-react";
import { Etiqueta } from "../../components/ui/etiqueta";
import { AccionIcono } from "../../components/ui/accion-icono";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { clasesOpcionMenu } from "../../components/documentos/menu-accion-classes";
import type { OrdenServicio } from "../../services/ingresos.service";
import { ordenesListadoClasses as c } from "./ordenes-tabla-classes";
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
  return (
    <tr>
      <td className="[font-variant-numeric:tabular-nums] text-[#506b87]">{fecha}</td>
      <td><strong className={`block ${c.documentCode}`}>{orden.codigo}</strong><small className="ordenes-row-caption">Orden de servicio</small></td>
      <td><strong className={`block ${c.clientName}`}>Vehículo</strong><small className={`block ${c.minorText}`}>{orden.vehiculoPlaca || "Sin identificador"}</small></td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}><strong className={`block ${c.clientName}`}>{orden.clienteNombre}</strong></td>
      <td><Etiqueta tono={["COMPLETADA", "FACTURADA"].includes(orden.estado) ? "positiva" : orden.estado === "ANULADA" ? "peligro" : "advertencia"}>{estado}</Etiqueta></td>
      <td className={`${c.number} ${c.total}`}><strong className="block">{total}</strong></td>
      <td><div className={`${c.rowActions} ordenes-row-actions`}>
        {orden.estado !== "FACTURADA" && orden.estado !== "ANULADA" && <AccionIcono accion="editar" etiqueta={`Editar orden ${orden.codigo}`} confirmacion={{ titulo: "¿Editar esta orden de servicio?", descripcion: `Vas a abrir ${orden.codigo} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`, etiquetaCancelar: "Volver al listado", etiquetaConfirmar: "Sí, editar orden" }} onClick={alEditar} />}
        <BotonImprimir etiqueta={`Imprimir orden ${orden.codigo}`} tono="neutral" alImprimirA4={alImprimirA4} alImprimirTicket={alImprimirTicket} />
        {orden.estado !== "FACTURADA" && orden.estado !== "ANULADA" && puedeCrear && menuDocumento}
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
