import { useEffect, useMemo, useState, type ReactNode } from "react";
import { tamanioListadoSegunPantalla } from "./paginacion-responsive";
import { CabeceraListado } from "./cabecera-listado";
import { EstadoGlobal } from "../estado-global/estado-global";
import { NotificacionFlotante } from "../notificacion-flotante/notificacion-flotante";
import { ListaTarjetas } from "./lista-tarjetas";
import { PaginacionListado } from "./paginacion-listado";
import { TablaListado } from "./tabla-listado";

type PaginacionLocal = { modo: "local" };
type PaginacionRemota = {
  modo: "remota"; pagina: number; tamanio: number; total: number; totalPaginas: number;
  desde: number; hasta: number; alCambiarPagina: (pagina: number) => void; alCambiarTamanio: (tamanio: number) => void;
};
type Comun<T> = {
  titulo: string; descripcion?: string; registros: readonly T[]; cargando?: boolean; error?: string | null;
  vacio?: ReactNode; controlesCabecera?: ReactNode; paginacion: PaginacionLocal | PaginacionRemota;
  etiqueta?: string; resetKey?: string | number;
  claseRaiz?: string; claseCabecera?: string; claseControlesCabecera?: string; clasePaginacion?: string;
};
type Tabla<T> = Comun<T> & {
  variante: "tabla"; encabezadoTabla: ReactNode; renderizarFila: (registro: T) => ReactNode;
  claseTabla?: string; claseContenedor?: string; centrarCeldas?: boolean;
};
type Tarjetas<T> = Comun<T> & {
  variante: "tarjetas"; renderizarTarjeta: (registro: T) => ReactNode; columnas: number;
  claseTarjeta?: string;
};
type Props<T> = Tabla<T> | Tarjetas<T>;

const clasesRaiz = "mx-0 flex h-full min-h-0 min-w-0 w-full max-w-none flex-[1_1_auto] flex-col overflow-hidden box-border rounded-2xl border border-[var(--erp-border,#dce5ed)] bg-[var(--erp-surface,#fff)] text-[var(--erp-ink,#172033)] shadow-[var(--erp-shadow-card,0_8px_24px_#15344f0a)]";
const clasesContenido = "flex min-h-0 min-w-0 w-full flex-[1_1_auto] max-h-none flex-col overflow-hidden p-0";

export function ListadoMaestro<T>(props: Props<T>) {
  const [paginaLocal, setPaginaLocal] = useState(1);
  const [viewport, setViewport] = useState(() => ({ ancho: typeof window === "undefined" ? 1366 : window.innerWidth, alto: typeof window === "undefined" ? 768 : window.innerHeight }));
  const tamanioAdaptativo = tamanioListadoSegunPantalla(viewport.ancho, props.variante, viewport.alto);
  const [tamanioLocal, setTamanioLocal] = useState(tamanioAdaptativo);

  useEffect(() => {
    const actualizar = () => setViewport({ ancho: window.innerWidth, alto: window.innerHeight });
    window.addEventListener("resize", actualizar, { passive: true });
    return () => window.removeEventListener("resize", actualizar);
  }, []);
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

  function cambiarPagina(nuevaPagina: number) {
    if (nuevaPagina === pagina) return;
    if (remoto) remoto.alCambiarPagina(nuevaPagina);
    else setPaginaLocal(Math.max(1, Math.min(nuevaPagina, totalPaginas)));
  }

  return <section className={`listado-maestro is-${props.variante} ${clasesRaiz} ${props.claseRaiz ?? ""}`} aria-label={props.etiqueta ?? props.titulo} aria-description={props.descripcion}>
    <NotificacionFlotante mensaje={props.error} />
    <CabeceraListado controles={props.controlesCabecera} claseCabecera={props.claseCabecera} claseControles={props.claseControlesCabecera} />
    <div className={`listado-maestro-contenido ${clasesContenido}`} aria-live="polite">
      {props.cargando ? <EstadoGlobal tipo="cargando" /> : total === 0 ? <EstadoGlobal tipo="vacio">{props.error ? "No se pudieron cargar los datos." : props.vacio}</EstadoGlobal> : props.variante === "tabla" ? (
        <TablaListado encabezado={props.encabezadoTabla} filas={visibles.map(props.renderizarFila)} claseTabla={props.claseTabla} claseContenedor={props.claseContenedor} centrarCeldas={props.centrarCeldas} />
      ) : <ListaTarjetas tarjetas={visibles.map(props.renderizarTarjeta)} columnas={props.columnas} claseTarjeta={props.claseTarjeta} />}
    </div>
    <PaginacionListado pagina={pagina} totalPaginas={totalPaginas} alCambiar={cambiarPagina} total={total} desde={desde} hasta={hasta} cargando={props.cargando} clase={props.clasePaginacion} />
  </section>;
}
