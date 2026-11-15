import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import "./notificacion-flotante.css";

export type TipoNotificacionFlotante = "exito" | "advertencia" | "error" | "informacion";

type AccionNotificacion = { etiqueta: string; ejecutar: () => void };

type PropsNotificacionFlotante = {
  tipo: TipoNotificacionFlotante;
  mensaje: string;
  titulo?: string;
  duracionMs?: number;
  accion?: AccionNotificacion;
  onCerrar: () => void;
};

type DatosNotificacion = Omit<PropsNotificacionFlotante, "onCerrar"> & { id: number; alCerrar?: () => void };
type EntradaAlerta = Omit<PropsNotificacionFlotante, "onCerrar"> & { alCerrar?: () => void };
type ContextoAlertas = { mostrar: (alerta: EntradaAlerta) => void; exito: (mensaje: string) => void; error: (mensaje: string) => void; advertencia: (mensaje: string) => void; informacion: (mensaje: string) => void };
const AlertasContext = createContext<ContextoAlertas | null>(null);

export function AlertasProvider({ children }: { children: ReactNode }) {
  const [alertas, setAlertas] = useState<DatosNotificacion[]>([]);
  const cerrar = useCallback((id: number) => setAlertas((actuales) => actuales.filter((alerta) => alerta.id !== id)), []);
  const mostrar = useCallback((alerta: EntradaAlerta) => {
    const id = Date.now() + Math.random();
    setAlertas((actuales) => [...actuales.slice(-3), { ...alerta, id }]);
  }, []);
  const api = useMemo<ContextoAlertas>(() => ({
    mostrar,
    exito: (mensaje) => mostrar({ tipo: "exito", mensaje }),
    error: (mensaje) => mostrar({ tipo: "error", mensaje, duracionMs: 0 }),
    advertencia: (mensaje) => mostrar({ tipo: "advertencia", mensaje }),
    informacion: (mensaje) => mostrar({ tipo: "informacion", mensaje }),
  }), [mostrar]);

  return <AlertasContext.Provider value={api}>{children}<div className="alertas-globales" aria-label="Alertas del sistema" aria-live="polite">
    {alertas.map(({ id, alCerrar, ...alerta }) => <TarjetaNotificacion key={id} {...alerta} onCerrar={() => { cerrar(id); alCerrar?.(); }} />)}
  </div></AlertasContext.Provider>;
}

export function useAlertas() {
  const contexto = useContext(AlertasContext);
  if (!contexto) throw new Error("useAlertas debe usarse dentro de AlertasProvider.");
  return contexto;
}

const titulosPorTipo: Record<TipoNotificacionFlotante, string> = {
  exito: "Operación completada",
  advertencia: "Atención",
  error: "Ocurrió un problema",
  informacion: "Información",
};

function TarjetaNotificacion({ tipo, mensaje, titulo, duracionMs = 5000, accion, onCerrar }: PropsNotificacionFlotante) {
  useEffect(() => {
    if (duracionMs <= 0) return;
    const temporizador = window.setTimeout(onCerrar, duracionMs);
    return () => window.clearTimeout(temporizador);
  }, [duracionMs, onCerrar]);

  return <div className={`notificacion-flotante notificacion-flotante-${tipo}`} role={tipo === "error" || tipo === "advertencia" ? "alert" : "status"} aria-live={tipo === "error" || tipo === "advertencia" ? "assertive" : "polite"}>
    <span className="notificacion-flotante-icono" aria-hidden="true">{tipo === "exito" ? "✓" : tipo === "error" ? "×" : tipo === "advertencia" ? "!" : "i"}</span>
    <div className="notificacion-flotante-contenido"><strong>{titulo ?? titulosPorTipo[tipo]}</strong><p>{mensaje}</p>{accion && <button className="notificacion-flotante-accion" type="button" onClick={() => { accion.ejecutar(); onCerrar(); }}>{accion.etiqueta}</button>}</div>
    <button className="notificacion-flotante-cerrar" type="button" aria-label="Cerrar notificación" onClick={onCerrar}>×</button>
  </div>;
}

// Compatibilidad para los emisores existentes: la notificación siempre se monta
// en el contenedor raíz, aunque el componente se invoque desde una pantalla.
export function NotificacionFlotante({ tipo, mensaje, titulo, duracionMs, accion, onCerrar }: PropsNotificacionFlotante) {
  const alertas = useAlertas();
  const ultimaPublicacion = useRef("");
  useEffect(() => {
    const huella = `${tipo}|${titulo ?? ""}|${mensaje}|${duracionMs ?? ""}|${accion?.etiqueta ?? ""}`;
    if (ultimaPublicacion.current === huella) return;
    ultimaPublicacion.current = huella;
    alertas.mostrar({ tipo, mensaje, titulo, duracionMs, accion, alCerrar: onCerrar });
  }, [alertas, tipo, mensaje, titulo, duracionMs, accion, onCerrar]);
  return null;
}
