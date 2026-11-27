import { useState, type FormEvent } from "react";

type ControlConValidacion = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/**
 * Muestra la validación nativa del navegador junto a cada campo (por `id`) en lugar de la burbuja,
 * y enfoca el primer campo inválido. No cambia qué campos son válidos.
 */
export function useErroresValidacion() {
  const [errores, setErrores] = useState<Record<string, string>>({});

  function alInvalido(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const control = evento.target as ControlConValidacion;
    if (!control.id) return;
    setErrores((actual) => ({ ...actual, [control.id]: control.validationMessage }));
    if (control.form?.querySelector("input:invalid, select:invalid, textarea:invalid") === control) control.focus();
  }

  function alEscribir(evento: FormEvent<HTMLFormElement>) {
    const { id } = evento.target as ControlConValidacion;
    setErrores((actual) => {
      if (!(id in actual)) return actual;
      const { [id]: _quitado, ...resto } = actual;
      return resto;
    });
  }

  return { errores, propsFormulario: { onInvalidCapture: alInvalido, onInput: alEscribir } };
}
