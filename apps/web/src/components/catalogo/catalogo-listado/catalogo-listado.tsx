import "./catalogo-listado.css";
import type { ReactNode } from "react";
import { CatalogoLoading } from "../catalogo-loading/catalogo-loading";
import { CatalogoPaginacion, SelectorTamanioPagina } from "../catalogo-paginacion/catalogo-paginacion";

type PropiedadesCatalogoListado<T> = {
  titulo: string;
  descripcion: string;
  etiquetaCrear: string;
  tituloListado: string;
  registros: T[];
  totalRegistros?: number;
  visibles: T[];
  cargando: boolean;
  mensajeCarga: string;
  error: string;
  iconoVacio: ReactNode;
  tituloVacio: string;
  descripcionVacio: string;
  pagina: number;
  porPagina: number;
  totalPaginas: number;
  desde: number;
  hasta: number;
  alCrear: () => void;
  alCambiarPagina: (pagina: number) => void;
  alCambiarTamanioPagina: (cantidad: number) => void;
  busqueda?: string;
  alBuscar?: (valor: string) => void;
  busquedaPlaceholder?: string;
  busquedaAriaLabel?: string;
  controlesFiltro?: ReactNode;
  claseTarjetas?: string;
  renderizarTarjeta?: (registro: T) => ReactNode;
  contenidoListado?: ReactNode;
};

export function CatalogoListado<T>({
  titulo,
  descripcion,
  etiquetaCrear,
  tituloListado,
  registros,
  totalRegistros = registros.length,
  visibles,
  cargando,
  mensajeCarga,
  error,
  iconoVacio,
  tituloVacio,
  descripcionVacio,
  pagina,
  porPagina,
  totalPaginas,
  desde,
  hasta,
  alCrear,
  alCambiarPagina,
  alCambiarTamanioPagina,
  busqueda,
  alBuscar,
  busquedaPlaceholder = "Buscar por nombre, código o descripción",
  busquedaAriaLabel = "Buscar productos",
  controlesFiltro,
  claseTarjetas,
  renderizarTarjeta,
  contenidoListado,
}: PropiedadesCatalogoListado<T>) {
  return (
    <section className="catalog-content" aria-label={titulo} aria-description={descripcion}>
      <button className="catalog-submit catalog-create-button erp-floating-action" type="button" onClick={alCrear} aria-label={etiquetaCrear} title={etiquetaCrear}>
        <span className="erp-floating-action-icon" aria-hidden="true">+</span>
        <span className="erp-floating-action-label">{etiquetaCrear}</span>
      </button>

      {error && <div className="catalog-alert" role="alert">{error}</div>}

      <section className="catalog-list-section">
        <div className="catalog-list-heading">
          <div><span className="catalog-eyebrow">{totalRegistros} REGISTROS</span><h2>{tituloListado}</h2></div>
          <div className="catalog-list-tools">
            {controlesFiltro}
            {alBuscar && <input className="catalog-search-input" type="search" value={busqueda ?? ""} onChange={(event) => alBuscar(event.target.value)} placeholder={busquedaPlaceholder} aria-label={busquedaAriaLabel} />}
            <SelectorTamanioPagina valor={porPagina} onCambiar={alCambiarTamanioPagina} />
          </div>
        </div>

        <div className="catalog-results-scroll">
          {cargando ? <CatalogoLoading mensaje={mensajeCarga} /> : totalRegistros === 0 ? (
            <div className="catalog-empty-state">
              <span className="catalog-empty-icon">{iconoVacio}</span>
              <strong>{tituloVacio}</strong>
              <p>{descripcionVacio}</p>
            </div>
          ) : (
            contenidoListado ?? <div className={`catalog-card-grid${claseTarjetas ? ` ${claseTarjetas}` : ""}`}>{renderizarTarjeta && visibles.map(renderizarTarjeta)}</div>
          )}
        </div>

        {totalRegistros > 0 && <CatalogoPaginacion desde={desde} hasta={hasta} total={totalRegistros} pagina={pagina} totalPaginas={totalPaginas} onCambiar={alCambiarPagina} />}
      </section>
    </section>
  );
}
