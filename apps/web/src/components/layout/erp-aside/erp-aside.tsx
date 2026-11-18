import "./erp-aside.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { getViewportProfile } from "../../../utilidades/viewport";

type PermisoNavegacion = "INGRESOS.CREAR" | "INGRESOS.LEER" | "EGRESOS.LEER" | "INVENTARIO.LEER" | "MOTOTAXIS.LEER" | "PERSONAS.LEER" | "FINANZAS.LEER" | "FINANZAS.ADMINISTRAR";
type SubmoduloAside = { nombre: string; ruta: string; permiso: PermisoNavegacion; rutasRelacionadas?: string[] };
type ModuloAside = { nombre: string; icono: string; ruta?: string; hijos: SubmoduloAside[] };
const elementosAside: ModuloAside[] = [
  { nombre: "Resumen", icono: "inicio", ruta: "/inicio", hijos: [] },
  {
    nombre: "Ingresos", icono: "venta", hijos: [
      { nombre: "Órdenes de servicio", ruta: "/ingresos/ordenes-servicio", permiso: "INGRESOS.LEER" },
      { nombre: "Cotizaciones", ruta: "/ingresos/cotizaciones", permiso: "INGRESOS.LEER" },
      { nombre: "Venta de repuestos", ruta: "/ingresos/ventas/repuestos", rutasRelacionadas: ["/ingresos/nuevo/repuestos"], permiso: "INGRESOS.LEER" },
      { nombre: "Venta de mototaxis", ruta: "/ingresos/ventas/mototaxis", rutasRelacionadas: ["/ingresos/nuevo/mototaxis"], permiso: "INGRESOS.LEER" },
      { nombre: "Guías de remisión", ruta: "/ingresos/guias", permiso: "INGRESOS.LEER" },
    ]
  },
  {
    nombre: "Egresos", icono: "egresos", hijos: [
      { nombre: "Compra de repuestos", ruta: "/egresos/compras", rutasRelacionadas: ["/egresos/compras/nueva"], permiso: "INVENTARIO.LEER" },
      { nombre: "Compra de mototaxis", ruta: "/mototaxis/compras", rutasRelacionadas: ["/mototaxis/compras/nueva"], permiso: "MOTOTAXIS.LEER" },
    ]
  },
  {
    nombre: "Cat\u00e1logos", icono: "catalogos", hijos: [
      { nombre: "Categor\u00edas", ruta: "/inventario/categorias", permiso: "INVENTARIO.LEER" },
      { nombre: "Marcas", ruta: "/inventario/marcas", permiso: "INVENTARIO.LEER" },
    ]
  },
  {
    nombre: "Inventario", icono: "inventario", hijos: [
      { nombre: "Mototaxis", ruta: "/inventario/mototaxis", rutasRelacionadas: ["/inventario/mototaxis/unidades", "/mototaxis/unidades", "/mototaxis/garantias"], permiso: "MOTOTAXIS.LEER" },
      { nombre: "Repuestos", ruta: "/inventario/productos", permiso: "INVENTARIO.LEER" },
      { nombre: "Ajustes de inventario de repuestos", ruta: "/inventario/movimientos-ajustes", permiso: "INVENTARIO.LEER" },
      { nombre: "Ajustes de inventario de mototaxis", ruta: "/mototaxis/movimientos", permiso: "MOTOTAXIS.LEER" },
    ]
  },
  {
    nombre: "Contactos", icono: "personas", hijos: [
      { nombre: "Clientes", ruta: "/clientes", permiso: "PERSONAS.LEER" },
      { nombre: "Proveedores", ruta: "/personas/proveedores", permiso: "PERSONAS.LEER" },
    ]
  },
  {
    nombre: "Finanzas", icono: "finanzas", hijos: [
      { nombre: "Cuentas y medios de pago", ruta: "/finanzas/cuentas", permiso: "FINANZAS.LEER" },
    ]
  },
  {
    nombre: "Configuración", icono: "administracion", hijos: [
      { nombre: "Series de documentos", ruta: "/configuracion/series", permiso: "FINANZAS.ADMINISTRAR" },
    ]
  },
  {
    nombre: "Reportes", icono: "reportes", hijos: [
      { nombre: "Inventario", ruta: "/reportes/inventario", permiso: "INVENTARIO.LEER" },
      { nombre: "Ingresos", ruta: "/reportes/ingresos", permiso: "INGRESOS.LEER" },
    ]
  },
];

export function Icono({ nombre }: { nombre: string }) {
  const paths: Record<string, ReactNode> = {
    inicio: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    venta: <><path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4L21 9H7" /><circle cx="11" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    compras: <><path d="M4 8h16l-1.5 12h-13L4 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /><path d="M12 11v5m-2-2 2 2 2-2" /></>,
    catalogos: <><path d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2V3.5h9.9l7.3 7.1a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.1" /></>,
    inventario: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 13l9 5 9-5M3 8v9l9 5 9-5V8" /></>,
    mototaxis: <><path d="M4 16h1l2-5h8l3 5h2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M8 11l1-3h5l2 3M3 13h4M19 13h2" /></>,
    finanzas: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4M16 3v6" /></>,
    egresos: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5M12 3v4M12 17v4" /><path d="m9 18 3 3 3-3" /></>,
    personas: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20" /></>,
    reportes: <><path d="M4 20V9M10 20V4M16 20v-7M22 20H2" /><path d="m3 7 6-4 6 7 6-5" /></>,
    documentos: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 5.5v15M8 7h8M8 11h8" /></>,
    administracion: <><circle cx="12" cy="8" r="3" /><path d="M5 20v-1a7 7 0 0 1 14 0v1M19 8h3M20.5 6.5v3" /></>,
    buscar: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    flecha: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    candado: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    salir: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    notificaciones: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  };
  return <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[nombre] ?? paths.inicio}</svg>;
}

export function obtenerNavegacionAside(rutaActual: string, permisos: string[]) {
  const rutaPertenece = (hijo: SubmoduloAside) => hijo.ruta === rutaActual || hijo.rutasRelacionadas?.includes(rutaActual) === true || (rutaActual === "/mototaxis" && hijo.ruta === "/mototaxis/unidades");
  const moduloActivo = elementosAside.find((modulo) => modulo.hijos.some(rutaPertenece));
  const submoduloActivo = moduloActivo?.hijos.find(rutaPertenece);
  const navegacionVisible = elementosAside.map((modulo) => ({ ...modulo, hijos: modulo.hijos.filter((hijo) => permisos.includes(hijo.permiso)) })).filter((modulo) => modulo.ruta || modulo.hijos.length > 0);
  return { moduloActivo, submoduloActivo, navegacionVisible };
}

type ErpAsideProps = {
  rutaActual: string;
  moduloActivo?: ModuloAside;
  submoduloActivo?: SubmoduloAside;
  navegacionVisible: ModuloAside[];
  dashboardActivo: boolean;
  contraido: boolean;
  menuMovilAbierto: boolean;
  onContraidoChange: (contraido: boolean) => void;
  onCerrarMenuMovil: () => void;
  onNavegar: (ruta: string) => void;
  onNavegarResumen: () => void;
};

function esPerfilAmplio() {
  const perfil = getViewportProfile(window.innerWidth, window.innerHeight);
  return perfil === "laptop" || perfil === "tablet-landscape";
}

export function ErpAside({ rutaActual, moduloActivo, submoduloActivo, navegacionVisible, dashboardActivo, contraido, menuMovilAbierto, onContraidoChange, onCerrarMenuMovil, onNavegar, onNavegarResumen }: ErpAsideProps) {
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSeccionAbierta(moduloActivo?.nombre ?? null);
  }, [rutaActual, moduloActivo?.nombre]);

  useEffect(() => {
    if (contraido) return;
    const contraerAlPulsarFuera = (evento: PointerEvent) => {
      if (!esPerfilAmplio()) return;
      if (!asideRef.current?.contains(evento.target as Node)) onContraidoChange(true);
    };
    document.addEventListener("pointerdown", contraerAlPulsarFuera);
    return () => document.removeEventListener("pointerdown", contraerAlPulsarFuera);
  }, [contraido, onContraidoChange]);

  return (
    <>
      {menuMovilAbierto && <button className="erp-menu-scrim" aria-label="Cerrar menú" type="button" onClick={onCerrarMenuMovil} />}
      <aside ref={asideRef} className="erp-sidebar">
        <div className="erp-brand">
          <img src="/logo.webp" alt="Inversiones Maguiña" />
          <div><strong>MAGUIÑA</strong></div>
        </div>
        <nav className="erp-navigation" aria-label="Navegación principal">
          {navegacionVisible.map((elemento) => elemento.ruta ? (
            <Link className={`erp-nav-link erp-nav-direct${dashboardActivo ? " is-active" : ""}`} key={elemento.nombre} to={elemento.ruta} aria-current={dashboardActivo ? "page" : undefined} onClick={() => { onNavegarResumen(); if (esPerfilAmplio()) onContraidoChange(true); }}>
              <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span>
            </Link>
          ) : (
            <div className="erp-nav-group" key={elemento.nombre}>
              <button className={`erp-nav-link erp-nav-module-button${moduloActivo?.nombre === elemento.nombre ? " is-current" : ""}`} type="button" aria-expanded={seccionAbierta === elemento.nombre} onClick={() => {
                if (contraido && esPerfilAmplio()) { onContraidoChange(false); setSeccionAbierta(elemento.nombre); }
                else setSeccionAbierta((abierta) => abierta === elemento.nombre ? null : elemento.nombre);
              }}>
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span><i className={seccionAbierta === elemento.nombre ? "submenu-chevron is-open" : "submenu-chevron"} />
              </button>
              <div className={`erp-subnav${seccionAbierta === elemento.nombre ? " is-open" : ""}`} aria-hidden={seccionAbierta !== elemento.nombre} inert={seccionAbierta !== elemento.nombre}>
                <div className="erp-subnav-inner">
                  {elemento.hijos.map((hijo) => (
                    <button className={`erp-subnav-link${submoduloActivo === hijo ? " is-current" : ""}`} type="button" key={hijo.ruta} aria-current={submoduloActivo === hijo ? "page" : undefined} title={`Abrir ${hijo.nombre.toLocaleLowerCase("es-PE")}`} onClick={() => {
                      const escritorio = esPerfilAmplio();
                      onNavegar(hijo.ruta);
                      onCerrarMenuMovil();
                      if (escritorio) onContraidoChange(true);
                    }}>
                      <span className="subnav-marker" />{hijo.nombre}
                    </button>
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
