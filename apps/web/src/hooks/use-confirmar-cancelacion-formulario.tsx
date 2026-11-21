import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { ConfirmarDescarteFormulario } from "../components/ui/confirmar-descarte-formulario";

function obtenerFirma(formulario: HTMLFormElement | null) {
  if (!formulario) return "[]";
  return JSON.stringify(Array.from(formulario.elements).flatMap((elemento) => {
    if (!(elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement || elemento instanceof HTMLTextAreaElement)) return [];
    if (["button", "submit", "reset"].includes(elemento.type)) return [];
    return [[elemento.name, elemento.type, elemento.value, elemento instanceof HTMLInputElement ? elemento.checked : undefined, elemento instanceof HTMLSelectElement ? Array.from(elemento.selectedOptions).map((opcion) => opcion.value) : undefined]];
  }));
}

/** Guarda la firma inicial del formulario y confirma antes de perder cambios. */
export function useConfirmarCancelacionFormulario(referencia: RefObject<HTMLFormElement | null>, onDescartar: () => void, elemento: string, firmaDatos?: string) {
  const [abierto, setAbierto] = useState(false);
  const firmaInicial = useRef<string | null>(null);
  const firmaDatosInicial = useRef(firmaDatos);
  const descartarRef = useRef(onDescartar);
  descartarRef.current = onDescartar;

  useEffect(() => {
    firmaInicial.current = firmaDatosInicial.current ?? obtenerFirma(referencia.current);
  }, [referencia]);

  const cancelar = useCallback(() => {
    if (firmaInicial.current !== (firmaDatos ?? obtenerFirma(referencia.current))) {
      setAbierto(true);
      return;
    }
    descartarRef.current();
  }, [referencia]);

  const dialogo = abierto ? <ConfirmarDescarteFormulario elemento={elemento} onSeguirEditando={() => setAbierto(false)} onDescartar={() => { setAbierto(false); descartarRef.current(); }} /> : null;
  return { solicitarCancelacion: cancelar, dialogo };
}
