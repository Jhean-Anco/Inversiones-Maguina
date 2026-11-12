import { RegistrarAccionPrincipal } from "../../ui/accion-principal/accion-principal";
import "./catalogo-listado.css";
import type { ReactNode } from "react";
import { ListadoMaestro } from "../../ui/listado-maestro/listado-maestro";

type Base<T> = {
  titulo: string; descripcion: string; etiquetaCrear: string; tituloListado: string; registros: T[]; totalRegistros?: number;
  cargando: boolean; mensajeCarga: string; error: string; iconoVacio: ReactNode; tituloVacio: string; descripcionVacio: string;
  pagina: number; porPagina: number; totalPaginas: number; desde: number; hasta: number;
  alCrear: () => void; alCambiarPagina: (pagina: number) => void; alCambiarTamanioPagina: (cantidad: number) => void;
  busqueda?: string; alBuscar?: (valor: string) => void; busquedaPlaceholder?: string; busquedaAriaLabel?: string;
  controlesFiltro?: ReactNode;
};
type PropiedadesCatalogoListado<T> = Base<T> & (
  | { variante: "tabla"; encabezadoTabla: ReactNode; renderizarFila: (registro: T) => ReactNode; claseTabla?: string; claseContenedorTabla?: string }
  | { variante: "tarjetas"; renderizarTarjeta: (registro: T) => ReactNode; columnasTarjetas: number; claseTarjeta?: string }
);
export function CatalogoListado<T>(props: PropiedadesCatalogoListado<T>) {
  return <section className="catalog-content" aria-label={props.titulo} aria-description={props.descripcion}>
    <h1 className="catalog-page-heading">{props.titulo}</h1>
    <RegistrarAccionPrincipal etiqueta={props.etiquetaCrear} onClick={props.alCrear} />
    <ListadoMaestro
      titulo={props.tituloListado}
      etiqueta={props.titulo}
      registros={props.registros}
      cargando={props.cargando}
      error={props.error}
      vacio={<><span className="catalog-empty-icon">{props.iconoVacio}</span><strong>{props.tituloVacio}</strong><p>{props.descripcionVacio}</p></>}
      controlesCabecera={<>{props.controlesFiltro}{props.alBuscar && <input className="catalog-search-input" type="search" value={props.busqueda ?? ""} onChange={(event) => props.alBuscar?.(event.target.value)} placeholder={props.busquedaPlaceholder ?? "Buscar por nombre, código o descripción"} aria-label={props.busquedaAriaLabel ?? "Buscar"} />}</>}
      paginacion={{ modo: "remota", pagina: props.pagina, tamanio: props.porPagina, total: props.totalRegistros ?? props.registros.length, totalPaginas: props.totalPaginas, desde: props.desde, hasta: props.hasta, alCambiarPagina: props.alCambiarPagina, alCambiarTamanio: props.alCambiarTamanioPagina }}
      {...(props.variante === "tabla" ? { variante: "tabla" as const, encabezadoTabla: props.encabezadoTabla, renderizarFila: props.renderizarFila, claseTabla: props.claseTabla, claseContenedor: props.claseContenedorTabla } : { variante: "tarjetas" as const, renderizarTarjeta: props.renderizarTarjeta, columnas: props.columnasTarjetas, claseTarjeta: props.claseTarjeta })}
    />
  </section>;
}
