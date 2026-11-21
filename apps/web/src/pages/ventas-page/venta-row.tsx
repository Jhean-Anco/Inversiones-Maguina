import { Ban, MoreVertical, RefreshCw } from "lucide-react";
import { useId } from "react";
import { clasesOpcionMenu, clasesOpcionesMenu } from "../../components/documentos/menu-accion-classes";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import { DesgloseImportes } from "../../components/ingresos/desglose-importes";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Etiqueta } from "../../components/ui/etiqueta";
import type { VentaListado } from "../../services/ingresos.service";
import { DocumentoEnlaces } from "./documento-enlaces";
import { comprobante, estadoSunat, fecha, medioPago } from "./ventas-formatters";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";
import { anchoMinimoColumnaRelacionClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

type VentaRowProps = {
  venta: VentaListado;
  puedeEmitirNotas: boolean;
  puedeAnular: boolean;
  onConsultarEstado: (venta: VentaListado) => void;
  onEmitirNota: (venta: VentaListado, tipo: "NOTA_CREDITO" | "NOTA_DEBITO") => void;
  onAnular: (documento: DocumentoAnulacion) => void;
};

export function VentaRow({ venta, puedeEmitirNotas, puedeAnular, onConsultarEstado, onEmitirNota, onAnular }: VentaRowProps) {
  const estadoFiscal = estadoSunat(venta);
  const menu = useMenuAccionExclusivo(`mas-venta-${useId()}`);
  const puedeConsultar = ["RECHAZADO_SUNAT", "PENDIENTE_CONFIRMACION", "EN_PROCESO", "ERROR_SUNAT", "ERROR_NUBEFACT", "ERROR_EMISION", "NUBEFACT_PENDIENTE"].includes(venta.estadoProveedor);
  const puedeEmitirNota = puedeEmitirNotas && venta.estado === "EMITIDO" && venta.tipoComprobante !== "NOTA_VENTA";
  const puedeAnularVenta = puedeAnular && venta.tipoComprobante !== "NOTA_VENTA" && (venta.estado === "ANULACION_PENDIENTE" || (venta.estado === "EMITIDO" && venta.estadoProveedor === "ACEPTADO_SUNAT"));
  const tieneOtrasAcciones = Boolean(venta.enlaceXml || venta.enlaceCdr || (venta.enlacePdf && !venta.enlacePdf.startsWith("/")) || puedeConsultar);

  return (
    <tr>
      <td className="[font-variant-numeric:tabular-nums] text-[#506b87]">{fecha(venta.fecha)}</td>
      <td><Etiqueta tono={venta.tipoComprobante === "FACTURA" ? "informativa" : venta.tipoComprobante === "BOLETA" ? "positiva" : "neutral"}>{comprobante(venta.tipoComprobante)}</Etiqueta></td>
      <td><strong className={c.documentCode} title={venta.codigoComprobante}>{venta.codigoComprobante}</strong></td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}>
        <strong className={c.clientName}>{venta.clienteNombre || "Cliente no especificado"}</strong>
        {venta.clienteNumeroDocumento && <small className={c.minorText}>{venta.clienteNumeroDocumento}</small>}
      </td>
      <td>
        <div className="flex flex-wrap items-center gap-1"><Etiqueta tono="marca" compacta>{medioPago(venta.medioPago)}</Etiqueta><Etiqueta tono={venta.condicionPago === "CREDITO" ? "advertencia" : "neutral"} compacta>{venta.condicionPago === "CREDITO" ? "Credito" : "Contado"}</Etiqueta></div>
      </td>
      <td className="min-w-[150px]"><DesgloseImportes subtotal={venta.subtotal} igv={venta.igv} tasaIgv={Number(venta.igv) > 0 ? Number(venta.tasaIgv) : undefined} total={venta.total} /></td>
      <td><Etiqueta tono={estadoFiscal === "Rechazado" ? "peligro" : estadoFiscal === "Emitido" ? "positiva" : "advertencia"}>{estadoFiscal}</Etiqueta></td>
      <td>
        <div className={c.rowActions}>
          <DocumentoEnlaces pdf={venta.enlacePdf} xml={null} cdr={null} codigo={venta.codigoComprobante} whatsapp={false} />
          {puedeEmitirNota && (
            <>
              <BotonAccion tono="informativa" etiqueta={`Emitir nota de cr\u00e9dito para ${venta.codigoComprobante}`} onClick={() => onEmitirNota(venta, "NOTA_CREDITO")} icono={<span className="text-[11px] font-[850] tracking-[-.025em]" aria-hidden="true">NC</span>} />
              <BotonAccion tono="principal" etiqueta={`Emitir nota de d\u00e9bito para ${venta.codigoComprobante}`} onClick={() => onEmitirNota(venta, "NOTA_DEBITO")} icono={<span className="text-[11px] font-[850] tracking-[-.025em]" aria-hidden="true">ND</span>} />
            </>
          )}
          {puedeAnularVenta && (
            venta.estado === "ANULACION_PENDIENTE" ? (
              <BotonAccion tono="advertencia" etiqueta={`Consultar baja de ${venta.codigoComprobante}`} onClick={() => onAnular({ ingresoId: venta.id, documentoId: venta.id, codigo: venta.codigoComprobante, tipo: comprobante(venta.tipoComprobante), esNota: false, pendiente: true })} icono={<Ban aria-hidden="true" size={16} />} />
            ) : venta.estado === "EMITIDO" && venta.estadoProveedor === "ACEPTADO_SUNAT" && (
              <BotonAccion tono="peligro" etiqueta={`Anular ${venta.codigoComprobante}`} onClick={() => onAnular({ ingresoId: venta.id, documentoId: venta.id, codigo: venta.codigoComprobante, tipo: comprobante(venta.tipoComprobante), esNota: false, pendiente: false })} icono={<Ban aria-hidden="true" size={16} />} />
            )
          )}
          {tieneOtrasAcciones && <span ref={menu.raizRef} className="relative inline-flex items-center">
            <BotonAccion etiqueta={`Otras acciones de ${venta.codigoComprobante}`} tono="informativa" icono={<MoreVertical aria-hidden="true" />} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar} />
            {menu.presente && <div className={`${clasesOpcionesMenu} w-[min(280px,calc(100vw-32px))]`} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label={`Otras acciones de ${venta.codigoComprobante}`} onClick={(evento) => {
              const destino = evento.target as HTMLElement;
              if (destino.closest('[role="menuitem"]')) menu.cerrar();
            }}>
              <DocumentoEnlaces pdf={null} xml={venta.enlaceXml} cdr={venta.enlaceCdr} codigo={venta.codigoComprobante} mostrarPdf={false} whatsapp={false} />
              {venta.enlacePdf && !venta.enlacePdf.startsWith("/") && <DocumentoEnlaces pdf={venta.enlacePdf} xml={null} cdr={null} codigo={venta.codigoComprobante} mostrarPdf={false} />}
              {puedeConsultar && <button className={`${clasesOpcionMenu} flex items-center gap-2`} type="button" role="menuitem" onClick={() => onConsultarEstado(venta)}><RefreshCw aria-hidden="true" size={16} />Consultar estado SUNAT</button>}
            </div>}
          </span>}
        </div>
      </td>
    </tr>
  );
}
