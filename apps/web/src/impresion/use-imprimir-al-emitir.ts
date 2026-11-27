import { useCallback, useRef } from "react";
import { leerFormato } from "./memoria-impresion";
import { ejecutarImpresion, type ImpresionPreparada, type ObtenerDocumento, prepararImpresion } from "./servicio-impresion";
import type { FormatoImpresion } from "./tipos";
import { type Avisos, avisarResultado, mensajeErrorImpresion } from "./use-impresion";

/** Tamaño inicial de la vista previa: el último que se usó en este equipo (Ticket por defecto). */
export const tamanoInicial = (): FormatoImpresion => leerFormato();

/**
 * Flujo "guardar e imprimir": `preparar` se llama en el clic (antes de guardar o emitir, porque el
 * navegador exige un gesto para pedir la impresora) e `imprimir` cuando el documento ya existe.
 * Nunca lanza: si algo falla, el documento queda guardado y se avisa cómo reimprimirlo.
 */
export function useImprimirAlEmitir(avisos: Avisos) {
  const avisosRef = useRef(avisos);
  avisosRef.current = avisos;

  const preparar = useCallback((formato: FormatoImpresion = leerFormato()) => prepararImpresion(formato), []);

  const imprimir = useCallback(async (obtener: ObtenerDocumento, preparada: ImpresionPreparada) => {
    try { avisarResultado(await ejecutarImpresion(obtener, preparada), avisosRef.current); }
    catch (error) { avisosRef.current.error(`No se pudo imprimir: ${mensajeErrorImpresion(error)} Puedes reimprimirlo desde el listado.`); }
  }, []);

  return { preparar, imprimir };
}
