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
const ReportePage = lazy(() => import("../reportes-page/reportes-page").then((modulo) => ({ default: modulo.ReportesPage })));
const DashboardPage = lazy(() => import("../dashboard-page/dashboard-page").then((modulo) => ({ default: modulo.DashboardPage })));
const DatosEmisorPage = lazy(() => import("../facturacion-electronica/datos-emisor-page/datos-emisor-page").then((modulo) => ({ default: modulo.DatosEmisorPage })));
const ComprobantesPage = lazy(() => import("../facturacion-electronica/comprobantes-page/comprobantes-page").then((modulo) => ({ default: modulo.ComprobantesPage })));
const PerfilPage = lazy(() => import("../perfil-page/perfil-page").then((modulo) => ({ default: modulo.PerfilPage })));
const MototaxisPage = lazy(() => import("../mototaxis-page/mototaxis-page").then((modulo) => ({ default: modulo.MototaxisPage })));
import { useSesion } from "../../hooks/use-sesion";
import { useTema } from "../../components/tema-contexto/tema-contexto";
import { servicioProductos, type AlertaStockBajo } from "../../services/inventario/productos.service";
const rutasInventario: Record<string, string> = {
  Categorías: "/inventario/categorias",
  Marcas: "/inventario/marcas",
  Productos: "/inventario/productos",
  "Movimientos y ajustes": "/inventario/movimientos-ajustes",
};
const rutasEgresos: Record<string, string> = { Compras: "/egresos/compras", "Gastos operativos": "/egresos/gastos-operativos", "Activos y herramientas": "/egresos/activos-herramientas" };
const rutasMototaxis: Record<string, string> = { "Resumen de mototaxis": "/mototaxis/resumen", "Catálogo de modelos": "/mototaxis/modelos", Unidades: "/mototaxis/unidades", "Compras y recepción": "/mototaxis/compras", Garantías: "/mototaxis/garantias", "Movimientos y ajustes de mototaxi": "/mototaxis/movimientos" };
const rutasIngresos: Record<string, string> = { "Nueva venta": "/ingresos/nuevo" };
const rutasFacturacion: Record<string, string> = { "Datos del emisor": "/facturacion-electronica/datos-emisor", "Comprobantes emitidos": "/facturacion-electronica/comprobantes" };
const rutasClientes: Record<string, string> = { "Directorio de clientes": "/clientes" };
const rutasReportes: Record<string, string> = { Inventario: "/reportes/inventario", Ingresos: "/reportes/ingresos" };
const rutaSubmodulo = (nombre: string) => rutasInventario[nombre] ?? rutasEgresos[nombre] ?? rutasMototaxis[nombre] ?? rutasIngresos[nombre] ?? rutasFacturacion[nombre] ?? rutasClientes[nombre] ?? rutasReportes[nombre];
const cantidadStock = (valor: string) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);

const elementosAside = [
  { nombre: "Resumen", icono: "inicio", hijos: [] },
  { nombre: "Ingresos", icono: "venta", hijos: ["Nueva venta"] },
  { nombre: "Egresos", icono: "egresos", hijos: ["Compras", "Gastos operativos", "Activos y herramientas"] },
  { nombre: "Inventario", icono: "inventario", hijos: ["Categorías", "Marcas", "Productos", "Movimientos y ajustes"] },
  { nombre: "Mototaxis", icono: "inventario", hijos: ["Resumen de mototaxis", "Catálogo de modelos", "Unidades", "Compras y recepción", "Garantías", "Movimientos y ajustes de mototaxi"] },
  { nombre: "Facturación electrónica", icono: "factura", hijos: ["Datos del emisor", "Comprobantes emitidos"] },
  { nombre: "Clientes", icono: "personas", hijos: ["Directorio de clientes"] },
  { nombre: "Reportes", icono: "reportes", hijos: ["Inventario", "Ingresos"] },
  { nombre: "Administración", icono: "administracion", hijos: ["Usuarios", "Roles y permisos"] },
];

function Icono({ nombre }: { nombre: string }) {
  const paths: Record<string, ReactNode> = {
    inicio: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
    venta: <><path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4L21 9H7" /><circle cx="11" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    inventario: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 13l9 5 9-5M3 8v9l9 5 9-5V8" /></>,
    egresos: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5M12 3v4M12 17v4" /><path d="m9 18 3 3 3-3" /></>,
    factura: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>,
    personas: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20" /></>,
    reportes: <><path d="M4 20V9M10 20V4M16 20v-7M22 20H2" /><path d="m3 7 6-4 6 7 6-5" /></>,
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
  const [asideContraido, setAsideContraido] = useState(false);
  const [colapsoDashboard, setColapsoDashboard] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>(null);
  const [menuCabecera, setMenuCabecera] = useState<"notificaciones" | null>(null);
  const [alertasStockBajo, setAlertasStockBajo] = useState<AlertaStockBajo[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);
  const [errorAlertasStock, setErrorAlertasStock] = useState("");
  const aperturaSubmenuRef = useRef<number | null>(null);
  const seccionPendienteRef = useRef<string | null>(null);
  const cabeceraRef = useRef<HTMLElement>(null);
  const cancelarAperturaSubmenu = useCallback(() => {
    if (aperturaSubmenuRef.current !== null) window.clearTimeout(aperturaSubmenuRef.current);
    aperturaSubmenuRef.current = null;
    seccionPendienteRef.current = null;
  }, []);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const vistaInventario = ["/inventario/categorias", "/inventario/marcas", "/inventario/productos", "/inventario/movimientos-ajustes"].includes(ubicacion.pathname);
  const vistaMototaxis = ubicacion.pathname.startsWith("/mototaxis/") || ubicacion.pathname === "/mototaxis";
  const vistaEgresos = ubicacion.pathname.startsWith("/egresos/");
  const vistaIngresos = ubicacion.pathname.startsWith("/ingresos/");
  const vistaClientes = ubicacion.pathname.startsWith("/clientes");
  const vistaFacturacion = ubicacion.pathname.startsWith("/facturacion-electronica/");
  const vistaReportes = ubicacion.pathname.startsWith("/reportes/");
  const dashboardActivo = ubicacion.pathname === "/inicio" || ubicacion.pathname === "/";
  const puedeLeerInventario = perfil?.permisos.includes("INVENTARIO.LEER") ?? false;

  const cargarAlertasStock = useCallback(async () => {
    if (!puedeLeerInventario) {
      setAlertasStockBajo([]);
      setCargandoAlertasStock(false);
      return;
    }
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
    const intervalo = window.setInterval(() => void cargarAlertasStock(), 60_000);
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
    cancelarAperturaSubmenu();
    setColapsoDashboard(false);
    if (vistaInventario) setSeccionAbierta("Inventario");
    else if (vistaMototaxis) setSeccionAbierta("Mototaxis");
    else if (vistaEgresos) setSeccionAbierta("Egresos");
    else if (vistaIngresos) setSeccionAbierta("Ingresos");
    else if (vistaClientes) setSeccionAbierta("Clientes");
    else if (vistaFacturacion) setSeccionAbierta("Facturación electrónica");
    else if (vistaReportes) setSeccionAbierta("Reportes");
    else setSeccionAbierta(null);
    setMenuAbierto(false);
  }, [ubicacion.pathname, vistaInventario, vistaMototaxis, vistaEgresos, vistaIngresos, vistaClientes, vistaFacturacion, vistaReportes, dashboardActivo, cancelarAperturaSubmenu]);

  useEffect(() => () => cancelarAperturaSubmenu(), [cancelarAperturaSubmenu]);

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

  return (
    <main className={`erp-layout${asideContraido ? " is-collapsed" : ""}${dashboardActivo || colapsoDashboard ? " is-dashboard" : ""}${menuAbierto ? " menu-open" : ""}`}>
      {menuAbierto && <button className="erp-menu-scrim" aria-label="Cerrar menú" type="button" onClick={() => setMenuAbierto(false)} />}
      <aside className="erp-sidebar">
        <div className="erp-brand">
          <img src="/logo.png" alt="Inversiones Maguiña" />
          <div><strong>MAGUIÑA</strong></div>
        </div>

        <nav className="erp-navigation" aria-label="Navegación principal">
          {elementosAside.filter((elemento) => (elemento.nombre !== "Egresos" || perfil?.permisos.includes("EGRESOS.LEER")) && (elemento.nombre !== "Mototaxis" || perfil?.permisos.includes("MOTOTAXIS.LEER"))).map((elemento) => elemento.hijos.length === 0 ? (
            elemento.nombre === "Resumen" ? (
              <Link className={`erp-nav-link erp-nav-direct${dashboardActivo ? " is-active" : ""}`} key={elemento.nombre} to="/inicio" aria-current={dashboardActivo ? "page" : undefined} onClick={() => { cancelarAperturaSubmenu(); setColapsoDashboard(true); setMenuAbierto(false); if (window.matchMedia("(min-width: 961px)").matches) setAsideContraido(true); }}>
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span>
              </Link>
            ) : (
              <div className="erp-nav-link erp-nav-direct is-pending" key={elemento.nombre} aria-disabled="true" title="Módulo en preparación">
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span><i />
              </div>
            )
          ) : (
            <div className="erp-nav-group" key={elemento.nombre}>
              <button
                className={`erp-nav-link erp-nav-module-button${(vistaInventario && elemento.nombre === "Inventario") || (vistaMototaxis && elemento.nombre === "Mototaxis") || (vistaEgresos && elemento.nombre === "Egresos") || (vistaIngresos && elemento.nombre === "Ingresos") || (vistaFacturacion && elemento.nombre === "Facturación electrónica") || (vistaClientes && elemento.nombre === "Clientes") || (vistaReportes && elemento.nombre === "Reportes") ? " is-current" : ""}`}
                type="button"
                aria-expanded={seccionAbierta === elemento.nombre}
                onClick={() => {
                  if (asideContraido && window.matchMedia("(min-width: 961px)").matches) {
                    cancelarAperturaSubmenu();
                    seccionPendienteRef.current = elemento.nombre;
                    setAsideContraido(false);
                    setSeccionAbierta(null);
                    aperturaSubmenuRef.current = window.setTimeout(() => {
                      aperturaSubmenuRef.current = null;
                      const pendiente = seccionPendienteRef.current;
                      seccionPendienteRef.current = null;
                      if (pendiente) setSeccionAbierta(pendiente);
                    }, 850);
                  } else if (aperturaSubmenuRef.current !== null) {
                    seccionPendienteRef.current = elemento.nombre;
                  } else setSeccionAbierta((abierta) => abierta === elemento.nombre ? null : elemento.nombre);
                }}
              >
                <Icono nombre={elemento.icono} /><span>{elemento.nombre}</span><i className={seccionAbierta === elemento.nombre ? "submenu-chevron is-open" : "submenu-chevron"} />
              </button>
              {seccionAbierta === elemento.nombre && (
                <div className="erp-subnav">
                  {elemento.hijos.map((hijo) => (
                    <button className={`erp-subnav-link${ubicacion.pathname === rutaSubmodulo(hijo) ? " is-current" : ""}`} type="button" key={hijo} disabled={!rutaSubmodulo(hijo)} title={rutaSubmodulo(hijo) ? `Gestionar ${hijo.toLocaleLowerCase("es-PE")}` : "Submódulo en preparación"} onClick={() => { const ruta = rutaSubmodulo(hijo); if (ruta) navegar(ruta); setMenuAbierto(false); }}>
                      <span className="subnav-marker" />{hijo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

      </aside>

      <section className="erp-main">
        <header className="erp-topbar" ref={cabeceraRef}>
          <button className="erp-menu-toggle" type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((abierto) => !abierto)}><Icono nombre="menu" /></button>
          <span className="erp-topbar-spacer" aria-hidden="true" />
          <div className="erp-topbar-actions">
            <div className="topbar-notification-wrap">
              <button className="topbar-notification-button" type="button" aria-label={`Notificaciones${alertasStockBajo.length ? `, ${alertasStockBajo.length} alertas de stock bajo` : ""}`} aria-expanded={menuCabecera === "notificaciones"} onClick={() => { setMenuCabecera((abierto) => abierto === "notificaciones" ? null : "notificaciones"); if (puedeLeerInventario) void cargarAlertasStock(); }}>
                <Icono nombre="notificaciones" />
                <span className="topbar-notification-label">Notificaciones</span>
                {alertasStockBajo.length > 0 && <span className="topbar-notification-badge" aria-label={`${alertasStockBajo.length} alertas activas`}>{alertasStockBajo.length > 99 ? "99+" : alertasStockBajo.length}</span>}
              </button>
              {menuCabecera === "notificaciones" && <section className="topbar-popover topbar-notification-panel" aria-label="Notificaciones">
                <div className="topbar-notification-heading"><strong>Notificaciones</strong><span>{cargandoAlertasStock ? "Actualizando…" : `${alertasStockBajo.length} activas`}</span></div>
                {errorAlertasStock ? <div className="topbar-notification-error" role="alert">{errorAlertasStock}<button type="button" onClick={() => void cargarAlertasStock()}>Reintentar</button></div>
                  : alertasStockBajo.length > 0 ? <div className="topbar-stock-alert-list">{alertasStockBajo.map((alerta) => <button className="topbar-stock-alert" type="button" key={alerta.id} onClick={() => { setMenuCabecera(null); navegar("/inventario/productos"); }}>
                    <span className="topbar-stock-alert-icon" aria-hidden="true">!</span><span className="topbar-stock-alert-copy"><strong>{alerta.nombre}</strong><small>{alerta.codigo} · {cantidadStock(alerta.stockActual)} de {cantidadStock(alerta.stockMinimo)} {alerta.unidad}</small></span><span className="topbar-stock-alert-tag">Stock bajo</span>
                  </button>)}</div>
                  : <div className="topbar-empty-notifications"><span aria-hidden="true"><Icono nombre="notificaciones" /></span><strong>{cargandoAlertasStock ? "Revisando existencias…" : puedeLeerInventario ? "Sin alertas de stock bajo" : "No tienes notificaciones disponibles"}</strong><small>{puedeLeerInventario ? "Configura un mínimo en la ficha del producto para activar esta alerta." : "Solicita acceso a inventario para ver estas alertas."}</small></div>}
              </section>}
            </div>
            <button className="topbar-theme-button" type="button" onClick={alternarTema} aria-label={`Activar modo ${tema === "claro" ? "oscuro" : "claro"}`} title={`Modo ${tema === "claro" ? "oscuro" : "claro"}`}><Icono nombre={tema === "claro" ? "luna" : "sol"} /><span>{tema === "claro" ? "Modo oscuro" : "Modo claro"}</span></button>
            <div className="topbar-profile-wrap">
              <button className="topbar-profile-trigger" type="button" aria-label="Abrir mi perfil" onClick={() => { setMenuCabecera(null); navegar("/mi-perfil"); }}>
                <span className="topbar-avatar">{iniciales}</span>
                <span className="topbar-user"><strong>{perfil?.nombreCompleto ?? "Cargando perfil"}</strong><small>{rolPrincipal}</small></span>
              </button>
            </div>
            <button className="topbar-logout-button" type="button" onClick={() => { if (window.confirm("¿Deseas cerrar la sesión actual?")) void salir(); }}><Icono nombre="salir" /><span>Cerrar sesión</span></button>
          </div>
        </header>

        <div ref={contenidoRef} className={`erp-content${vistaInventario || vistaEgresos || vistaMototaxis ? " is-catalog-view" : ""}${ubicacion.pathname === "/ingresos/nuevo" ? " is-new-sale-view" : ""}`} aria-live="polite">
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
          {ubicacion.pathname.startsWith("/mototaxis") ? <MototaxisPage seccion={(ubicacion.pathname.split("/")[2] || "resumen") as "resumen" | "modelos" | "unidades" | "compras" | "garantias" | "movimientos"} /> : ubicacion.pathname === "/mi-perfil" ? <PerfilPage perfil={perfil} /> : ubicacion.pathname === "/facturacion-electronica/datos-emisor" ? <DatosEmisorPage /> : ubicacion.pathname === "/facturacion-electronica/comprobantes" ? <ComprobantesPage /> : ubicacion.pathname === "/clientes" ? <ClientesPage /> : ubicacion.pathname === "/ingresos/nuevo" ? <NuevoIngresoPage permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/reportes/inventario" ? <ReportePage tipo="inventario" /> : ubicacion.pathname === "/reportes/ingresos" ? <ReportePage tipo="ingresos" /> : ubicacion.pathname === "/egresos/compras" ? <ComprasPage permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/egresos/gastos-operativos" ? <EgresoRegistroPage tipo="GASTO_OPERATIVO" /> : ubicacion.pathname === "/egresos/activos-herramientas" ? <EgresoRegistroPage tipo="ACTIVO_HERRAMIENTA" /> : ubicacion.pathname === "/inventario/movimientos-ajustes" ? <MovimientosStockPage /> : ubicacion.pathname === "/inventario/productos" ? <ProductosPage /> : ubicacion.pathname === "/inventario/marcas" ? <MarcasPage /> : ubicacion.pathname === "/inventario/categorias" ? <CategoriasPage /> : <DashboardPage nombre={perfil?.nombreCompleto ?? ""} rol={rolPrincipal} puedeVerIngresos={perfil?.permisos.includes("INGRESOS.LEER") ?? false} />}
          </Suspense>

          </div>
        </div>
      </section>
    </main>
  );
}


