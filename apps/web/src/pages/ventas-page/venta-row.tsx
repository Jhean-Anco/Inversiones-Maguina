import { Ban, FileCheck, FileCode, MoreVertical, RefreshCw, ShieldCheck } from "lucide-react";
import { useId } from "react";
import { clasesOpcionMenu, clasesOpcionesMenu } from "../../components/documentos/menu-accion-classes";
import { BotonImprimir } from "../../components/documentos/boton-imprimir";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Etiqueta } from "../../components/ui/etiqueta";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { imprimirDocumento } from "../../services/impresion-documentos";
import type { VentaListado } from "../../services/ingresos.service";
import { DocumentoEnlaces } from "./documento-enlaces";
import { comprobante, estadoSunat, fecha, medioPago, soles } from "./ventas-formatters";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";
import { anchoMinimoColumnaRelacionClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";
import { urlApi } from "../../services/api-cliente";

type VentaRowProps = {
  venta: VentaListado;
  puedeEmitirNotas: boolean;
  puedeAnular: boolean;
  onConsultarEstado: (venta: VentaListado) => void;
  onEmitirNota: (venta: VentaListado, tipo: "NOTA_CREDITO" | "NOTA_DEBITO") => void;
  onAnular: (documento: DocumentoAnulacion) => void;
  onAplicarGarantia?: (venta: VentaListado) => void;
};

export function VentaRow({ venta, puedeEmitirNotas, puedeAnular, onConsultarEstado, onEmitirNota, onAnular, onAplicarGarantia }: VentaRowProps) {
  const { error: notificarError } = useAlertas();
  const estadoFiscal = estadoSunat(venta);
  const menu = useMenuAccionExclusivo(`mas-venta-${useId()}`);
  const puedeConsultar = ["RECHAZADO_SUNAT", "PENDIENTE_CONFIRMACION", "EN_PROCESO", "ERROR_SUNAT", "ERROR_NUBEFACT", "ERROR_EMISION", "NUBEFACT_PENDIENTE"].includes(venta.estadoProveedor);
  const puedeEmitirNota = puedeEmitirNotas && venta.estado === "EMITIDO" && venta.tipoComprobante !== "NOTA_VENTA";
  const puedeAnularVenta = puedeAnular && venta.tipoComprobante !== "NOTA_VENTA" && (venta.estado === "ANULACION_PENDIENTE" || (venta.estado === "EMITIDO" && venta.estadoProveedor === "ACEPTADO_SUNAT"));
  const tieneOtrasAcciones = Boolean(venta.enlaceXml || venta.enlaceCdr || puedeConsultar);
  const imprimirNotaVenta = (formato: "A4" | "TICKET") => imprimirDocumento({
    tipo: "NOTA DE VENTA",
    codigo: venta.codigoComprobante,
    fecha: fecha(venta.fecha),
    cliente: venta.clienteNombre,
    documentoCliente: venta.clienteNumeroDocumento,
    estado: "Registrada",
    lineas: (venta.lineasImpresion ?? []).map((linea) => ({ descripcion: linea.descripcion, cantidad: linea.cantidad, precio: soles(linea.precioUnitario), total: soles(linea.total) })),
    total: soles(venta.total),
  }, formato, { alError: notificarError });

  return (
    <tr>
      <td className="[font-variant-numeric:tabular-nums] text-[#506b87]">{fecha(venta.fecha)}</td>
      <td>
        <strong className={c.documentCode} title={venta.codigoComprobante}>{venta.codigoComprobante}</strong>
        <span className="mt-1 block"><Etiqueta tono={venta.tipoComprobante === "FACTURA" ? "informativa" : venta.tipoComprobante === "BOLETA" ? "positiva" : "neutral"}>{comprobante(venta.tipoComprobante)}</Etiqueta></span>
      </td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}>
        <strong className={c.clientName}>{venta.clienteNombre || "Cliente no especificado"}</strong>
        {venta.clienteNumeroDocumento && <small className={c.minorText}>{venta.clienteNumeroDocumento}</small>}
        {venta.mototaxis?.map((detalle) => {
          const cantidad = Number(detalle.cantidad);
          const cantidadTexto = Number.isFinite(cantidad)
            ? cantidad.toLocaleString("es-PE", { maximumFractionDigits: 2 })
            : detalle.cantidad;
          return <small className={c.itemDetail} key={detalle.id} title={detalle.descripcion}>
            {detalle.descripcion} · {cantidadTexto} {cantidad === 1 ? "und" : "unds"}
          </small>;
        })}
      </td>
      <td>
        <div className="flex flex-wrap items-center gap-1"><Etiqueta tono="marca" compacta>{medioPago(venta.medioPago)}</Etiqueta><Etiqueta tono={venta.condicionPago === "CREDITO" ? "advertencia" : "neutral"} compacta>{venta.condicionPago === "CREDITO" ? "Credito" : "Contado"}</Etiqueta></div>
      </td>
      <td className="min-w-[120px]"><strong className="block whitespace-nowrap font-bold tabular-nums text-[var(--erp-ink)]">{soles(venta.total)}</strong></td>
      <td><Etiqueta tono={estadoFiscal === "Rechazado" ? "peligro" : estadoFiscal === "Emitido" ? "positiva" : "advertencia"}>{estadoFiscal}</Etiqueta></td>
      <td>
        <div className={c.rowActions}>
          {venta.tipoComprobante === "NOTA_VENTA"
            ? <BotonImprimir etiqueta={`Imprimir nota de venta ${venta.codigoComprobante}`} alImprimirA4={() => imprimirNotaVenta("A4")} alImprimirTicket={() => imprimirNotaVenta("TICKET")} />
            : <DocumentoEnlaces pdf={venta.enlacePdf} xml={null} cdr={null} codigo={venta.codigoComprobante} whatsapp={false} />}
          {onAplicarGarantia && venta.estado === "EMITIDO" && (venta.mototaxis?.length ?? 0) > 0 && <BotonAccion tono="advertencia" etiqueta={`Aplicar garantía a la venta ${venta.codigoComprobante}`} onClick={() => onAplicarGarantia(venta)} icono={<ShieldCheck aria-hidden="true" size={16} />} />}
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
              {venta.enlaceXml && <a className={`${clasesOpcionMenu} no-underline`} href={venta.enlaceXml.startsWith("/") ? urlApi(venta.enlaceXml) : venta.enlaceXml} target="_blank" rel="noreferrer" role="menuitem"><FileCode aria-hidden="true" size={16} />Descargar XML</a>}
              {venta.enlaceCdr && <a className={`${clasesOpcionMenu} no-underline`} href={venta.enlaceCdr.startsWith("/") ? urlApi(venta.enlaceCdr) : venta.enlaceCdr} target="_blank" rel="noreferrer" role="menuitem"><FileCheck aria-hidden="true" size={16} />Ver constancia SUNAT</a>}
              {puedeConsultar && <button className={`${clasesOpcionMenu} flex items-center gap-2`} type="button" role="menuitem" onClick={() => onConsultarEstado(venta)}><RefreshCw aria-hidden="true" size={16} />Consultar estado SUNAT</button>}
            </div>}
          </span>}
        </div>
      </td>
    </tr>
  );
}
