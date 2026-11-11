import "./inicio-page.css";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
const CategoriasPage = lazy(() => import("../categorias-page/categorias-page").then((modulo) => ({ default: modulo.CategoriasPage })));
const MarcasPage = lazy(() => import("../marcas-page/marcas-page").then((modulo) => ({ default: modulo.MarcasPage })));
const ProductosPage = lazy(() => import("../productos-page/productos-page").then((modulo) => ({ default: modulo.ProductosPage })));
const ComprasPage = lazy(() => import("../compras-page/compras-page").then((modulo) => ({ default: modulo.ComprasPage })));
const EgresoRegistroPage = lazy(() => import("../egreso-registro-page/egreso-registro-page").then((modulo) => ({ default: modulo.EgresoRegistroPage })));
const MovimientosStockPage = lazy(() => import("../movimientos-stock-page/movimientos-stock-page").then((modulo) => ({ default: modulo.MovimientosStockPage })));
const NuevoIngresoPage = lazy(() => import("../nuevo-ingreso-page/nuevo-ingreso-page").then((modulo) => ({ default: modulo.NuevoIngresoPage })));
const ClientesPage = lazy(() => import("../clientes-page/clientes-page").then((modulo) => ({ default: modulo.ClientesPage })));
const ProveedoresPage = lazy(() => import("../proveedores-page/proveedores-page").then((modulo) => ({ default: modulo.ProveedoresPage })));
const ConductoresPage = lazy(() => import("../conductores-page/conductores-page").then((modulo) => ({ default: modulo.ConductoresPage })));
const ReportePage = lazy(() => import("../reportes-page/reportes-page").then((modulo) => ({ default: modulo.ReportesPage })));
const DashboardPage = lazy(() => import("../dashboard-page/dashboard-page").then((modulo) => ({ default: modulo.DashboardPage })));
const PerfilPage = lazy(() => import("../perfil-page/perfil-page").then((modulo) => ({ default: modulo.PerfilPage })));
const MototaxisPage = lazy(() => import("../mototaxis-page/mototaxis-page").then((modulo) => ({ default: modulo.MototaxisPage })));
const InventarioMototaxisPage = lazy(() => import("../inventario-mototaxis-page/inventario-mototaxis-page").then((modulo) => ({ default: modulo.InventarioMototaxisPage })));
const VentasPage = lazy(() => import("../ventas-page/ventas-page").then((modulo) => ({ default: modulo.VentasPage })));
const GuiasRemisionPage = lazy(() => import("../guias-remision-page/guias-remision-page").then((modulo) => ({ default: modulo.GuiasRemisionPage })));
const OrdenesCotizacionesPage = lazy(() => import("../ordenes-cotizaciones-page/ordenes-cotizaciones-page").then((modulo) => ({ default: modulo.OrdenesCotizacionesPage })));
const FinanzasPage = lazy(() => import("../finanzas-page/finanzas-page").then((modulo) => ({ default: modulo.FinanzasPage })));
const ConfiguracionSeriesPage = lazy(() => import("../configuracion-series-page/configuracion-series-page").then((modulo) => ({ default: modulo.ConfiguracionSeriesPage })));
import { useSesion } from "../../hooks/use-sesion";
import { useTema } from "../../components/tema-contexto/tema-contexto";
import { servicioProductos, type AlertaStockBajo } from "../../services/inventario/productos.service";
import { useBorradoresDialogos } from "../../hooks/use-borradores-dialogos";
import { AccionPrincipalProvider } from "../../components/ui/accion-principal/accion-principal";
type PermisoNavegacion = "INGRESOS.CREAR" | "INGRESOS.LEER" | "EGRESOS.LEER" | "INVENTARIO.LEER" | "MOTOTAXIS.LEER" | "PERSONAS.LEER" | "FINANZAS.LEER" | "FINANZAS.ADMINISTRAR";
type SubmoduloAside = { nombre: string; ruta: string; permiso: PermisoNavegacion; rutasRelacionadas?: string[] };
type ModuloAside = { nombre: string; icono: string; ruta?: string; hijos: SubmoduloAside[] };
const elementosAside: ModuloAside[] = [
  { nombre: "Resumen", icono: "inicio", ruta: "/inicio", hijos: [] },
  { nombre: "Ingresos", icono: "venta", hijos: [
    { nombre: "Órdenes de servicio", ruta: "/ingresos/ordenes-servicio", permiso: "INGRESOS.LEER" },
    { nombre: "Cotizaciones", ruta: "/ingresos/cotizaciones", permiso: "INGRESOS.LEER" },
    { nombre: "Venta de repuestos", ruta: "/ingresos/ventas/repuestos", rutasRelacionadas: ["/ingresos/nuevo/repuestos"], permiso: "INGRESOS.LEER" },
    { nombre: "Venta de mototaxis", ruta: "/ingresos/ventas/mototaxis", rutasRelacionadas: ["/ingresos/nuevo/mototaxis"], permiso: "INGRESOS.LEER" },
    { nombre: "Guías de remisión", ruta: "/ingresos/guias", permiso: "INGRESOS.LEER" },
  ] },
  { nombre: "Egresos", icono: "egresos", hijos: [
    { nombre: "Compra de repuestos", ruta: "/egresos/compras", permiso: "INVENTARIO.LEER" },
    { nombre: "Compra de mototaxis", ruta: "/mototaxis/compras", permiso: "MOTOTAXIS.LEER" },
    { nombre: "Gastos operativos", ruta: "/egresos/gastos-operativos", permiso: "EGRESOS.LEER" },
    { nombre: "Activos y herramientas", ruta: "/egresos/activos-herramientas", permiso: "EGRESOS.LEER" },
  ] },
  { nombre: "Cat\u00e1logos", icono: "catalogos", hijos: [
    { nombre: "Categor\u00edas", ruta: "/inventario/categorias", permiso: "INVENTARIO.LEER" },
    { nombre: "Marcas", ruta: "/inventario/marcas", permiso: "INVENTARIO.LEER" },
  ] },
  { nombre: "Inventario", icono: "inventario", hijos: [
    { nombre: "Mototaxis", ruta: "/inventario/mototaxis", rutasRelacionadas: ["/inventario/mototaxis/unidades", "/mototaxis/unidades", "/mototaxis/garantias"], permiso: "MOTOTAXIS.LEER" },
    { nombre: "Repuestos", ruta: "/inventario/productos", permiso: "INVENTARIO.LEER" },
    { nombre: "Ajustes de inventario de repuestos", ruta: "/inventario/movimientos-ajustes", permiso: "INVENTARIO.LEER" },
    { nombre: "Ajustes de inventario de mototaxis", ruta: "/mototaxis/movimientos", permiso: "MOTOTAXIS.LEER" },
  ] },
  { nombre: "Contactos", icono: "personas", hijos: [
    { nombre: "Clientes", ruta: "/clientes", permiso: "PERSONAS.LEER" },
    { nombre: "Proveedores", ruta: "/personas/proveedores", permiso: "PERSONAS.LEER" },
    { nombre: "Conductores", ruta: "/personas/conductores", permiso: "PERSONAS.LEER" },
  ] },
  { nombre: "Finanzas", icono: "finanzas", hijos: [
    { nombre: "Cuentas y medios de pago", ruta: "/finanzas/cuentas", permiso: "FINANZAS.LEER" },
  ] },
  { nombre: "Configuración", icono: "administracion", hijos: [
    { nombre: "Series de documentos", ruta: "/configuracion/series", permiso: "FINANZAS.ADMINISTRAR" },
  ] },
  { nombre: "Reportes", icono: "reportes", hijos: [
    { nombre: "Inventario", ruta: "/reportes/inventario", permiso: "INVENTARIO.LEER" },
    { nombre: "Ingresos", ruta: "/reportes/ingresos", permiso: "INGRESOS.LEER" },
  ] },
];
const cantidadStock = (valor: string) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);

function Icono({ nombre }: { nombre: string }) {
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
    sol: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    luna: <path d="M20.5 15.5A8.5 8.5 0 0 1 8.5 3.5 8.5 8.5 0 1 0 20.5 15.5Z" />,
  };
  return <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[nombre] ?? paths.inicio}</svg>;
}

export function InicioPage() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { perfil, salir } = useSesion();
  const { tema, alternarTema } = useTema();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarCierreSesion, setConfirmarCierreSesion] = useState(false);
  const [asideContraido, setAsideContraido] = useState(false);
  const [colapsoDashboard, setColapsoDashboard] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const [menuCabecera, setMenuCabecera] = useState<"notificaciones" | null>(null);
  const [alertasStockBajo, setAlertasStockBajo] = useState<AlertaStockBajo[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);
  const [errorAlertasStock, setErrorAlertasStock] = useState("");
  const cabeceraRef = useRef<HTMLElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const cancelarCierreRef = useRef<HTMLButtonElement>(null);
  const dialogoCierreRef = useRef<HTMLDivElement>(null);
  const rutaActual = ubicacion.pathname;
  useBorradoresDialogos(rutaActual, perfil?.id ?? null);
  useEffect(() => {
    if (!confirmarCierreSesion) return;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restaurarScroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelarCierreRef.current?.focus();
    const manejarTeclado = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") { evento.preventDefault(); setConfirmarCierreSesion(false); return; }
      if (evento.key !== "Tab") return;
      const botones = dialogoCierreRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
      if (!botones?.length) return;
      const primero = botones[0];
      const ultimo = botones[botones.length - 1];
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    };
    window.addEventListener("keydown", manejarTeclado);
    return () => {
      window.removeEventListener("keydown", manejarTeclado);
      document.body.style.overflow = restaurarScroll;
      if (focoAnterior?.isConnected) focoAnterior.focus();
    };
  }, [confirmarCierreSesion]);
  const rutaPertenece = (hijo: SubmoduloAside) => hijo.ruta === rutaActual || hijo.rutasRelacionadas?.includes(rutaActual) === true || (rutaActual === "/mototaxis" && hijo.ruta === "/mototaxis/unidades");
  const moduloActivo = elementosAside.find((modulo) => modulo.hijos.some(rutaPertenece));
  const submoduloActivo = moduloActivo?.hijos.find(rutaPertenece);
  const vistaInventario = moduloActivo?.nombre === "Inventario" || rutaActual === "/egresos/compras";
  const vistaMototaxis = rutaActual.startsWith("/mototaxis");
  const vistaEgresos = moduloActivo?.nombre === "Egresos";
  const vistaAdminCatalogo = rutaActual === "/inventario/marcas" || rutaActual === "/inventario/categorias";
  const vistaSubmoduloInventario = rutaActual === "/inventario/productos" || rutaActual === "/inventario/mototaxis" || rutaActual === "/inventario/mototaxis/unidades";
  const puedeNavegar = (permiso: PermisoNavegacion) => perfil?.permisos.includes(permiso) ?? false;
  const navegacionVisible = elementosAside.map((modulo) => ({ ...modulo, hijos: modulo.hijos.filter((hijo) => puedeNavegar(hijo.permiso)) })).filter((modulo) => modulo.ruta || modulo.hijos.length > 0);
  useEffect(() => {
    if (moduloActivo) setSeccionAbierta(moduloActivo.nombre);
  }, [moduloActivo?.nombre]);
  const dashboardActivo = ubicacion.pathname === "/inicio" || ubicacion.pathname === "/";
  const puedeLeerInventario = perfil?.permisos.includes("INVENTARIO.LEER") ?? false;

  const cargarAlertasStock = useCallback(async () => {
    if (!puedeLeerInventario) {
      setAlertasStockBajo([]);
      setCargandoAlertasStock(false);
      return;
    }
    setCargandoAlertasStock(true);
    try {
      const alertas = await servicioProductos.alertasStockBajo();
      setAlertasStockBajo(alertas);
      setErrorAlertasStock("");
    } catch {
      setErrorAlertasStock("No se pudieron cargar las alertas de inventario.");
    } finally {
      setCargandoAlertasStock(false);
    }
  }, [puedeLeerInventario]);

  useEffect(() => {
    void cargarAlertasStock();
    const intervalo = window.setInterval(() => { void cargarAlertasStock(); }, 60_000);
    const alVolver = () => { if (document.visibilityState === "visible") void cargarAlertasStock(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarAlertasStock]);

  useEffect(() => {
    const tieneDatosIniciales = Boolean((ubicacion.state as { datosInicio?: unknown } | null)?.datosInicio);
    if (tieneDatosIniciales) navegar(ubicacion.pathname, { replace: true, state: null });
  }, [ubicacion.pathname, ubicacion.state, navegar]);

  useEffect(() => {
    setColapsoDashboard(false);
    setSeccionAbierta(moduloActivo?.nombre ?? null);
    setMenuAbierto(false);
  }, [ubicacion.pathname, moduloActivo?.nombre, dashboardActivo]);

  useEffect(() => {
    if (ubicacion.pathname.startsWith("/mototaxis/") && !moduloActivo) navegar("/mototaxis/unidades", { replace: true });
  }, [ubicacion.pathname, moduloActivo, navegar]);

  useEffect(() => {
    if (asideContraido) return;
    const contraerAlPulsarFuera = (evento: PointerEvent) => {
      if (!window.matchMedia("(min-width: 961px)").matches) return;
      if (!asideRef.current?.contains(evento.target as Node)) setAsideContraido(true);
    };
    document.addEventListener("pointerdown", contraerAlPulsarFuera);
    return () => document.removeEventListener("pointerdown", contraerAlPulsarFuera);
  }, [asideContraido]);

  useEffect(() => {
    if (!menuCabecera) return;
    const cerrarFuera = (evento: PointerEvent) => {
      if (!cabeceraRef.current?.contains(evento.target as Node)) setMenuCabecera(null);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setMenuCabecera(null);
    };
    window.addEventListener("pointerdown", cerrarFuera);
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("pointerdown", cerrarFuera);
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [menuCabecera]);

  useLayoutEffect(() => {
    contenidoRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [ubicacion.pathname]);

  const iniciales = perfil?.nombreCompleto.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("") ?? "IM";
  const rolPrincipal = perfil?.roles[0] ?? "Usuario";
  const cantidadNotificaciones = alertasStockBajo.length;

  return (
    <main className={`erp-layout${asideContraido ? " is-collapsed" : ""}${dashboardActivo || colapsoDashboard ? " is-dashboard" : ""}${menuAbierto ? " menu-open" : ""}`}>
      {menuAbierto && <button className="erp-menu-scrim" aria-label="Cerrar menú" type="button" onClick={() => setMenuAbierto(false)} />}
      <aside ref={asideRef} className="erp-sidebar">
        <div className="erp-brand">
          <img src="/logo.png" alt="Inversiones Maguiña" />
          <div><strong>MAGUIÑA</strong></div>
        </div>

        <nav className="erp-navigation" aria-label="Navegación principal">
          {navegacionVisible.map((elemento) => elemento.ruta ? (
              <Link className={`erp-nav-link erp-nav-direct${dashboardActivo ? " is-active" : ""}`} key={elemento.nombre} to={elemento.ruta} aria-current={dashboardActivo ? "page" : undefined} onClick={() => { setColapsoDashboard(true); setMenuAbierto(false); if (window.matchMedia("(min-width: 961px)").matches) setAsideContraido(true); }}>
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span>
              </Link>
          ) : (
            <div className="erp-nav-group" key={elemento.nombre}>
              <button
                className={`erp-nav-link erp-nav-module-button${moduloActivo?.nombre === elemento.nombre ? " is-current" : ""}`}
                type="button"
                aria-expanded={seccionAbierta === elemento.nombre}
                onClick={() => {
                  if (asideContraido && window.matchMedia("(min-width: 961px)").matches) {
                    setAsideContraido(false);
                    setSeccionAbierta(elemento.nombre);
                  } else setSeccionAbierta((abierta) => abierta === elemento.nombre ? null : elemento.nombre);
                }}
              >
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span><i className={seccionAbierta === elemento.nombre ? "submenu-chevron is-open" : "submenu-chevron"} />
              </button>
              <div className={`erp-subnav${seccionAbierta === elemento.nombre ? " is-open" : ""}`} aria-hidden={seccionAbierta !== elemento.nombre} inert={seccionAbierta !== elemento.nombre}>
                <div className="erp-subnav-inner">
                  {elemento.hijos.map((hijo) => (
                    <button className={`erp-subnav-link${submoduloActivo === hijo ? " is-current" : ""}`} type="button" key={hijo.ruta} aria-current={submoduloActivo === hijo ? "page" : undefined} title={`Abrir ${hijo.nombre.toLocaleLowerCase("es-PE")}`} onClick={() => {
                      const escritorio = window.matchMedia("(min-width: 961px)").matches;
                      navegar(hijo.ruta);
                      setMenuAbierto(false);
                      if (escritorio) setAsideContraido(true);
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

      <section className="erp-main">
        <header className="erp-topbar" ref={cabeceraRef}>
          <button className="erp-menu-toggle" type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((abierto) => !abierto)}><Icono nombre="menu" /></button>
          <div className="erp-page-title" aria-live="polite">
            <strong>{submoduloActivo?.nombre ?? (dashboardActivo ? "Resumen" : "Mi perfil")}</strong>
          </div>
          <div className="erp-topbar-actions">
            <div className="topbar-notification-wrap">
              <button className="topbar-notification-button" type="button" aria-label={`Notificaciones${cantidadNotificaciones ? `, ${cantidadNotificaciones} activas` : ""}`} aria-expanded={menuCabecera === "notificaciones"} onClick={() => { setMenuCabecera((abierto) => abierto === "notificaciones" ? null : "notificaciones"); void cargarAlertasStock(); }}>
                <Icono nombre="notificaciones" />
                <span className="topbar-notification-label">Notificaciones</span>
                {cantidadNotificaciones > 0 && <span className="topbar-notification-badge" aria-label={`${cantidadNotificaciones} alertas activas`}>{cantidadNotificaciones > 99 ? "99+" : cantidadNotificaciones}</span>}
              </button>
              {menuCabecera === "notificaciones" && <section className="topbar-popover topbar-notification-panel" aria-label="Notificaciones">
                <div className="topbar-notification-heading"><strong>Notificaciones</strong><span>{cargandoAlertasStock ? "Actualizando…" : `${cantidadNotificaciones} activas`}</span></div>
                {errorAlertasStock && <div className="topbar-notification-error" role="alert">{errorAlertasStock}<button type="button" onClick={() => void cargarAlertasStock()}>Reintentar</button></div>}
                {alertasStockBajo.length > 0 && <div className="topbar-stock-alert-list">
                  {alertasStockBajo.map((alerta) => {
                    const sinStock = Number(alerta.stockActual) <= 0;
                    return <button className="topbar-stock-alert" type="button" key={`stock-${alerta.id}`} onClick={() => { setMenuCabecera(null); navegar("/inventario/productos"); }}>
                      <span className="topbar-stock-alert-icon" aria-hidden="true">!</span><span className="topbar-stock-alert-copy"><strong>{sinStock ? "Sin stock: " : "Stock bajo: "}{alerta.nombre}</strong><small>{alerta.codigo} · {cantidadStock(alerta.stockActual)} de {cantidadStock(alerta.stockMinimo)} {alerta.unidad}</small></span><span className={`topbar-stock-alert-tag${sinStock ? " is-danger" : " is-warning"}`}>{sinStock ? "Agotado" : "Mínimo"}</span>
                    </button>;
                  })}
                </div>}
                {cantidadNotificaciones === 0 && !cargandoAlertasStock && !errorAlertasStock && <div className="topbar-empty-notifications"><span aria-hidden="true"><Icono nombre="notificaciones" /></span><strong>{puedeLeerInventario ? "Sin alertas activas" : "No tienes notificaciones disponibles"}</strong><small>{puedeLeerInventario ? "Te avisaremos si un producto se agota o llega a su nivel mínimo." : "Solicita acceso a inventario para consultar alertas."}</small></div>}
              </section>}
            </div>
            <button className="topbar-theme-button" type="button" onClick={alternarTema} aria-label={`Activar modo ${tema === "claro" ? "oscuro" : "claro"}`} title={`Modo ${tema === "claro" ? "oscuro" : "claro"}`}><Icono nombre={tema === "claro" ? "luna" : "sol"} /><span>{tema === "claro" ? "Modo oscuro" : "Modo claro"}</span></button>
            <div className="topbar-profile-wrap">
              <button className="topbar-profile-trigger" type="button" aria-label="Abrir mi perfil" onClick={() => { setMenuCabecera(null); navegar("/mi-perfil"); }}>
                <span className="topbar-avatar">{iniciales}</span>
                <span className="topbar-user"><strong>{perfil?.nombreCompleto ?? "Cargando perfil"}</strong><small>{rolPrincipal}</small></span>
              </button>
            </div>
            <button className="topbar-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => setConfirmarCierreSesion(true)}><Icono nombre="salir" /><span>Cerrar sesión</span></button>
          </div>
        </header>

        <div ref={contenidoRef} className={`erp-content${vistaInventario || vistaEgresos || vistaMototaxis || vistaAdminCatalogo ? " is-catalog-view" : ""}${vistaAdminCatalogo ? " is-catalog-admin-view" : ""}${vistaSubmoduloInventario ? " is-inventory-submodule-view" : ""}${ubicacion.pathname.startsWith("/ingresos/nuevo") ? " is-new-sale-view" : ""}`} aria-live="polite">
          <AccionPrincipalProvider key={ubicacion.pathname}>
          <div key={ubicacion.pathname} className="modulo-route-transition">
          <Suspense fallback={(
            <div className="module-loading" role="status" aria-live="polite" aria-label="Cargando módulo">
              <span className="module-loading-message">Preparando el espacio de trabajo…</span>
              <div className="module-loading-heading" aria-hidden="true">
                <div><i /><i /></div><i />
              </div>
              <div className="module-loading-cards" aria-hidden="true"><i /><i /><i /></div>
              <div className="module-loading-panel" aria-hidden="true"><i /><i /><i /><i /><i /></div>
            </div>
          )}>
          {ubicacion.pathname === "/configuracion/series" ? <ConfiguracionSeriesPage /> : ubicacion.pathname.startsWith("/mototaxis") ? <MototaxisPage seccion={(ubicacion.pathname.split("/")[2] || "resumen") as "resumen" | "unidades" | "compras" | "garantias" | "movimientos"} puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} /> : ubicacion.pathname.startsWith("/inventario/mototaxis") ? <InventarioMototaxisPage permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/mi-perfil" ? <PerfilPage perfil={perfil} /> : ubicacion.pathname === "/finanzas/cuentas" ? <FinanzasPage puedeAdministrar={perfil?.permisos.includes("FINANZAS.ADMINISTRAR") ?? false} /> : ubicacion.pathname === "/clientes" ? <ClientesPage /> : ubicacion.pathname === "/personas/proveedores" ? <ProveedoresPage puedeCrear={perfil?.permisos.includes("PERSONAS.CREAR") ?? false} /> : ubicacion.pathname === "/personas/conductores" ? <ConductoresPage puedeCrear={perfil?.permisos.includes("PERSONAS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/guias" ? <GuiasRemisionPage puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ordenes-servicio" ? <OrdenesCotizacionesPage modo="ORDENES" puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/cotizaciones" ? <OrdenesCotizacionesPage modo="COTIZACIONES" puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ventas/repuestos" || ubicacion.pathname === "/ingresos/ventas/mototaxis" ? <VentasPage tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} puedeEmitirNotas={perfil?.permisos.includes("FACTURACION.NOTAS_EMITIR") ?? false} /> : ubicacion.pathname.startsWith("/ingresos/nuevo") ? <NuevoIngresoPage tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/reportes/inventario" ? <ReportePage tipo="inventario" /> : ubicacion.pathname === "/reportes/ingresos" ? <ReportePage tipo="ingresos" /> : ubicacion.pathname === "/egresos/compras" ? <ComprasPage /> : ubicacion.pathname === "/egresos/gastos-operativos" ? <EgresoRegistroPage tipo="GASTO_OPERATIVO" /> : ubicacion.pathname === "/egresos/activos-herramientas" ? <EgresoRegistroPage tipo="ACTIVO_HERRAMIENTA" /> : ubicacion.pathname === "/inventario/movimientos-ajustes" ? <MovimientosStockPage /> : ubicacion.pathname === "/inventario/productos" ? <ProductosPage /> : ubicacion.pathname === "/inventario/marcas" ? <MarcasPage /> : ubicacion.pathname === "/inventario/categorias" ? <CategoriasPage /> : <DashboardPage nombre={perfil?.nombreCompleto ?? ""} rol={rolPrincipal} puedeVerIngresos={perfil?.permisos.includes("INGRESOS.LEER") ?? false} permisos={perfil?.permisos ?? []} />}
          </Suspense>

          </div>
          </AccionPrincipalProvider>
        </div>
      </section>
      {confirmarCierreSesion && <div className="erp-logout-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setConfirmarCierreSesion(false); }}><div ref={dialogoCierreRef} className="erp-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="erp-logout-title" aria-describedby="erp-logout-description"><span className="erp-logout-symbol" aria-hidden="true"><Icono nombre="salir" /></span><div className="erp-logout-copy"><span className="erp-logout-kicker">SESIÓN ACTUAL</span><h2 id="erp-logout-title">¿Cerrar sesión?</h2><p id="erp-logout-description">Saldrás de tu cuenta en este dispositivo.</p></div><footer><button ref={cancelarCierreRef} className="erp-logout-cancel" type="button" onClick={() => setConfirmarCierreSesion(false)}>Seguir aquí</button><button className="erp-logout-confirm" type="button" onClick={() => { setConfirmarCierreSesion(false); void salir(); }}><Icono nombre="salir" />Cerrar sesión</button></footer></div></div>}
    </main>
  );
}


