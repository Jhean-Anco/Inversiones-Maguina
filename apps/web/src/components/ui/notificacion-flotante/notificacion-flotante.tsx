import { useEffect } from "react";
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

const titulosPorTipo: Record<TipoNotificacionFlotante, string> = {
  exito: "Operación completada",
  advertencia: "Atención",
  error: "Ocurrió un problema",
  informacion: "Información",
};

export function NotificacionFlotante({ tipo, mensaje, titulo, duracionMs = 5000, accion, onCerrar }: PropsNotificacionFlotante) {
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
