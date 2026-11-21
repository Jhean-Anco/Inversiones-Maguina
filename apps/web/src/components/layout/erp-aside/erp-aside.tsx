import "./erp-aside.css";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from "react";
import { Link } from "react-router-dom";
import { useViewportProfile } from "../../../utilidades/use-viewport-profile";
import { asideClasses } from "./erp-aside-classes";
import { Icono } from "./erp-icon";
import type { ModuloAside, SubmoduloAside } from "./navegacion-aside";
export { Icono } from "./erp-icon";
export { obtenerNavegacionAside } from "./navegacion-aside";

type ErpAsideProps = {
  moduloActivo?: ModuloAside;
  submoduloActivo?: SubmoduloAside;
  navegacionVisible: ModuloAside[];
  dashboardActivo: boolean;
  contraido: boolean;
  menuMovilAbierto: boolean;
  botonMenuRef: RefObject<HTMLButtonElement | null>;
  onContraidoChange: (contraido: boolean) => void;
  onCerrarMenuMovil: () => void;
  onNavegarResumen: () => void;
};

function crearIdSubnav(nombre: string) {
  return `erp-subnav-${nombre.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-PE").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function ErpAside({ moduloActivo, submoduloActivo, navegacionVisible, dashboardActivo, contraido, menuMovilAbierto, botonMenuRef, onContraidoChange, onCerrarMenuMovil, onNavegarResumen }: ErpAsideProps) {
  const perfilViewport = useViewportProfile();
  const perfilAmplio = perfilViewport === "laptop" || perfilViewport === "tablet-landscape";
  const perfilCompacto = !perfilAmplio;
  const asideOculto = perfilCompacto && !menuMovilAbierto;
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
      const primerControl = asideRef.current?.querySelector<HTMLElement>("a[href], button:not(:disabled)");
      primerControl?.focus();
      return;
    }
    if (menuEstuvoAbierto.current) botonMenuRef.current?.focus();
    menuEstuvoAbierto.current = false;
  }, [botonMenuRef, menuMovilAbierto, perfilCompacto]);

  const manejarTecladoAside = (evento: ReactKeyboardEvent<HTMLElement>) => {
    if (!perfilCompacto || !menuMovilAbierto) return;
    if (evento.key === "Escape") {
      evento.preventDefault();
      onCerrarMenuMovil();
      return;
    }
    if (evento.key !== "Tab") return;
    const controles = Array.from(asideRef.current?.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)") ?? [])
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
      {perfilCompacto && menuMovilAbierto && <button className={asideClasses.mobileScrim} aria-label="Cerrar menú" type="button" onClick={onCerrarMenuMovil} />}
      <aside
        ref={asideRef}
        id="erp-primary-aside"
        className={`erp-sidebar ${asideClasses.sidebar}`}
        aria-label="Navegación principal"
        aria-hidden={asideOculto}
        inert={asideOculto}
        onKeyDown={manejarTecladoAside}
      >
        <div className={asideClasses.brand}>
          <img className={asideClasses.brandLogo} src="/logo.webp" alt="Inversiones Maguiña" />
          <div className={asideClasses.brandCopy}><strong className={asideClasses.brandName}>MAGUIÑA</strong></div>
        </div>
        <nav className={asideClasses.navigation} aria-label="Secciones">
          {navegacionVisible.map((elemento) => elemento.ruta ? (
            <Link
              className={`erp-nav-link ${asideClasses.navLink} erp-nav-direct ${asideClasses.directLink}${dashboardActivo ? ` is-active ${asideClasses.activeNavLink}` : ""}`}
              key={elemento.nombre}
              to={elemento.ruta}
              aria-current={dashboardActivo ? "page" : undefined}
              title={contraido ? elemento.nombre : undefined}
              onClick={() => { onNavegarResumen(); onCerrarMenuMovil(); if (perfilAmplio) onContraidoChange(true); }}
            >
              <Icono nombre={elemento.icono} /><span className={asideClasses.navigationLabel}>{elemento.nombre}</span>
            </Link>
          ) : (
            <div className={`erp-nav-group ${asideClasses.navigationGroup}`} key={elemento.nombre}>
              <button
                className={`erp-nav-link ${asideClasses.navLink} erp-nav-module-button ${asideClasses.moduleButton}${moduloActivo?.nombre === elemento.nombre ? ` ${asideClasses.currentModuleButton}` : ""}`}
                type="button"
                aria-expanded={seccionAbierta === elemento.nombre}
                aria-controls={crearIdSubnav(elemento.nombre)}
                title={contraido ? elemento.nombre : undefined}
                onClick={() => {
                  if (contraido && perfilAmplio) { onContraidoChange(false); setSeccionAbierta(elemento.nombre); }
                  else setSeccionAbierta((abierta) => abierta === elemento.nombre ? null : elemento.nombre);
                }}
              >
                <Icono nombre={elemento.icono} /><span className={asideClasses.navigationLabel}>{elemento.nombre}</span><i className={`${asideClasses.navChevron}${seccionAbierta === elemento.nombre ? ` is-open ${asideClasses.openNavChevron}` : ""}`} />
              </button>
              <div id={crearIdSubnav(elemento.nombre)} className={`${asideClasses.subnav}${seccionAbierta === elemento.nombre ? " is-open" : ""}`} aria-hidden={seccionAbierta !== elemento.nombre} inert={seccionAbierta !== elemento.nombre}>
                <div className={asideClasses.subnavInner}>
                  {elemento.hijos.map((hijo) => (
                    <Link
                      className={`${asideClasses.subnavLink} ${submoduloActivo?.ruta === hijo.ruta ? asideClasses.currentSubnavLink : ""}`}
                      to={hijo.ruta}
                      key={hijo.ruta}
                      aria-current={submoduloActivo?.ruta === hijo.ruta ? "page" : undefined}
                      onClick={() => { onCerrarMenuMovil(); if (perfilAmplio) onContraidoChange(true); }}
                    >
                      <span className="subnav-marker" />{hijo.nombre}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
