import "../ordenes-servicio-page/orden-servicio-editor.css";
import "./nota-ajuste.css";
import { useEffect, useRef, useState } from "react";
import { Ban, MessageSquareText, Printer } from "lucide-react";
import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { BotonAccion } from "../../components/ui/boton-accion";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import type { FuenteNota, NotaRelacionada, VentaListado } from "../../services/ingresos.service";
import { estado, fecha, soles } from "./ventas-formatters";
import { DocumentoEnlaces } from "./documento-enlaces";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";

type Props = {
  venta: VentaListado;
  fuente: FuenteNota | null;
  notas: NotaRelacionada[];
  tipo: "NOTA_CREDITO" | "NOTA_DEBITO";
  ajustes: Record<string, string>;
  totalAjuste: number;
  cargando: boolean;
  error: string;
  guardando: boolean;
  emitida: string;
  onRecargar: () => void;
  observacion: string;
  cuentaFinancieraId: string;
  medioPago: string;
  puedeAnular: boolean;
  onCancelar: () => void;
  onAmount: (id: string, monto: string) => void;
  onAccount: (cuentaId: string, medioPago: string) => void;
  onObservation: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onAnular: (documento: DocumentoAnulacion) => void;
  onCerrarError?: () => void;
};

const LIMITE_OBSERVACION = 240;
const tonosNota = {
  ok: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]",
  pendiente: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]",
  error: "border-[#efcfcd] bg-[#fff4f3] text-[#9b2c2c]",
  neutral: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]",
};

/** Nota de crédito o débito sobre un comprobante emitido, con la estructura `os-*` de Órdenes de servicio. */
export function NotaAjusteFormulario({ venta, fuente, notas, tipo, ajustes, totalAjuste, cargando, error, guardando, emitida, onRecargar, observacion, cuentaFinancieraId, medioPago, puedeAnular, onCancelar, onAmount, onAccount, onObservation, onSubmit, onAnular, onCerrarError }: Props) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { tituloRef.current?.focus(); }, []);
  const esCredito = tipo === "NOTA_CREDITO";
  const nombreNota = esCredito ? "nota de crédito" : "nota de débito";
  const origen = venta.tipoComprobante === "BOLETA" ? "BOLETA" : "FACTURA";
  function solicitarCancelacion() {
    if (guardando) return;
    const tieneCambios = Boolean(cuentaFinancieraId) || Object.values(ajustes).some((monto) => monto.trim() !== "") || observacion.trim() !== "";
    if (tieneCambios) setConfirmarDescarte(true);
    else onCancelar();
  }
  const conImporte = fuente?.lineas.filter((linea) => Number(ajustes[linea.id]) > 0) ?? [];
  const hayImportesInvalidos = fuente?.lineas.some((linea) => {
    const valor = ajustes[linea.id]?.trim() ?? "";
    if (!valor || Number(valor) === 0) return false;
    const monto = Number(valor);
    return !Number.isFinite(monto) || monto < 0 || (monto > 0 && (monto < 0.01 || Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7)) || (esCredito && monto > Number(linea.saldoParaCredito));
  }) ?? false;
  const hayAjustesValidos = conImporte.length > 0 && conImporte.length <= 100 && !hayImportesInvalidos;
  const sinSaldo = esCredito && Boolean(fuente?.lineas.length) && fuente!.lineas.every((linea) => Number(linea.saldoParaCredito) <= 0);

  return <div className={`os-editor nota-ajuste-editor${esCredito ? "" : " es-debito"}`}>
    {error && <NotificacionFlotante mensaje={error} onCerrar={onCerrarError} accion={!fuente && !cargando ? { etiqueta: "Recargar comprobante", ejecutar: onRecargar } : undefined} />}
    {emitida && <NotificacionFlotante tipo="exito" mensaje={`Se emitió la ${nombreNota} ${emitida}.`} />}
    {conImporte.length > 100 && <NotificacionFlotante mensaje="Puedes incluir hasta 100 líneas por nota." />}
    <form className="os-formulario" onSubmit={onSubmit} aria-busy={guardando || cargando}>
      <div className="os-indicadores">
        <span className={`os-chip ${esCredito ? tonosNota.pendiente : tonosNota.ok}`}><i className={esCredito ? "bg-[#2a8bbd]" : "bg-[#1b5e40]"} aria-hidden="true" />{esCredito ? "Nota de crédito · reduce el comprobante" : "Nota de débito · aumenta el comprobante"}</span>
        <div className="os-numero"><span>{origen} DE ORIGEN</span><strong>{venta.codigoComprobante}</strong></div>
      </div>

      <div className="os-disposicion">
        <div className="os-columna">
          <section className="os-tarjeta" aria-labelledby="nota-titulo-origen">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">1</span><h3 id="nota-titulo-origen" ref={tituloRef} tabIndex={-1}>Comprobante de origen</h3></div>
            </div>
            <dl className="nota-ajuste-datos">
              <div><dt>Cliente</dt><dd>{fuente?.clienteNombre?.trim() || venta.clienteNombre?.trim() || "Clientes varios"}</dd></div>
              <div><dt>Documento del cliente</dt><dd>{fuente?.clienteNumeroDocumento || venta.clienteNumeroDocumento || "Sin número"}</dd></div>
              <div><dt>Fecha del comprobante</dt><dd>{fecha(fuente?.fecha ?? venta.fecha)}</dd></div>
              <div><dt>Importe original</dt><dd>{soles(fuente?.total ?? venta.total)}</dd></div>
            </dl>
          </section>

          <section className="os-tarjeta" aria-labelledby="nota-titulo-lineas">
            <div className="os-tarjeta-cabecera is-dividida">
              <div className="os-titulo">
                <span className="os-paso" aria-hidden="true">2</span>
                <h3 id="nota-titulo-lineas">{esCredito ? "Descuento por línea" : "Aumento por línea"}</h3>
                <span className="os-contador">{conImporte.length} {conImporte.length === 1 ? "línea incluida" : "líneas incluidas"}</span>
              </div>
            </div>
            {cargando ? <div className="os-vacio" role="status"><strong>Cargando el comprobante…</strong></div>
              : !fuente ? <div className="os-vacio"><strong>El detalle del comprobante no está disponible</strong><span>Vuelve a cargarlo para continuar.</span></div>
              : fuente.lineas.length === 0 ? <div className="os-vacio"><strong>El comprobante no tiene líneas para ajustar</strong></div>
              : <div className={`os-lineas${esCredito ? " es-credito" : ""}`} role="table" aria-label="Líneas del comprobante">
                <div className="os-lineas-cabecera" role="row">
                  <span role="columnheader">DESCRIPCIÓN</span><span role="columnheader">CANT.</span><span role="columnheader">PRECIO</span><span role="columnheader">IMPORTE</span>{esCredito && <span role="columnheader">DISPONIBLE</span>}<span role="columnheader">{esCredito ? "DESCUENTO" : "AUMENTO"}</span>
                </div>
                {fuente.lineas.map((linea) => {
                  const bloqueada = esCredito && Number(linea.saldoParaCredito) <= 0;
                  return <div role="row" key={linea.id} className={`os-linea es-producto${Number(ajustes[linea.id]) > 0 ? " es-incluida" : ""}`}>
                    <div role="cell" className="os-linea-descripcion"><strong className="nota-ajuste-descripcion" title={linea.descripcion}>{linea.descripcion}</strong></div>
                    <span role="cell" className="nota-ajuste-celda es-centro"><small>Cant.</small>{Number(linea.cantidad).toLocaleString("es-PE", { maximumFractionDigits: 3 })}{linea.unidad ? ` ${linea.unidad}` : ""}</span>
                    <span role="cell" className="nota-ajuste-celda"><small>Precio</small>{soles(linea.precioUnitario)}</span>
                    <span role="cell" className="nota-ajuste-celda"><small>Importe</small>{soles(linea.total)}</span>
                    {esCredito && <span role="cell" className="nota-ajuste-celda" title={`Ya aplicado: ${soles(linea.creditoAplicado)}`}><small>Disponible</small><strong>{soles(linea.saldoParaCredito)}</strong></span>}
                    <label role="cell" className="os-linea-campo os-linea-descuento"><span>{esCredito ? "Descuento" : "Aumento"}</span>
                      <input type="number" min="0" max={esCredito ? linea.saldoParaCredito : undefined} step="0.01" inputMode="decimal" value={ajustes[linea.id] ?? ""} disabled={guardando || bloqueada} aria-label={`${esCredito ? "Descuento" : "Aumento"} para ${linea.descripcion} en soles`} placeholder="0.00" onChange={(evento) => onAmount(linea.id, evento.target.value)} />
                    </label>
                  </div>;
                })}
              </div>}
            {sinSaldo && <div className="os-aviso" role="note">No queda saldo disponible para aplicar otro descuento a este comprobante.</div>}
          </section>

          <section className="os-tarjeta" aria-labelledby="nota-titulo-motivo">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">3</span><h3 id="nota-titulo-motivo">Motivo</h3></div>
            </div>
            <div className="os-revision">
              <label className="os-campo os-revision-condicion">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Motivo de la {nombreNota} <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACION} rows={3} value={observacion} disabled={guardando} onChange={(evento) => onObservation(evento.target.value)} placeholder={esCredito ? "Ej. Descuento por devolución de un filtro de aceite en mal estado." : "Ej. Ajuste por flete no incluido en la boleta."} />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </section>

          <section className="os-tarjeta" aria-labelledby="nota-titulo-vinculadas">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">4</span><h3 id="nota-titulo-vinculadas">Notas vinculadas</h3><span className="os-contador">{notas.length}</span></div>
            </div>
            {cargando && !notas.length ? <p className="os-ayuda" role="status">Cargando notas vinculadas…</p>
              : notas.length ? <ul className="nota-ajuste-lista">{notas.map((nota) => {
                const nombre = nota.tipoComprobante === "NOTA_CREDITO" ? "Nota de crédito" : "Nota de débito";
                const pendiente = nota.estado === "ANULACION_PENDIENTE";
                const anulada = nota.estadoAnulacion === "ANULADO";
                const bajaPendiente = nota.estadoAnulacion === "PENDIENTE";
                const bajaRechazada = nota.estadoAnulacion === "RECHAZADO";
                const etiqueta = anulada ? "Anulada" : bajaPendiente ? "Baja pendiente" : bajaRechazada ? "Baja rechazada" : estado(nota.estado);
                const tono = anulada ? tonosNota.neutral : bajaPendiente || nota.estado.includes("PENDIENTE") ? tonosNota.pendiente : bajaRechazada || /RECHAZ|ERROR/.test(nota.estado) ? tonosNota.error : tonosNota.ok;
                return <li key={nota.id}>
                  <div className="nota-ajuste-nota-info">
                    <strong>{nombre} · {nota.codigoComprobante}</strong>
                    <span>{nota.motivo} · {soles(nota.total)}</span>
                    {nota.motivoAnulacion && <small>Motivo de baja: {nota.motivoAnulacion}</small>}
                  </div>
                  <span className={`${c.status} ${tono} !mx-0`}>{etiqueta}</span>
                  <span className={c.rowActions}>
                    <DocumentoEnlaces pdf={nota.enlacePdf} xml={nota.enlaceXml} cdr={nota.enlaceCdr} codigo={nota.codigoComprobante} whatsapp={false} pdfComoDocumento={false} />
                    {!/RECHAZ|ERROR/.test(nota.estado) && <MenuImpresion origen={{ ingresoId: venta.id, notaId: nota.id }} codigo={nota.codigoComprobante} />}
                    {puedeAnular && (pendiente || nota.estado === "EMITIDO") && <BotonAccion tono={pendiente ? "advertencia" : "peligro"} etiqueta={`${pendiente ? "Consultar baja de" : "Anular"} ${nota.codigoComprobante}`} icono={<Ban aria-hidden="true" size={16} />}
                      onClick={() => onAnular({ ingresoId: venta.id, documentoId: nota.id, codigo: nota.codigoComprobante, tipo: nombre, esNota: true, pendiente })} />}
                  </span>
                </li>;
              })}</ul> : <p className="os-ayuda">Aún no hay notas vinculadas a este comprobante.</p>}
          </section>
        </div>

        <aside className="os-resumen" aria-label={`Resumen de la ${nombreNota}`}>
          <h3>Resumen de la nota</h3>
          <dl className="os-importes">
            <div className="es-total"><dt>{esCredito ? "Total a devolver" : "Total a cobrar"}</dt><dd aria-live="polite">{soles(String(totalAjuste))}</dd></div>
          </dl>
          <div className="os-adelanto">
            <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={onAccount} etiqueta={esCredito ? "Cuenta desde donde se devuelve" : "Cuenta donde se recibe"} mostrarAyudaMedio={false} />
          </div>
          <div className="os-acciones">
            <button className="os-guardar" type="submit" disabled={guardando || cargando || !hayAjustesValidos || !cuentaFinancieraId}><Printer aria-hidden="true" size={18} />{guardando ? "Emitiendo…" : `Imprimir ${nombreNota}`}</button>
            <button className="os-cancelar" type="button" disabled={guardando} onClick={solicitarCancelacion}>{emitida ? "Volver al listado" : "Cancelar"}</button>
          </div>
        </aside>
      </div>
    </form>
    {confirmarDescarte && <ConfirmarDescarteFormulario elemento={`la ${nombreNota}`} accion="Descartar y volver al listado" onSeguirEditando={() => setConfirmarDescarte(false)} onDescartar={onCancelar} />}
  </div>;
}
