import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

export type TipoNotificacionFlotante = "exito" | "advertencia" | "error" | "informacion";

type AccionNotificacion = { etiqueta: string; ejecutar: () => void };

type EntradaNotificacion = {
  tipo: TipoNotificacionFlotante;
  mensaje: string;
  titulo?: string;
  duracionMs?: number;
  accion?: AccionNotificacion;
  alCerrar?: () => void;
};

type DatosNotificacion = EntradaNotificacion & { id: number; cerrando: boolean };
type ContextoAlertas = {
  mostrar: (alerta: EntradaNotificacion) => void;
  exito: (mensaje: string) => void;
  error: (mensaje: string) => void;
  advertencia: (mensaje: string) => void;
  informacion: (mensaje: string) => void;
};
type EstadoNotificaciones = { alertas: DatosNotificacion[]; cerrar: (id: number, alCerrar?: () => void) => void };

const DURACION_POR_TIPO: Record<TipoNotificacionFlotante, number> = {
  exito: 5000,
  informacion: 6000,
  advertencia: 7000,
  error: 9000,
};
const DURACION_SALIDA_MS = 220;
const AlertasContext = createContext<ContextoAlertas | null>(null);
const EstadoNotificacionesContext = createContext<EstadoNotificaciones | null>(null);

export function AlertasProvider({ children }: { children: ReactNode }) {
  const [alertas, setAlertas] = useState<DatosNotificacion[]>([]);
  const temporizadoresSalida = useRef(new Map<number, number>());

  const cerrar = useCallback((id: number, alCerrar?: () => void) => {
    if (temporizadoresSalida.current.has(id)) return;
    setAlertas((actuales) => {
      const notificacion = actuales.find((alerta) => alerta.id === id);
      if (!notificacion || notificacion.cerrando) return actuales;
      return actuales.map((alerta) => alerta.id === id ? { ...alerta, cerrando: true } : alerta);
    });
    const temporizador = window.setTimeout(() => {
      setAlertas((actuales) => actuales.filter((alerta) => alerta.id !== id));
      temporizadoresSalida.current.delete(id);
      alCerrar?.();
    }, DURACION_SALIDA_MS);
    temporizadoresSalida.current.set(id, temporizador);
  }, []);

  const mostrar = useCallback((alerta: EntradaNotificacion) => {
    const id = Date.now() + Math.random();
    setAlertas((actuales) => [...actuales.slice(-3), { ...alerta, id, cerrando: false }]);
  }, []);

  useEffect(() => {
    const vigentes = new Set(alertas.map((alerta) => alerta.id));
    for (const [id, temporizador] of temporizadoresSalida.current) {
      if (vigentes.has(id)) continue;
      window.clearTimeout(temporizador);
      temporizadoresSalida.current.delete(id);
    }
  }, [alertas]);

  useEffect(() => () => {
    for (const temporizador of temporizadoresSalida.current.values()) window.clearTimeout(temporizador);
    temporizadoresSalida.current.clear();
  }, []);

  const api = useMemo<ContextoAlertas>(() => ({
    mostrar,
    exito: (mensaje) => mostrar({ tipo: "exito", mensaje }),
    error: (mensaje) => mostrar({ tipo: "error", mensaje }),
    advertencia: (mensaje) => mostrar({ tipo: "advertencia", mensaje }),
    informacion: (mensaje) => mostrar({ tipo: "informacion", mensaje }),
  }), [mostrar]);
  const estado = useMemo(() => ({ alertas, cerrar }), [alertas, cerrar]);

  return <AlertasContext.Provider value={api}><EstadoNotificacionesContext.Provider value={estado}>{children}</EstadoNotificacionesContext.Provider></AlertasContext.Provider>;
}

export function useAlertas() {
  const contexto = useContext(AlertasContext);
  if (!contexto) throw new Error("useAlertas debe usarse dentro de AlertasProvider.");
  return contexto;
}

function useEstadoNotificaciones() {
  const contexto = useContext(EstadoNotificacionesContext);
  if (!contexto) throw new Error("NotificacionesGlobales debe usarse dentro de AlertasProvider.");
  return contexto;
}

const titulosPorTipo: Record<TipoNotificacionFlotante, string> = {
  exito: "Operación completada",
  advertencia: "Atención",
  error: "Ocurrió un problema",
  informacion: "Información",
};

const clasesPorTipo: Record<TipoNotificacionFlotante, { tarjeta: string; icono: string; barra: string }> = {
  exito: { tarjeta: "border-[#b9dfce] bg-[#f5fcf8] text-[#176344]", icono: "bg-[#d9f3e5] text-[#14804f]", barra: "bg-[#168456]" },
  advertencia: { tarjeta: "border-[#f0d49d] bg-[#fffaf0] text-[#805515]", icono: "bg-[#ffedc7] text-[#9b670b]", barra: "bg-[#bd8017]" },
  error: { tarjeta: "border-[#f0c4c4] bg-[#fff8f8] text-[#872d35]", icono: "bg-[#fce2e3] text-[#b4232f]", barra: "bg-[#ca3041]" },
  informacion: { tarjeta: "border-[#bed8ef] bg-[#f5faff] text-[#1c527f]", icono: "bg-[#deefff] text-[#1768a8]", barra: "bg-[#2477b3]" },
};

export function NotificacionesGlobales({ anclaRef }: { anclaRef?: RefObject<HTMLElement | null> }) {
  const { alertas, cerrar } = useEstadoNotificaciones();
  const [posicion, setPosicion] = useState({ top: 16, right: 12 });

  useLayoutEffect(() => {
    const ancla = anclaRef?.current;
    if (!ancla) return;

    const actualizarPosicion = () => {
      const rectangulo = ancla.getBoundingClientRect();
      const top = Math.max(8, rectangulo.bottom + 10);
      const right = Math.max(12, window.innerWidth - rectangulo.right);
      setPosicion((actual) => actual.top === top && actual.right === right ? actual : { top, right });
    };

    actualizarPosicion();
    const observador = new ResizeObserver(actualizarPosicion);
    observador.observe(ancla);
    window.addEventListener("resize", actualizarPosicion);
    window.addEventListener("scroll", actualizarPosicion, true);
    return () => {
      observador.disconnect();
      window.removeEventListener("resize", actualizarPosicion);
      window.removeEventListener("scroll", actualizarPosicion, true);
    };
  }, [anclaRef]);

  if (!alertas.length || typeof document === "undefined") return null;
  return createPortal(
    <div
      className="pointer-events-none fixed z-[14000] grid w-[min(420px,calc(100vw-24px))] gap-2.5 overflow-y-auto overscroll-contain print:hidden"
      style={{ ...posicion, maxHeight: `calc(100dvh - ${posicion.top + 12}px)` }}
      role="region"
      aria-label="Notificaciones del sistema"
    >
      {alertas.map((alerta) => <TarjetaNotificacion key={alerta.id} alerta={alerta} cerrar={cerrar} />)}
    </div>,
    document.body,
  );
}

function TarjetaNotificacion({ alerta, cerrar }: { alerta: DatosNotificacion; cerrar: EstadoNotificaciones["cerrar"] }) {
  const onCerrar = useCallback(() => cerrar(alerta.id, alerta.alCerrar), [alerta.id, alerta.alCerrar, cerrar]);
  const duracion = alerta.duracionMs && alerta.duracionMs > 0 ? alerta.duracionMs : DURACION_POR_TIPO[alerta.tipo];

  useEffect(() => {
    if (alerta.cerrando) return;
    const temporizador = window.setTimeout(onCerrar, duracion);
    return () => window.clearTimeout(temporizador);
  }, [alerta.cerrando, duracion, onCerrar]);

  return <div
    className={`pointer-events-auto relative grid w-full grid-cols-[30px_minmax(0,1fr)_36px] items-start gap-[10px] overflow-hidden rounded-[12px] border px-[14px] pb-[16px] pt-[13px] shadow-[0_16px_44px_#10294338] mobile-portrait:grid-cols-[28px_minmax(0,1fr)_34px] mobile-portrait:px-3 mobile-portrait:pb-[15px] ${clasesPorTipo[alerta.tipo].tarjeta} ${alerta.cerrando ? "animate-[notification-exit_.22s_ease-in_both]" : "animate-[notification-entry_.24s_cubic-bezier(.18,.75,.28,1)_both]"} motion-reduce:animate-none`}
    role={alerta.tipo === "error" || alerta.tipo === "advertencia" ? "alert" : "status"}
    aria-live={alerta.tipo === "error" || alerta.tipo === "advertencia" ? "assertive" : "polite"}
  >
    <span className={`grid h-[28px] w-[28px] place-items-center rounded-full text-[17px] font-extrabold leading-none ${clasesPorTipo[alerta.tipo].icono}`} aria-hidden="true">{alerta.tipo === "exito" ? "✓" : alerta.tipo === "error" ? "×" : alerta.tipo === "advertencia" ? "!" : "i"}</span>
    <div className="grid min-w-0 gap-1 pt-px">
      <strong className="text-[12px] font-extrabold leading-[1.3]">{alerta.titulo ?? titulosPorTipo[alerta.tipo]}</strong>
      <p className="m-0 text-[12px] font-[550] leading-[1.45] [overflow-wrap:anywhere]">{alerta.mensaje}</p>
      {alerta.accion && <button className="mt-[5px] justify-self-start rounded-[7px] border border-current bg-transparent px-[10px] py-[6px] text-[11px] font-[750] text-inherit" type="button" onClick={() => { alerta.accion?.ejecutar(); onCerrar(); }}>{alerta.accion.etiqueta}</button>}
    </div>
    <button className="grid h-[34px] w-[34px] place-items-center rounded-[8px] border border-current/20 bg-white/70 p-0 text-[21px] leading-none text-inherit transition-colors hover:bg-white focus-visible:outline-[3px] focus-visible:outline-current focus-visible:outline-offset-1" type="button" aria-label="Cerrar notificación" onClick={onCerrar}>×</button>
    {!alerta.cerrando && <span
      aria-hidden="true"
      className={`absolute inset-x-0 bottom-0 h-[3px] origin-left animate-[notification-lifetime_linear_forwards] motion-reduce:animate-none ${clasesPorTipo[alerta.tipo].barra}`}
      style={{ animationDuration: `${duracion}ms` }}
    />}
  </div>;
}

// Mantiene compatibilidad con los emisores que publican avisos desde una pantalla.
export function NotificacionFlotante({ tipo = "error", mensaje, titulo, duracionMs, accion, onCerrar }: { tipo?: TipoNotificacionFlotante; mensaje?: string | null; titulo?: string; duracionMs?: number; accion?: AccionNotificacion; onCerrar?: () => void }) {
  const { mostrar } = useAlertas();
  const ultimaPublicacion = useRef<{ huella: string } | null>(null);
  const montada = useRef(false);
  const accionesActuales = useRef({ accion, onCerrar });
  accionesActuales.current = { accion, onCerrar };
  const etiquetaAccion = accion?.etiqueta;
  useEffect(() => {
    montada.current = true;
    return () => { montada.current = false; };
  }, []);
  useEffect(() => {
    if (!mensaje?.trim()) {
      ultimaPublicacion.current = null;
      return;
    }
    const huella = JSON.stringify([tipo, titulo, mensaje, duracionMs, etiquetaAccion]);
    if (ultimaPublicacion.current?.huella === huella) return;
    const publicacion = { huella };
    ultimaPublicacion.current = publicacion;
    mostrar({
      tipo, mensaje, titulo, duracionMs,
      accion: etiquetaAccion ? { etiqueta: etiquetaAccion, ejecutar: () => {
        if (montada.current && ultimaPublicacion.current === publicacion) accionesActuales.current.accion?.ejecutar();
      } } : undefined,
      alCerrar: () => {
        if (montada.current && ultimaPublicacion.current === publicacion) accionesActuales.current.onCerrar?.();
      },
    });
  }, [mostrar, tipo, mensaje, titulo, duracionMs, etiquetaAccion]);
  return tipo === "error" && mensaje?.trim() ? <span hidden data-error-formulario="" /> : null;
}
