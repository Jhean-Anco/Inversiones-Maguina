import type { ButtonHTMLAttributes } from "react";
import { FileCheck2, Pencil, Power, PowerOff, Trash2, type LucideIcon } from "lucide-react";
import { BotonAccion } from "./boton-accion";
import { BotonEditarConfirmacion } from "./confirmar-edicion";

type Accion = "editar" | "activar" | "desactivar" | "eliminar" | "emitir";

type Propiedades = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title" | "onClick"> & {
  accion: Accion;
  etiqueta: string;
  onClick?: () => void;
  confirmacion?: { titulo: string; descripcion: string; etiquetaCancelar?: string; etiquetaConfirmar?: string };
};

const iconos = {
  editar: Pencil,
  activar: Power,
  desactivar: PowerOff,
  eliminar: Trash2,
  emitir: FileCheck2,
} satisfies Record<Accion, LucideIcon>;

export function AccionIcono({ accion, etiqueta, className = "", onClick, confirmacion, ...propiedades }: Propiedades) {
  const Icono = iconos[accion];
  const tono = accion === "eliminar" || accion === "desactivar" ? "peligro" : accion === "emitir" ? "informativa" : accion === "activar" ? "positiva" : "principal";
  const entidad = etiqueta.replace(/^(editar|configurar)\s+/i, "");
  const boton = <BotonAccion {...propiedades} etiqueta={etiqueta} tono={tono} className={className} icono={<Icono aria-hidden="true" size={16} strokeWidth={2} />} />;

  if (accion !== "editar") return <BotonAccion {...propiedades} etiqueta={etiqueta} tono={tono} className={className} icono={<Icono aria-hidden="true" size={16} strokeWidth={2} />} onClick={onClick} />;

  return <BotonEditarConfirmacion
    titulo={confirmacion?.titulo ?? `¿Editar ${entidad}?`}
    descripcion={confirmacion?.descripcion ?? `Vas a abrir ${entidad} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`}
    etiquetaCancelar={confirmacion?.etiquetaCancelar ?? "Volver al listado"}
    etiquetaConfirmar={confirmacion?.etiquetaConfirmar ?? `Sí, editar`}
    onConfirmar={() => onClick?.()}
  >{boton}</BotonEditarConfirmacion>;
}
