
import { useLayoutEffect, useRef, type FormEventHandler, type ReactNode } from "react";
import { SelectorCuentaFinanciera } from "../finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { useViewportProfile } from "../../utilidades/use-viewport-profile";
import "../../pages/nuevo-ingreso-page/nuevo-ingreso-page.css";

export type PagoDocumentoCompra = { clave: string; cuentaFinancieraId: string; medioPago: string; importe: string };

type CompraDocumentoProps = {
  titulo: string;
  enRevision: boolean;
  catalogo: ReactNode;
  campos: ReactNode;
  tituloDetalle: string;
  conteoDetalle: string;
  detalle: ReactNode;
  pie: ReactNode;
  revision: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CompraDocumento({
  titulo, enRevision, catalogo, campos, tituloDetalle, conteoDetalle, detalle, pie, revision, onSubmit,
}: CompraDocumentoProps) {
  const perfil = useViewportProfile();
  const catalogoLateral = !enRevision && perfil !== "mobile-portrait" && perfil !== "mobile-landscape";
  const scroll = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const pasoAnterior = useRef(enRevision);

  useLayoutEffect(() => {
    if (pasoAnterior.current === enRevision) return;
    pasoAnterior.current = enRevision;
    if (scroll.current) scroll.current.scrollTop = 0;
    tituloRef.current?.focus({ preventScroll: true });
  }, [enRevision]);

  return <div className="venta-page is-data-step compra-documento">
    <form className="venta-layout is-data-step" onSubmit={onSubmit}>
      <div className={`venta-editor compra-editor${catalogoLateral ? " is-catalog-open" : ""}`}>
        {catalogoLateral && catalogo}
        <article className="venta-form-paper compra-paper" aria-label={titulo}>
          <header className="venta-form-heading">
            <div><p>{enRevision ? "Revisión de compra" : "Registro de compra"}</p><h2 ref={tituloRef} tabIndex={-1}>{titulo}</h2></div>
          </header>
          <div className="venta-form-scroll" ref={scroll}>
            {enRevision ? revision : <>
              <div className="venta-form-header-fields compra-header-fields">{campos}</div>
              <section className="venta-form-body">
                <div className="venta-form-body-heading">
                  <h3>{tituloDetalle}</h3>
                  <div className="venta-product-tools"><span>{conteoDetalle}</span></div>
                </div>
                {!catalogoLateral && catalogo}
                {detalle}
              </section>
            </>}
            {pie}
          </div>
        </article>
      </div>
    </form>
  </div>;
}

type CompraCatalogoProps = {
  titulo: string;
  etiqueta: string;
  placeholder: string;
  valor: string;
  alBuscar: (valor: string) => void;
  accion: ReactNode;
  children: ReactNode;
};

export function CompraCatalogo({ titulo, etiqueta, placeholder, valor, alBuscar, accion, children }: CompraCatalogoProps) {
  return <aside className="venta-catalog-sidebar compra-catalogo" aria-label={titulo}>
    <header><h2>{titulo}</h2></header>
    <label className="venta-catalog-search">
      <span aria-hidden="true">⌕</span>
      <input type="search" aria-label={etiqueta} placeholder={placeholder} value={valor} autoComplete="off"
        onChange={(evento) => alBuscar(evento.target.value)}
        onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
    </label>
    <div className="venta-catalog-results compra-catalogo-resultados" aria-live="polite">{children}</div>
    <div className="compra-catalogo-accion">{accion}</div>
  </aside>;
}

type CompraPieProps = {
  total: number;
  observacion: string;
  alObservar: (valor: string) => void;
  pagos: PagoDocumentoCompra[];
  alCambiarPagos: (actualizar: (pagos: PagoDocumentoCompra[]) => PagoDocumentoCompra[]) => void;
  alAgregarPago: () => void;
  alQuitarPago: (clave: string) => void;
  alCancelar: () => void;
  alEditar: () => void;
  guardando: boolean;
  tieneDetalle: boolean;
  enRevision: boolean;
  modalidadPago?: string;
};

export function CompraPie({
  total, observacion, alObservar, pagos, alCambiarPagos, alAgregarPago, alQuitarPago,
  alCancelar, alEditar, guardando, tieneDetalle, enRevision, modalidadPago,
}: CompraPieProps) {
  const totalFormateado = `S/ ${total.toFixed(2)}`;
  return <footer className={`venta-data-footer compra-pie${enRevision ? " compra-pie-revision" : ""}`}>
    {!enRevision && <label className="venta-observation-card">
      Observaciones
      <textarea value={observacion} onChange={(evento) => alObservar(evento.target.value)} maxLength={2000} placeholder="Añade una nota" />
    </label>}
    <div className="compra-cierre">
      <div className="venta-checkout-amount" aria-live="polite">
        <span>Total de la compra</span><strong>{totalFormateado}</strong>
        {modalidadPago && <span>{modalidadPago}</span>}
      </div>
      {!enRevision && total > 0 && <div className="compra-pagos">
        {pagos.map((pago) => <div className="compra-pago" key={pago.clave}>
          <SelectorCuentaFinanciera
            value={pago.cuentaFinancieraId}
            medioActual={pago.medioPago}
            etiqueta="Cuenta o medio de pago"
            onChange={(cuentaFinancieraId, medioPago) => alCambiarPagos((filas) => filas.map((fila) => fila.clave === pago.clave ? { ...fila, cuentaFinancieraId, medioPago } : fila))}
          />
          <label>Importe (S/)
            <input type="number" min="0.01" step="0.01" value={pago.importe || (pagos.length === 1 ? total.toFixed(2) : "")} onChange={(evento) => {
              const importe = evento.target.value;
              alCambiarPagos((filas) => filas.map((fila) => fila.clave === pago.clave ? { ...fila, importe } : fila));
            }} />
          </label>
          {pagos.length > 1 && <button className="compra-quitar" type="button" aria-label="Quitar medio de pago" onClick={() => alQuitarPago(pago.clave)}>×</button>}
        </div>)}
        <button className="compra-agregar-pago" type="button" onClick={alAgregarPago}>+ Agregar otro medio de pago</button>
      </div>}
      <div className="compra-acciones">
        <button className="venta-clear" type="button" disabled={guardando} onClick={enRevision ? alEditar : alCancelar}>{enRevision ? "Volver a editar" : "Cancelar"}</button>
        <button className="venta-submit" type="submit" disabled={guardando || !tieneDetalle}>
          {guardando ? "Registrando…" : enRevision ? "Registrar compra" : <>Continuar <span aria-hidden="true">→</span></>}
        </button>
      </div>
    </div>
  </footer>;
}

export function CompraRevision({ proveedor, fecha, documento, detalle, observacion }: {
  proveedor: ReactNode; fecha: string; documento: ReactNode; detalle: ReactNode; observacion: string;
}) {
  return <>
    <section className="venta-form-header-fields compra-header-fields" aria-label="Documento y proveedor">
      <dl className="compra-revision-datos">
        <div><dt>Proveedor</dt><dd>{proveedor}</dd></div>
        <div><dt>Fecha de compra</dt><dd>{new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE")}</dd></div>
        <div><dt>Documento</dt><dd>{documento}</dd></div>
      </dl>
    </section>
    <section className="venta-form-body">
      <div className="venta-form-body-heading"><h3>Detalle de la compra</h3></div>
      {detalle}
      <div className="compra-revision-observacion"><strong>Observaciones</strong><p>{observacion || "Sin observaciones"}</p></div>
    </section>
  </>;
}
