import { useEffect, useState } from "react";

type RespuestaBusqueda<T> = { consulta: string; items: T[]; error?: string };

export function useBusquedaGuia<T>(buscar: (consulta: string) => Promise<T[]>, consulta: string, activa = true) {
  const texto = consulta.trim();
  const [respuesta, setRespuesta] = useState<RespuestaBusqueda<T> | null>(null);

  useEffect(() => {
    if (!activa) return;
    let vigente = true;
    const temporizador = window.setTimeout(() => {
      void buscar(texto).then((items) => {
        if (vigente) setRespuesta({ consulta: texto, items });
      }).catch((error: unknown) => {
        if (vigente) setRespuesta({ consulta: texto, items: [], error: error instanceof Error ? error.message : "No se pudo completar la búsqueda." });
      });
    }, texto ? 220 : 0);
    return () => { vigente = false; window.clearTimeout(temporizador); };
  }, [buscar, texto, activa]);

  const resultado = respuesta?.consulta === texto ? respuesta : null;
  return { items: resultado?.items ?? [], error: resultado?.error, cargando: activa && !resultado };
}
