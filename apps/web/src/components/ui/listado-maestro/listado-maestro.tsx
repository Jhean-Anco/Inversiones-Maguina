import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { PaginationBasic } from "../the-pagination";
import { tamanioListadoSegunPantalla } from "./paginacion-responsive";
import "./listado-maestro.css";

type PaginacionLocal = { modo: "local" };
type PaginacionRemota = {
  modo: "remota"; pagina: number; tamanio: number; total: number; totalPaginas: number;
  desde: number; hasta: number; alCambiarPagina: (pagina: number) => void; alCambiarTamanio: (tamanio: number) => void;
};
type Comun<T> = {
  titulo: string; descripcion?: string; registros: readonly T[]; cargando?: boolean; error?: ReactNode;
  vacio?: ReactNode; controlesCabecera?: ReactNode; paginacion: PaginacionLocal | PaginacionRemota;
  etiqueta?: string; resetKey?: string | number;
};
type Tabla<T> = Comun<T> & {
  variante: "tabla"; encabezadoTabla: ReactNode; renderizarFila: (registro: T) => ReactNode;
  claseTabla?: string; claseContenedor?: string;
};
type Tarjetas<T> = Comun<T> & {
  variante: "tarjetas"; renderizarTarjeta: (registro: T) => ReactNode; columnas: number;
  claseTarjeta?: string;
};
type Props<T> = Tabla<T> | Tarjetas<T>;

export function ListadoMaestro<T>(props: Props<T>) {
  const [paginaLocal, setPaginaLocal] = useState(1);
  const [anchoViewport, setAnchoViewport] = useState(() => typeof window === "undefined" ? 1280 : window.innerWidth);
  const tamanioAdaptativo = tamanioListadoSegunPantalla(anchoViewport, props.variante);
  const [tamanioLocal, setTamanioLocal] = useState(tamanioAdaptativo);
  useEffect(() => {
    const actualizar = () => setAnchoViewport((anterior) => {
      const siguiente = window.innerWidth;
      return tamanioListadoSegunPantalla(anterior, props.variante) === tamanioListadoSegunPantalla(siguiente, props.variante) ? anterior : siguiente;
    });
    window.addEventListener("resize", actualizar, { passive: true });
    return () => window.removeEventListener("resize", actualizar);
  }, [props.variante]);
  useEffect(() => { setPaginaLocal(1); }, [props.resetKey]);
  useEffect(() => {
    if (props.paginacion.modo === "local" && tamanioLocal !== tamanioAdaptativo) {
      setTamanioLocal(tamanioAdaptativo);
      setPaginaLocal(1);
    } else if (props.paginacion.modo === "remota" && props.paginacion.tamanio !== tamanioAdaptativo) {
      props.paginacion.alCambiarTamanio(tamanioAdaptativo);
    }
  }, [props.paginacion, tamanioAdaptativo, tamanioLocal]);
  const remoto = props.paginacion.modo === "remota" ? props.paginacion : null;
  const tamanio = remoto?.tamanio ?? tamanioLocal;
  const total = remoto?.total ?? props.registros.length;
  const totalPaginas = remoto?.totalPaginas ?? Math.max(1, Math.ceil(props.registros.length / tamanio));
  const pagina = remoto?.pagina ?? Math.min(paginaLocal, totalPaginas);
  const desde = remoto?.desde ?? (props.registros.length ? (pagina - 1) * tamanio + 1 : 0);
  const hasta = remoto?.hasta ?? Math.min(pagina * tamanio, props.registros.length);
  const visibles = useMemo(() => remoto ? props.registros : props.registros.slice((pagina - 1) * tamanio, pagina * tamanio), [props.registros, pagina, remoto, tamanio]);
  const contenedorFooter = typeof document === "undefined" ? null : document.querySelector(".erp-main");

  function cambiarPagina(nuevaPagina: number) {
    if (remoto) remoto.alCambiarPagina(nuevaPagina);
    else setPaginaLocal(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
  }

  return <section className={`listado-maestro is-${props.variante}`} aria-label={props.etiqueta ?? props.titulo} aria-description={props.descripcion}>
    {props.error && <div className="listado-maestro-error" role="alert">{props.error}</div>}
    <header className="listado-maestro-cabecera">
      <div className="listado-maestro-controles">{props.controlesCabecera}</div>
      <span className="listado-maestro-resumen" aria-live="polite">Mostrando {desde.toLocaleString("es-PE")}–{hasta.toLocaleString("es-PE")} de {total.toLocaleString("es-PE")}</span>
    </header>
    <div className="listado-maestro-contenido" aria-live="polite">
      {props.cargando ? <div className="listado-maestro-estado" role="status">Cargando…</div> : total === 0 ? <div className="listado-maestro-vacio">{props.vacio}</div> : props.variante === "tabla" ? (
        <div className={`listado-maestro-tabla-scroll ${props.claseContenedor ?? ""}`}><table className={`listado-maestro-tabla ${props.claseTabla ?? ""}`}><thead>{props.encabezadoTabla}</thead><tbody>{visibles.map(props.renderizarFila)}</tbody></table></div>
      ) : <div className={`listado-maestro-tarjetas ${props.claseTarjeta ?? ""}`} style={{ "--listado-columnas": Math.max(1, props.columnas) } as React.CSSProperties}>{visibles.map(props.renderizarTarjeta)}</div>}
    </div>
    {contenedorFooter && createPortal(<footer className="listado-maestro-footer">
      <nav className="listado-maestro-paginacion" aria-label="Paginación del listado">
        <PaginationBasic page={pagina} totalPages={totalPaginas} onPageChange={cambiarPagina} ariaLabel="Paginación del listado" isDisabled={props.cargando} />
      </nav>
    </footer>, contenedorFooter)}
  </section>;
}

