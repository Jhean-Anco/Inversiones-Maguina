import { Ban, FileCheck, FileCode, Pencil, RefreshCw, ShieldCheck } from "lucide-react";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Etiqueta } from "../../components/ui/etiqueta";
import type { VentaListado } from "../../services/ingresos.service";
import { comprobante, estado, estadoSunat, fecha, medioPago, pendienteSunat, soles } from "./ventas-formatters";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";

const tonosEstado: Record<string, { caja: string; punto: string }> = {
  Emitido: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  Registrada: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  Pendiente: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  Rechazado: { caja: "border-[#efcfcd] bg-[#fff4f3] text-[#9b2c2c]", punto: "bg-[#c64243]" },
  Anulado: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#8193a5]" },
};
const enlace = (ruta: string) => (ruta.startsWith("/") ? urlApi(ruta) : ruta);
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
  onEditarNota?: (venta: VentaListado) => void;
};

export function VentaRow({ venta, puedeEmitirNotas, puedeAnular, onConsultarEstado, onEmitirNota, onAnular, onAplicarGarantia, onEditarNota }: VentaRowProps) {
  const estadoFiscal = estadoSunat(venta);
  const estadoVisible = estadoFiscal === "No aplica" ? (venta.estado === "ANULADO" ? "Anulado" : "Registrada") : estadoFiscal;
  const tono = tonosEstado[estadoVisible] ?? tonosEstado.Pendiente;
  const puedeConsultar = ["RECHAZADO_SUNAT", "PENDIENTE_CONFIRMACION", "EN_PROCESO", "ERROR_SUNAT", "ERROR_NUBEFACT", "ERROR_EMISION", "NUBEFACT_PENDIENTE"].includes(venta.estadoProveedor);
  const puedeEmitirNota = puedeEmitirNotas && venta.estado === "EMITIDO" && venta.tipoComprobante !== "NOTA_VENTA";
  const puedeAnularVenta = puedeAnular && venta.tipoComprobante !== "NOTA_VENTA" && (venta.estado === "ANULACION_PENDIENTE" || (venta.estado === "EMITIDO" && venta.estadoProveedor === "ACEPTADO_SUNAT"));
  // Solo se imprimen comprobantes válidos: notas de venta y electrónicos ya enviados (no rechazados ni con error).
  const puedeImprimir = venta.tipoComprobante === "NOTA_VENTA" || (venta.estado !== "ERROR_NUBEFACT" && estadoFiscal !== "Rechazado" && Boolean(venta.enlacePdf || venta.estadoProveedor === "ACEPTADO_SUNAT"));

  return (
    <tr>
      <td className="[font-variant-numeric:tabular-nums] text-[#142b42]">{fecha(venta.fecha)}</td>
      <td className="min-w-[150px]">
        <strong className={`${c.documentCode} mb-1 block`} title={venta.codigoComprobante}>{venta.codigoComprobante}</strong>
        <span className="mt-1 inline-block"><Etiqueta tono={venta.tipoComprobante === "FACTURA" ? "informativa" : venta.tipoComprobante === "BOLETA" ? "positiva" : "neutral"}>{comprobante(venta.tipoComprobante)}</Etiqueta></span>
      </td>
      <td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}>
        <strong className={c.clientName}>{venta.clienteNombre?.trim() || "Clientes varios"}</strong>
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
        <div className={c.pills}><Etiqueta tono="marca" compacta>{medioPago(venta.medioPago)}</Etiqueta><Etiqueta tono={venta.condicionPago === "CREDITO" ? "advertencia" : "neutral"} compacta>{venta.condicionPago === "CREDITO" ? "Crédito" : "Contado"}</Etiqueta></div>
      </td>
      <td><strong className={`block ${c.total}`}>{soles(venta.total)}</strong></td>
      <td><span className={`${c.status} ${tono.caja}`} title={estado(venta.estado, venta.estadoProveedor)}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{estadoVisible}</span>{pendienteSunat(venta) && <small className={c.minorText}>{venta.estado === "ANULACION_PENDIENTE" ? "Baja en espera de SUNAT" : "Confirmando con SUNAT"}</small>}</td>
      <td>
        <div className={c.rowActions}>
          {puedeImprimir && <MenuImpresion origen={{ ingresoId: venta.id }} codigo={venta.codigoComprobante} />}
          {onEditarNota && venta.tipoComprobante === "NOTA_VENTA" && venta.estado === "REGISTRADO" && <BotonAccion tono="informativa" etiqueta={`Editar ${venta.codigoComprobante}`} onClick={() => onEditarNota(venta)} icono={<Pencil aria-hidden="true" size={16} />} />}
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
          {puedeAnular && venta.tipoComprobante === "NOTA_VENTA" && venta.estado === "REGISTRADO" && <BotonAccion tono="peligro" etiqueta={`Anular ${venta.codigoComprobante}`} onClick={() => onAnular({ ingresoId: venta.id, documentoId: venta.id, codigo: venta.codigoComprobante, tipo: comprobante(venta.tipoComprobante), esNota: false, pendiente: false, interna: true })} icono={<Ban aria-hidden="true" size={16} />} />}
          {venta.enlaceXml && <BotonAccion tono="neutral" etiqueta={`Descargar XML de ${venta.codigoComprobante}`} href={enlace(venta.enlaceXml)} target="_blank" rel="noreferrer" icono={<FileCode aria-hidden="true" size={16} />} />}
          {venta.enlaceCdr && <BotonAccion tono="positiva" etiqueta={`Ver constancia SUNAT de ${venta.codigoComprobante}`} href={enlace(venta.enlaceCdr)} target="_blank" rel="noreferrer" icono={<FileCheck aria-hidden="true" size={16} />} />}
          {puedeConsultar && <BotonAccion tono="informativa" etiqueta={`Consultar estado SUNAT de ${venta.codigoComprobante}`} onClick={() => onConsultarEstado(venta)} icono={<RefreshCw aria-hidden="true" size={16} />} />}
        </div>
      </td>
    </tr>
  );
}
