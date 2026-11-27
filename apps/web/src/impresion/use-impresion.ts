import { useCallback, useRef, useState } from "react";
import { ejecutarImpresion, type ObtenerDocumento, prepararImpresion, type ResultadoImpresion } from "./servicio-impresion";
import type { FormatoImpresion } from "./tipos";

export type Avisos = { exito: (mensaje: string) => void; error: (mensaje: string) => void; advertencia: (mensaje: string) => void };

export function mensajeErrorImpresion(error: unknown) {
  if (error instanceof DOMException && error.name === "NotFoundError") return "No se eligió ninguna impresora.";
  if (error instanceof DOMException && error.name === "SecurityError") return "El navegador bloqueó el acceso a la impresora. Vuelve a intentarlo con un clic.";
  if (error instanceof DOMException && error.name === "NetworkError") return "No se pudo conectar con la impresora. Verifica que esté encendida, cerca y sin otra conexión activa.";
  return error instanceof Error && error.message ? error.message : "No se pudo imprimir el documento.";
}

/** Comunica el resultado de una impresión: advertencias del documento, respaldo por diálogo y envío directo. */
export function avisarResultado({ modo, documento, errorDirecto }: ResultadoImpresion, avisos: Avisos) {
  for (const advertencia of documento.advertencias) avisos.advertencia(advertencia);
  if (errorDirecto) avisos.advertencia(`${mensajeErrorImpresion(errorDirecto)} Se abrió el diálogo de impresión.`);
  if (modo === "directo") avisos.exito(`${documento.serieNumero} enviado a la impresora.`);
  if (modo === "pestana") avisos.advertencia("Tu navegador abrirá el PDF en otra pestaña; imprímelo desde allí.");
}

/** Estado de impresión para botones/menús: evita dobles clics y comunica resultados y advertencias. */
export function useImpresion(avisos: Avisos) {
  const [imprimiendo, setImprimiendo] = useState(false);
  const enCurso = useRef(false);
  const avisosRef = useRef(avisos);
  avisosRef.current = avisos;

  const imprimir = useCallback(async (obtener: ObtenerDocumento, formato: FormatoImpresion) => {
    if (enCurso.current) return false;
    enCurso.current = true;
    setImprimiendo(true);
    try {
      avisarResultado(await ejecutarImpresion(obtener, await prepararImpresion(formato)), avisosRef.current);
      return true;
    } catch (error) {
      avisosRef.current.error(mensajeErrorImpresion(error));
      return false;
    } finally {
      enCurso.current = false;
      setImprimiendo(false);
    }
  }, []);

  return { imprimiendo, imprimir };
}
