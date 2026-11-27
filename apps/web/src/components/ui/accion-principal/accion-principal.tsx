import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  etiqueta: string;
  icono?: ReactNode;
};

type AccionRegistrada = { id: symbol; etiqueta: string; ejecutar: () => void; disabled?: boolean };
type ContextoAccion = { registrar: (accion: AccionRegistrada) => void; limpiar: (id: symbol) => void };
const AccionPrincipalContext = createContext<ContextoAccion | null>(null);

const botonAccionPrincipal = [
  "fixed right-[clamp(20px,3vw,44px)] bottom-[clamp(20px,3vh,36px)] z-[70] inline-flex h-14 min-h-14 w-max max-w-[56px] items-center justify-start gap-0 overflow-hidden rounded-[28px] border border-[#b91e30] bg-[linear-gradient(145deg,#d92c40,#bb1d30)] px-[14px] py-0 text-[13px] font-bold text-white shadow-[0_7px_20px_#8c1a2b35,inset_0_1px_0_#ffffff30]",
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--action-primary-focus)]",
  "disabled:cursor-not-allowed disabled:opacity-[.58] disabled:shadow-[0_4px_12px_#8c1a2b20]",
  "[html[data-responsive-profile='mobile-portrait']_&]:right-[18px] [html[data-responsive-profile='mobile-portrait']_&]:bottom-[18px]",
].join(" ");
const iconoAccionPrincipal = [
  "inline-grid h-[26px] w-[26px] shrink-0 place-items-center text-[31px] font-normal leading-none text-inherit",
].join(" ");
const etiquetaAccionPrincipal = [
  "block max-w-0 overflow-hidden opacity-0",
].join(" ");

export function AccionPrincipalProvider({ children }: { children: ReactNode }) {
  const [acciones, setAcciones] = useState<AccionRegistrada[]>([]);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const raizMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuAbierto) return;
    const cerrarAlHacerClickFuera = (evento: PointerEvent) => {
      const objetivo = evento.target;
      if (objetivo instanceof Node && !raizMenuRef.current?.contains(objetivo)) setMenuAbierto(false);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => { if (evento.key === "Escape") setMenuAbierto(false); };
    document.addEventListener("pointerdown", cerrarAlHacerClickFuera, true);
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarAlHacerClickFuera, true);
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [menuAbierto]);
  const contexto = useMemo<ContextoAccion>(() => ({ registrar: (accion) => setAcciones((actuales) => [...actuales.filter((actual) => actual.id !== accion.id), accion]), limpiar: (id) => setAcciones((actuales) => actuales.filter((actual) => actual.id !== id)) }), []);
  const accionesUnicas = acciones.filter((accion, indice) => acciones.findIndex((actual) => actual.etiqueta === accion.etiqueta) === indice);
  const accion = accionesUnicas.at(-1) ?? null;
  const ejecutarAccion = () => {
    if (accionesUnicas.length > 1) setMenuAbierto((abierto) => !abierto);
    else { setMenuAbierto(false); accion?.ejecutar(); }
  };
  return <AccionPrincipalContext.Provider value={contexto}>
    {children}
    {accion && <div ref={raizMenuRef} className="contents">
      {menuAbierto && accionesUnicas.length > 1 && <div className="erp-accion-menu" role="group" aria-label="Acciones para crear">{accionesUnicas.map((opcion) => <button type="button" key={opcion.etiqueta} disabled={opcion.disabled} onClick={() => { setMenuAbierto(false); opcion.ejecutar(); }}>{opcion.etiqueta}</button>)}</div>}
      <BotonAccionPrincipal etiqueta={accionesUnicas.length > 1 ? `Crear: ${accionesUnicas.map((opcion) => opcion.etiqueta.replace(/^Crear\s+/i, "")).join(" o ")}` : accion.etiqueta} onClick={ejecutarAccion} disabled={accionesUnicas.every((opcion) => opcion.disabled)} aria-haspopup={accionesUnicas.length > 1 ? "true" : undefined} aria-expanded={accionesUnicas.length > 1 ? menuAbierto : undefined} />
    </div>}
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

const iconoMas = <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>;

export function BotonAccionPrincipal({ etiqueta, icono = iconoMas, type = "button", ...props }: Props) {
  return <button className={`erp-accion-principal is-floating ${botonAccionPrincipal}`} type={type} aria-label={etiqueta} title={etiqueta} {...props}>
    <span className={`erp-accion-principal-icon ${iconoAccionPrincipal}`} aria-hidden="true">{icono}</span>
    <span className={`erp-accion-principal-label ${etiquetaAccionPrincipal}`}>{etiqueta}</span>
  </button>;
}
