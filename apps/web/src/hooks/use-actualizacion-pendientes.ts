import { useEffect, useRef } from "react";

export const INTERVALO_PENDIENTES_MS = 15_000;

/**
 * Vuelve a cargar en silencio un listado mientras tenga documentos pendientes de SUNAT. No consulta con la pestaña
 * oculta (refresca al volver), no solapa peticiones y descarta respuestas que lleguen tras cambiar `clave` (filtros o página).
 */
export function useActualizacionPendientes<T>({ activo, clave, consultar, aplicar, intervaloMs = INTERVALO_PENDIENTES_MS }: {
  activo: boolean; clave: string; consultar: () => Promise<T>; aplicar: (resultado: T) => void; intervaloMs?: number;
}) {
  const funciones = useRef({ consultar, aplicar });
  funciones.current = { consultar, aplicar };

  useEffect(() => {
    if (!activo) return;
    let vigente = true;
    let consultando = false;
    const actualizar = () => {
      if (consultando || document.visibilityState === "hidden") return;
      consultando = true;
      funciones.current.consultar()
        .then((resultado) => { if (vigente) funciones.current.aplicar(resultado); })
        // Un fallo puntual no interrumpe la pantalla: se reintenta en el siguiente intervalo.
        .catch(() => undefined)
        .finally(() => { consultando = false; });
    };
    const temporizador = window.setInterval(actualizar, intervaloMs);
    document.addEventListener("visibilitychange", actualizar);
    return () => {
      vigente = false;
      window.clearInterval(temporizador);
      document.removeEventListener("visibilitychange", actualizar);
    };
  }, [activo, clave, intervaloMs]);
}
