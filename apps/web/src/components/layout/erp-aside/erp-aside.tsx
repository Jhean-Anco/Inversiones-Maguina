import "./erp-aside.css";
import { Fragment, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
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
  /** En escritorio, true cuando el aside está colapsado a 76 px. */
  contraido: boolean;
  menuMovilAbierto: boolean;
  botonMenuRef: RefObject<HTMLButtonElement | null>;
  onContraidoChange: (contraido: boolean) => void;
  onCerrarMenuMovil: () => void;
  onNavegarResumen: () => void;
};

const CONTROLES_ENFOCABLES = "a[href], button:not(:disabled)";

function crearIdSubnav(nombre: string) {
  return `erp-subnav-${nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-PE").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function ErpAside({ moduloActivo, submoduloActivo, navegacionVisible, dashboardActivo, contraido, menuMovilAbierto, botonMenuRef, onContraidoChange, onCerrarMenuMovil, onNavegarResumen }: ErpAsideProps) {
  const perfilViewport = useViewportProfile();
  const perfilAmplio = perfilViewport === "laptop" || perfilViewport === "tablet-landscape";
  const perfilCompacto = !perfilAmplio;
  const asideOculto = perfilCompacto && !menuMovilAbierto;
  const expandido = perfilCompacto || !contraido;
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);
  const menuEstuvoAbierto = useRef(false);

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
    if (contraido && perfilAmplio) {
      onContraidoChange(false);
      setSeccionAbierta(nombre);
      return;
    }
    setSeccionAbierta((abierta) => (abierta === nombre ? null : nombre));
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
        <div className={`erp-aside${expandido ? " is-expanded" : ""}`}>
          <div className="erp-aside__marca">
            <img className="erp-aside__logo" src="/logo.webp" alt="Inversiones Maguiña" />
            <strong className="erp-aside__nombre">MAGUIÑA</strong>
            {perfilAmplio && expandido && (
              <button className="erp-aside__colapsar" type="button" aria-label="Contraer menú" onClick={() => onContraidoChange(true)}>
                <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
            )}
          </div>

          <nav className="erp-aside__nav" aria-label="Secciones">
            {navegacionVisible.map((elemento, indice) => {
              const nuevaSeccion = Boolean(elemento.seccion) && elemento.seccion !== navegacionVisible[indice - 1]?.seccion;
              const etiquetaSeccion = nuevaSeccion ? <span className="erp-aside__seccion" aria-hidden="true">{elemento.seccion}</span> : null;
              if (elemento.ruta) {
                return (
                  <Fragment key={elemento.nombre}>
                    {etiquetaSeccion}
                    <Link
                      className={`erp-aside__fila${dashboardActivo ? " is-current" : ""}`}
                      to={elemento.ruta}
                      title={expandido ? undefined : elemento.nombre}
                      aria-current={dashboardActivo ? "page" : undefined}
                      onClick={() => { onNavegarResumen(); onCerrarMenuMovil(); if (perfilAmplio) onContraidoChange(true); }}
                    >
                      <Icono nombre={elemento.icono} /><span className="erp-aside__texto">{elemento.nombre}</span>
                    </Link>
                  </Fragment>
                );
              }
              const abierto = seccionAbierta === elemento.nombre;
              const idSubnav = crearIdSubnav(elemento.nombre);
              return (
                <Fragment key={elemento.nombre}>
                  {etiquetaSeccion}
                  <button
                    className={`erp-aside__fila${moduloActivo?.nombre === elemento.nombre ? " is-current" : ""}`}
                    type="button"
                    title={expandido ? undefined : elemento.nombre}
                    aria-expanded={abierto && expandido}
                    aria-controls={idSubnav}
                    onClick={() => alternarModulo(elemento.nombre)}
                  >
                    <Icono nombre={elemento.icono} /><span className="erp-aside__texto">{elemento.nombre}</span>
                    <svg className="erp-aside__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  <div id={idSubnav} className={`erp-aside__subnav${abierto ? " is-open" : ""}`} aria-hidden={!abierto || !expandido} inert={!abierto || !expandido}>
                    <div className="erp-aside__subnav-lista">
                      {elemento.hijos.map((hijo, orden) => {
                        const actual = submoduloActivo?.ruta === hijo.ruta;
                        return (
                          <Link
                            className={`erp-aside__sub${actual ? " is-current" : ""}`}
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
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </nav>

          {perfilAmplio && !expandido && (
            <button className="erp-aside__expandir" type="button" aria-label="Expandir menú" onClick={() => onContraidoChange(false)}>
              <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
