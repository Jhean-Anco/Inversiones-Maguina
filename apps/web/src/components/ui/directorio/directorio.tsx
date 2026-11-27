import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { BotonAccion } from "../boton-accion";
import { ventasClasses as v } from "../../../pages/ventas-page/ventas-classes";

/** Buscador de 46px con lupa para la barra de herramientas de los directorios. */
export function BuscadorDirectorio({ valor, alCambiar, placeholder, etiqueta, id }: { valor: string; alCambiar: (valor: string) => void; placeholder: string; etiqueta: string; id?: string }) {
  return <label className={`${v.search} listado-maestro-busqueda-icono`}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
    <input id={id} type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={etiqueta} autoComplete="off" />
  </label>;
}

/** Llamar / WhatsApp / Correo; cada acción aparece solo si hay dato. */
export function AccionesContacto({ nombre, telefono, correo }: { nombre: string; telefono?: string | null; correo?: string | null }) {
  const digitos = telefono?.replace(/\D/g, "");
  return <>
    {digitos && <BotonAccion etiqueta={`Llamar a ${nombre}`} tono="informativa" icono={<Phone aria-hidden="true" />} href={`tel:${digitos}`} />}
    {digitos && <BotonAccion etiqueta={`Escribir por WhatsApp a ${nombre}`} tono="positiva" icono={<MessageCircle aria-hidden="true" />} href={`https://wa.me/${digitos.length === 9 ? `51${digitos}` : digitos}`} />}
    {correo && <BotonAccion etiqueta={`Enviar correo a ${nombre}`} tono="informativa" icono={<Mail aria-hidden="true" />} href={`mailto:${correo}`} />}
  </>;
}

/** Select personalizado (sin estilo nativo) para formularios `directorio-form-grid`. */
export function SelectDirectorio({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <span className="directorio-select"><select {...props}>{children}</select><ChevronDown aria-hidden="true" /></span>;
}

export const Opcional = () => <span className="directorio-opcional">Opcional</span>;

export const directorioClasses = {
  boton: "min-h-[46px] cursor-pointer rounded-[10px] border border-[#0b2545] bg-[#0b2545] px-4 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-[.55]",
};
