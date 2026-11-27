import { useEffect, useRef, useState } from "react";
import { ArrowRight, Ban, ChevronDown, Files } from "lucide-react";
import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { Etiqueta } from "../../components/ui/etiqueta";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { MenuImpresion } from "../../components/impresion/menu-impresion";
import type { FuenteNota, NotaRelacionada, VentaListado } from "../../services/ingresos.service";
import { estado, fecha, soles } from "./ventas-formatters";
import { DocumentoEnlaces } from "./documento-enlaces";
import type { DocumentoAnulacion } from "./ventas-types";
import { ventasClasses as c } from "./ventas-classes";

import "../nuevo-ingreso-page/nuevo-ingreso-page.css";
import "./nota-ajuste.css";

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
};

export function NotaAjusteFormulario({ venta, fuente, notas, tipo, ajustes, totalAjuste, cargando, error, guardando, emitida, onRecargar, observacion, cuentaFinancieraId, medioPago, puedeAnular, onCancelar, onAmount, onAccount, onObservation, onSubmit, onAnular }: Props) {
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);
  const esCredito = tipo === "NOTA_CREDITO";
  const nombreNota = esCredito ? "nota de crédito" : "nota de débito";
  function solicitarCancelacion() {
    if (guardando) return;
    const tieneCambios = Boolean(cuentaFinancieraId) || Object.values(ajustes).some((monto) => monto.trim() !== "") ||
      observacion.trim() !== "";
    if (tieneCambios) setConfirmarDescarte(true);
    else onCancelar();
  }
  const origen = venta.tipoComprobante === "BOLETA" ? "Boleta" : "Factura";
  const conImporte = fuente?.lineas.filter((linea) => Number(ajustes[linea.id]) > 0) ?? [];
  const hayImportesInvalidos = fuente?.lineas.some((linea) => {
    const valor = ajustes[linea.id]?.trim() ?? "";
    if (!valor || Number(valor) === 0) return false;
    const monto = Number(valor);
    return !Number.isFinite(monto) || monto < 0 || (monto > 0 && (monto < 0.01 || Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7)) || (esCredito && monto > Number(linea.saldoParaCredito));
  }) ?? false;
  const hayAjustesValidos = conImporte.length > 0 && conImporte.length <= 100 && !hayImportesInvalidos;

  return <section className="nota-ajuste venta-page" data-tipo={esCredito ? "credito" : "debito"} aria-labelledby="nota-ajuste-titulo">
    <article className="venta-form-paper comprobante-boleta">
    <header className="venta-form-heading nota-ajuste-cabecera">
      <div className="nota-ajuste-identidad">
        <p>Comprobante electrónico</p>
        <h2 id="nota-ajuste-titulo" ref={tituloRef} tabIndex={-1}>{esCredito ? "Nota de crédito" : "Nota de débito"}</h2>
      </div>
      <div className="venta-number-card nota-ajuste-referencia"><span>{origen} de origen</span><strong>{venta.codigoComprobante}</strong></div>
    </header>
    <form className="venta-form-scroll nota-ajuste-formulario" onSubmit={onSubmit} aria-busy={guardando || cargando}>
        <section className="venta-form-header-fields nota-ajuste-origen" aria-label="Datos del comprobante de origen">
          <dl className="nota-ajuste-datos">
            <div><dt>Cliente</dt><dd>{fuente?.clienteNombre?.trim() || venta.clienteNombre?.trim() || "Clientes varios"}</dd></div>
            <div><dt>Documento del cliente</dt><dd>{fuente?.clienteNumeroDocumento || venta.clienteNumeroDocumento || "Sin número"}</dd></div>
            <div><dt>Fecha del comprobante</dt><dd>{fecha(fuente?.fecha ?? venta.fecha)}</dd></div>
            <div><dt>Importe original</dt><dd>{soles(fuente?.total ?? venta.total)}</dd></div>
          </dl>
        </section>
        <section className="venta-form-body nota-ajuste-detalle" aria-label={"L\u00edneas para ajustar"}>
          {cargando ? <p className="nota-ajuste-mensaje" role="status">Cargando datos del comprobante...</p> : !fuente ? <p className="nota-ajuste-mensaje">El detalle del comprobante no esta disponible.</p> : fuente.lineas.length === 0 ? <p className="nota-ajuste-mensaje">El comprobante no tiene lineas para ajustar.</p> :
            <div className={`venta-lines nota-ajuste-lineas ${esCredito ? "is-nota-credito" : "is-nota-debito"}`} role="table" aria-label={"L\u00edneas del comprobante"}>
              <div className="venta-table-head" role="row"><span role="columnheader">Producto o servicio</span><span role="columnheader">Cantidad</span><span role="columnheader">Precio unitario</span><span role="columnheader">Importe original</span>{esCredito && <span role="columnheader">Saldo disponible</span>}<span role="columnheader">{esCredito ? "Descuento (S/)" : "Aumento (S/)"}</span></div>
              {fuente.lineas.map((linea) => <div role="row" key={linea.id} className={`venta-line${Number(ajustes[linea.id]) > 0 ? " nota-ajuste-incluida" : ""}`}>
                <div role="cell" className="venta-line-name"><strong title={linea.descripcion}>{linea.descripcion}</strong>{linea.codigo && <small>{linea.codigo}</small>}</div>
                <span role="cell" className="nota-ajuste-cantidad-linea">{Number(linea.cantidad).toLocaleString("es-PE", { maximumFractionDigits: 3 })}{linea.unidad ? ` ${linea.unidad}` : ""}</span>
                <strong role="cell" className="nota-ajuste-celda-monto">{soles(linea.precioUnitario)}</strong>
                <strong role="cell" className="nota-ajuste-celda-monto">{soles(linea.total)}</strong>
                {esCredito && <div role="cell" className="venta-line-price nota-ajuste-celda-saldo"><strong>{soles(linea.saldoParaCredito)}</strong><small>Aplicado: {soles(linea.creditoAplicado)}</small></div>}
                <div role="cell" className="nota-ajuste-importe"><label className="nota-ajuste-campo-importe"><span aria-hidden="true">S/</span><input type="number" min="0" max={esCredito ? linea.saldoParaCredito : undefined} step="0.01" inputMode="decimal" value={ajustes[linea.id] ?? ""} disabled={guardando || (esCredito && Number(linea.saldoParaCredito) <= 0)} aria-label={`${esCredito ? "Descuento" : "Aumento"} para ${linea.descripcion} en soles`} placeholder="0.00" onChange={(evento) => onAmount(linea.id, evento.target.value)} /></label></div>
              </div>)}
            </div>}
          {esCredito && fuente?.lineas.length && fuente.lineas.every((linea) => Number(linea.saldoParaCredito) <= 0) ? <p>No queda saldo disponible para aplicar otro descuento.</p> : null}
          {conImporte.length > 100 && <p role="alert">Puedes incluir hasta 100 líneas por nota.</p>}
        </section>
        <footer className="venta-data-footer nota-ajuste-pie">
          <label className="venta-observation-card nota-ajuste-observacion">{"Observaci\u00f3n"}
            <textarea maxLength={240} rows={3} value={observacion} disabled={guardando} onChange={(evento) => onObservation(evento.target.value)} />
          </label>
          <div className="venta-checkout-actions nota-ajuste-cierre">
            <div className="venta-checkout-total nota-ajuste-pago">
              <div className="venta-checkout-amount nota-ajuste-total"><span>{esCredito ? "Total a devolver" : "Total a ingresar"}</span><strong aria-live="polite">{soles(String(totalAjuste))}</strong></div>
              <SelectorCuentaFinanciera value={cuentaFinancieraId} medioActual={medioPago} onChange={onAccount} etiqueta={esCredito ? "Devolver desde" : "Ingresar en"} mostrarAyudaMedio={false} />
            </div>
            <div className="venta-checkout-buttons">
              <button className="venta-clear" type="button" disabled={guardando} onClick={solicitarCancelacion}>Cancelar</button>
              <button className="venta-submit" type="submit" disabled={guardando || cargando || !hayAjustesValidos || !cuentaFinancieraId}>{guardando ? "Emitiendo…" : <>Continuar <ArrowRight aria-hidden="true" size={18} /></>}</button>
            </div>
          </div>
          {error && <p className="nota-ajuste-error" role="alert">{error}</p>}
          {error && !fuente && !cargando && <button type="button" className="venta-back nota-ajuste-recargar" onClick={onRecargar}>Recargar comprobante</button>}
          {emitida && <p className="nota-ajuste-exito" role="status">Se emitió la {nombreNota} {emitida}.</p>}
        </footer>
    </form>
    </article>
    <details className="nota-ajuste-historial">
      <summary>
        <Files size={18} aria-hidden="true" />
        <span>Notas vinculadas</span>
        <span className="nota-ajuste-cantidad-notas">{notas.length}</span>
        <ChevronDown className="nota-ajuste-desplegar" size={18} aria-hidden="true" />
      </summary>
      {cargando && !notas.length ? <p role="status">Cargando notas vinculadas…</p> : <>
        {notas.length ? <ul className="nota-ajuste-lista">{notas.map((nota) => {
          const nombre = nota.tipoComprobante === "NOTA_CREDITO" ? "Nota de crédito" : "Nota de débito";
          const pendiente = nota.estado === "ANULACION_PENDIENTE";
          const anulada = nota.estadoAnulacion === "ANULADO";
          const bajaPendiente = nota.estadoAnulacion === "PENDIENTE";
          const bajaRechazada = nota.estadoAnulacion === "RECHAZADO";
          const etiqueta = anulada ? "Anulada por SUNAT" : bajaPendiente ? "Baja pendiente de SUNAT" : bajaRechazada ? "Baja rechazada" : estado(nota.estado);
          const tono = anulada ? "neutral" : bajaPendiente ? "advertencia" : bajaRechazada || /RECHAZ|ERROR/.test(nota.estado) ? "peligro" : nota.estado.includes("PENDIENTE") ? "advertencia" : nota.estado === "EMITIDO" ? "positiva" : "informativa";
          return <li key={nota.id}>
            <div className="nota-ajuste-nota-info">
              <strong>{nombre} · {nota.codigoComprobante}</strong>
              <span>{nota.motivo} · {soles(nota.total)}</span>
              <Etiqueta compacta tono={tono}>{etiqueta}</Etiqueta>
              {nota.motivoAnulacion && <small>Motivo de baja: {nota.motivoAnulacion}</small>}
            </div>
            <span className={`${c.rowActions} nota-ajuste-nota-acciones`}>
              <DocumentoEnlaces pdf={nota.enlacePdf} xml={nota.enlaceXml} cdr={nota.enlaceCdr} codigo={nota.codigoComprobante} whatsapp={false} pdfComoDocumento={false} />
              {!/RECHAZ|ERROR/.test(nota.estado) && <MenuImpresion origen={{ ingresoId: venta.id, notaId: nota.id }} codigo={nota.codigoComprobante} />}
              {puedeAnular && (pendiente || nota.estado === "EMITIDO") && <button
                className={pendiente ? c.iconButton : `${c.iconButton} ${c.cancelAction}`}
                type="button"
                title={pendiente ? "Consultar estado de la baja" : "Comunicar baja a SUNAT"}
                aria-label={`${pendiente ? "Consultar baja de" : "Anular"} ${nota.codigoComprobante}`}
                onClick={() => onAnular({ ingresoId: venta.id, documentoId: nota.id, codigo: nota.codigoComprobante, tipo: nombre, esNota: true, pendiente })}
              ><Ban aria-hidden="true" size={16} /></button>}
            </span>
          </li>;
        })}</ul> : <p>Aún no hay notas vinculadas.</p>}
      </>}
    </details>
    {confirmarDescarte && <ConfirmarDescarteFormulario
      elemento={`la ${nombreNota}`}
      accion="Descartar y volver al listado"
      onSeguirEditando={() => setConfirmarDescarte(false)}
      onDescartar={onCancelar}
    />}
  </section>;
}
