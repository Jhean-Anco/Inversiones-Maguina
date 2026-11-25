import "./erp-aside.css";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { Link } from "react-router-dom";
import { useViewportProfile } from "../../../utilidades/use-viewport-profile";
import { Icono } from "./erp-icon";
import type { ModuloAside, SubmoduloAside } from "./navegacion-aside";
export { Icono } from "./erp-icon";
export { obtenerNavegacionAside } from "./navegacion-aside";

type ErpAsideProps = {
  moduloActivo?: ModuloAside;
  submoduloActivo?: SubmoduloAside;
  navegacionVisible: ModuloAside[];
  dashboardActivo: boolean;
  /** En escritorio, true cuando el panel de submódulos está oculto. */
  contraido: boolean;
  menuMovilAbierto: boolean;
  botonMenuRef: RefObject<HTMLButtonElement | null>;
  onContraidoChange: (contraido: boolean) => void;
  onCerrarMenuMovil: () => void;
  onNavegarResumen: () => void;
};

const ID_PANEL = "erp-aside-panel";
const CONTROLES_ENFOCABLES = "a[href], button:not(:disabled)";

export function ErpAside({ moduloActivo, submoduloActivo, navegacionVisible, dashboardActivo, contraido, menuMovilAbierto, botonMenuRef, onContraidoChange, onCerrarMenuMovil, onNavegarResumen }: ErpAsideProps) {
  const perfilViewport = useViewportProfile();
  const perfilAmplio = perfilViewport === "laptop" || perfilViewport === "tablet-landscape";
  const perfilCompacto = !perfilAmplio;
  const asideOculto = perfilCompacto && !menuMovilAbierto;
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const menuEstuvoAbierto = useRef(false);

  const modulosConHijos = navegacionVisible.filter((modulo) => modulo.hijos.length > 0);
  const moduloPanel = modulosConHijos.find((modulo) => modulo.nombre === seccionAbierta)
    ?? (perfilCompacto ? modulosConHijos.find((modulo) => modulo.nombre === moduloActivo?.nombre) ?? modulosConHijos[0] : undefined);
  const panelAbierto = Boolean(moduloPanel) && (perfilCompacto || !contraido);

  useEffect(() => {
    if (perfilAmplio && menuMovilAbierto) onCerrarMenuMovil();
  }, [menuMovilAbierto, onCerrarMenuMovil, perfilAmplio]);

  useEffect(() => {
    setSeccionAbierta(moduloActivo?.nombre ?? null);
  }, [moduloActivo?.nombre]);

  useEffect(() => {
    if (contraido || !perfilAmplio) return;
    const contraerAlPulsarFuera = (evento: PointerEvent) => {
      if (!asideRef.current?.contains(evento.target as Node)) onContraidoChange(true);
    };
    document.addEventListener("pointerdown", contraerAlPulsarFuera);
    return () => document.removeEventListener("pointerdown", contraerAlPulsarFuera);
  }, [contraido, onContraidoChange, perfilAmplio]);

  useLayoutEffect(() => {
    if (!perfilCompacto) {
      menuEstuvoAbierto.current = false;
      return;
    }
    if (menuMovilAbierto) {
      menuEstuvoAbierto.current = true;
      asideRef.current?.querySelector<HTMLElement>(CONTROLES_ENFOCABLES)?.focus();
      return;
    }
    if (menuEstuvoAbierto.current) botonMenuRef.current?.focus();
    menuEstuvoAbierto.current = false;
  }, [botonMenuRef, menuMovilAbierto, perfilCompacto]);

  const alternarModulo = (nombre: string) => {
    if (perfilAmplio && !contraido && seccionAbierta === nombre) {
      onContraidoChange(true);
      return;
    }
    setSeccionAbierta(nombre);
    if (perfilAmplio) onContraidoChange(false);
  };

  const manejarTecladoAside = (evento: ReactKeyboardEvent<HTMLElement>) => {
    if (evento.key === "Escape" && perfilAmplio && !contraido) {
      evento.preventDefault();
      onContraidoChange(true);
      return;
    }
    if (!perfilCompacto || !menuMovilAbierto) return;
    if (evento.key === "Escape") {
      evento.preventDefault();
      onCerrarMenuMovil();
      return;
    }
    if (evento.key !== "Tab") return;
    const controles = Array.from(asideRef.current?.querySelectorAll<HTMLElement>(CONTROLES_ENFOCABLES) ?? [])
      .filter((control) => control.getClientRects().length > 0 && !control.closest("[inert], [aria-hidden='true']"));
    if (!controles.length) return;
    const primero = controles[0];
    const ultimo = controles[controles.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  };

  const conteoSubmodulos = moduloPanel ? `${moduloPanel.hijos.length} ${moduloPanel.hijos.length === 1 ? "módulo" : "módulos"}` : "";

  return (
    <>
      {perfilCompacto && menuMovilAbierto && <button className="erp-aside-velo" aria-label="Cerrar menú" type="button" onClick={onCerrarMenuMovil} />}
      <aside
        ref={asideRef}
        id="erp-primary-aside"
        className="erp-sidebar"
        aria-label="Navegación principal"
        aria-hidden={asideOculto}
        inert={asideOculto}
        onKeyDown={manejarTecladoAside}
      >
        <div className="erp-rail">
          <img className="erp-rail__marca" src="/logo.webp" alt="Inversiones Maguiña" />
          <nav className="erp-rail__nav" aria-label="Módulos">
            {navegacionVisible.map((elemento) => {
              const etiqueta = elemento.etiqueta ?? elemento.nombre;
              if (elemento.ruta) {
                return (
                  <Link
                    className={`erp-rail__item${dashboardActivo ? " is-current" : ""}`}
                    key={elemento.nombre}
                    to={elemento.ruta}
                    title={elemento.nombre}
                    aria-current={dashboardActivo ? "page" : undefined}
                    onClick={() => { onNavegarResumen(); onCerrarMenuMovil(); if (perfilAmplio) onContraidoChange(true); }}
                  >
                    <Icono nombre={elemento.icono} /><span className="erp-rail__etiqueta">{etiqueta}</span>
                  </Link>
                );
              }
              return (
                <button
                  className={`erp-rail__item${moduloActivo?.nombre === elemento.nombre ? " is-current" : ""}`}
                  key={elemento.nombre}
                  type="button"
                  title={elemento.nombre}
                  aria-expanded={panelAbierto && moduloPanel?.nombre === elemento.nombre}
                  aria-controls={ID_PANEL}
                  onClick={() => alternarModulo(elemento.nombre)}
                >
                  <Icono nombre={elemento.icono} /><span className="erp-rail__etiqueta">{etiqueta}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {moduloPanel && (
          <div id={ID_PANEL} className={`erp-panel${panelAbierto ? " is-open" : ""}`} aria-hidden={!panelAbierto} inert={!panelAbierto}>
            <div className="erp-panel__cabecera">
              <strong className="erp-panel__titulo">{moduloPanel.nombre}</strong>
              <span className="erp-panel__conteo">{conteoSubmodulos}</span>
            </div>
            <nav className="erp-panel__lista" aria-label={`Submódulos de ${moduloPanel.nombre}`}>
              {moduloPanel.hijos.map((hijo, orden) => {
                const actual = submoduloActivo?.ruta === hijo.ruta;
                return (
                  <Link
                    className={`erp-panel__enlace${actual ? " is-current" : ""}`}
                    to={hijo.ruta}
                    key={hijo.ruta}
                    aria-current={actual ? "page" : undefined}
                    style={{ "--orden": orden } as CSSProperties}
                    onClick={() => { onCerrarMenuMovil(); if (perfilAmplio) onContraidoChange(true); }}
                  >
                    {hijo.nombre}
                  </Link>
                );
              })}
            </nav>
            <button className="erp-panel__ocultar" type="button" onClick={() => onContraidoChange(true)}>
              <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              Ocultar panel
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
