import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import "./accion-principal.css";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  etiqueta: string;
  icono?: ReactNode;
};

type AccionRegistrada = { id: symbol; etiqueta: string; ejecutar: () => void; disabled?: boolean };
type ContextoAccion = { registrar: (accion: AccionRegistrada) => void; limpiar: (id: symbol) => void };
const AccionPrincipalContext = createContext<ContextoAccion | null>(null);

export function AccionPrincipalProvider({ children }: { children: ReactNode }) {
  const [acciones, setAcciones] = useState<AccionRegistrada[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const contexto = useMemo<ContextoAccion>(() => ({ registrar: (accion) => setAcciones((actuales) => [...actuales.filter((actual) => actual.id !== accion.id), accion]), limpiar: (id) => setAcciones((actuales) => actuales.filter((actual) => actual.id !== id)) }), []);
  const accionesUnicas = acciones.filter((accion, indice) => acciones.findIndex((actual) => actual.etiqueta === accion.etiqueta) === indice);
  const accion = accionesUnicas.at(-1) ?? null;
  const ejecutarAccion = () => {
    if (accionesUnicas.length > 1) setMenuAbierto((abierto) => !abierto);
    else { setMenuAbierto(false); accion?.ejecutar(); }
  };
  return <AccionPrincipalContext.Provider value={contexto}>
    {children}
    {accion && <>
      {menuAbierto && accionesUnicas.length > 1 && <div className="erp-accion-menu" role="group" aria-label="Acciones para crear">{accionesUnicas.map((opcion) => <button type="button" key={opcion.etiqueta} disabled={opcion.disabled} onClick={() => { setMenuAbierto(false); opcion.ejecutar(); }}>{opcion.etiqueta}</button>)}</div>}
      <BotonAccionPrincipal etiqueta={accionesUnicas.length > 1 ? `Crear: ${accionesUnicas.map((opcion) => opcion.etiqueta.replace(/^Crear\s+/i, "")).join(" o ")}` : accion.etiqueta} onClick={ejecutarAccion} disabled={accionesUnicas.every((opcion) => opcion.disabled)} aria-haspopup={accionesUnicas.length > 1 ? "true" : undefined} aria-expanded={accionesUnicas.length > 1 ? menuAbierto : undefined} />
    </>}
  </AccionPrincipalContext.Provider>;
}

export function useAccionPrincipal(accion: { etiqueta: string; onClick: () => void; disabled?: boolean } | null) {
  const contexto = useContext(AccionPrincipalContext);
  const accionRef = useRef(accion);
  accionRef.current = accion;
  useLayoutEffect(() => {
    if (!contexto || !accion) return;
    const id = Symbol(accion.etiqueta);
    contexto.registrar({ id, etiqueta: accion.etiqueta, ejecutar: () => accionRef.current?.onClick(), disabled: accion.disabled });
    return () => contexto.limpiar(id);
  }, [contexto, accion?.etiqueta, accion?.disabled, Boolean(accion)]);
}

export function RegistrarAccionPrincipal(props: { etiqueta: string; onClick: () => void; disabled?: boolean }) {
  useAccionPrincipal(props);
  return null;
}

export function BotonAccionPrincipal({ etiqueta, icono = "+", type = "button", ...props }: Props) {
  return <button className="erp-accion-principal is-floating" type={type} aria-label={etiqueta} title={etiqueta} {...props}>
    <span className="erp-accion-principal-icon" aria-hidden="true">{icono}</span>
    <span className="erp-accion-principal-label">{etiqueta}</span>
  </button>;
}
