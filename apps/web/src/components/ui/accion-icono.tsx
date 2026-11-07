import type { ButtonHTMLAttributes } from "react";
import { Pencil, Power, PowerOff, Trash2, type LucideIcon } from "lucide-react";

type Accion = "editar" | "activar" | "desactivar" | "eliminar";

type Propiedades = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> & {
  accion: Accion;
  etiqueta: string;
};

const iconos = {
  editar: Pencil,
  activar: Power,
  desactivar: PowerOff,
  eliminar: Trash2,
} satisfies Record<Accion, LucideIcon>;

export function AccionIcono({ accion, etiqueta, className = "", ...propiedades }: Propiedades) {
  const Icono = iconos[accion];
  const peligrosa = accion === "eliminar" || accion === "desactivar";

  return <button
    {...propiedades}
    type={propiedades.type ?? "button"}
    className={`erp-icon-action${peligrosa ? " is-danger" : ""}${className ? ` ${className}` : ""}`}
    aria-label={etiqueta}
    title={etiqueta}
  ><Icono aria-hidden="true" size={16} strokeWidth={2} /></button>;
}
