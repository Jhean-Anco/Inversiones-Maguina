import { ChevronDown } from "lucide-react";
import type { KeyboardEvent, ReactNode, SelectHTMLAttributes } from "react";

/** Campos con la base `os-*` de Órdenes de servicio (46px, radio 10px, foco azul). */
export const claseCampoGuia = "os-campo";

export function SeccionGuia({ paso, titulo, id, extra, children }: { paso: number; titulo: string; id: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="os-tarjeta" aria-labelledby={id}>
      <div className="os-tarjeta-cabecera">
        <div className="os-titulo"><span className="os-paso" aria-hidden="true">{paso}</span><h3 id={id}>{titulo}</h3>{extra}</div>
      </div>
      {children}
    </section>
  );
}

export function SelectGuia({ children, ...propiedades }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className="os-select"><select {...propiedades}>{children}</select><ChevronDown aria-hidden="true" size={16} /></span>;
}

export function evitarEnvioBusqueda(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === "Enter") evento.preventDefault();
}
