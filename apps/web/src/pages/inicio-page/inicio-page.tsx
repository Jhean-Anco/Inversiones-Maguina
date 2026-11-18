import "./inicio-page.css";
import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErpAside, Icono, obtenerNavegacionAside } from "../../components/layout/erp-aside/erp-aside";
const CategoriasPage = lazy(() => import("../categorias-page/categorias-page").then((modulo) => ({ default: modulo.CategoriasPage })));
const MarcasPage = lazy(() => import("../marcas-page/marcas-page").then((modulo) => ({ default: modulo.MarcasPage })));
const ProductosPage = lazy(() => import("../productos-page/productos-page").then((modulo) => ({ default: modulo.ProductosPage })));
const ComprasPage = lazy(() => import("../compras-page/compras-page").then((modulo) => ({ default: modulo.ComprasPage })));
const MovimientosStockPage = lazy(() => import("../movimientos-stock-page/movimientos-stock-page").then((modulo) => ({ default: modulo.MovimientosStockPage })));
const NuevoIngresoPage = lazy(() => import("../nuevo-ingreso-page/nuevo-ingreso-page").then((modulo) => ({ default: modulo.NuevoIngresoPage })));
const ClientesPage = lazy(() => import("../clientes-page/clientes-page").then((modulo) => ({ default: modulo.ClientesPage })));
const ProveedoresPage = lazy(() => import("../proveedores-page/proveedores-page").then((modulo) => ({ default: modulo.ProveedoresPage })));
const ReportePage = lazy(() => import("../reportes-page/reportes-page").then((modulo) => ({ default: modulo.ReportesPage })));
const DashboardPage = lazy(() => import("../dashboard-page/dashboard-page").then((modulo) => ({ default: modulo.DashboardPage })));
const MototaxisPage = lazy(() => import("../mototaxis-page/mototaxis-page").then((modulo) => ({ default: modulo.MototaxisPage })));
const InventarioMototaxisPage = lazy(() => import("../inventario-mototaxis-page/inventario-mototaxis-page").then((modulo) => ({ default: modulo.InventarioMototaxisPage })));
const VentasPage = lazy(() => import("../ventas-page/ventas-page").then((modulo) => ({ default: modulo.VentasPage })));
const GuiasRemisionPage = lazy(() => import("../guias-remision-page/guias-remision-page").then((modulo) => ({ default: modulo.GuiasRemisionPage })));
const OrdenesCotizacionesPage = lazy(() => import("../ordenes-cotizaciones-page/ordenes-cotizaciones-page").then((modulo) => ({ default: modulo.OrdenesCotizacionesPage })));
const OrdenesServicioPage = lazy(() => import("../ordenes-servicio-page/ordenes-servicio-page").then((modulo) => ({ default: modulo.OrdenesServicioPage })));
const FinanzasPage = lazy(() => import("../finanzas-page/finanzas-page").then((modulo) => ({ default: modulo.FinanzasPage })));
const ConfiguracionSeriesPage = lazy(() => import("../configuracion-series-page/configuracion-series-page").then((modulo) => ({ default: modulo.ConfiguracionSeriesPage })));
import { useSesion } from "../../hooks/use-sesion";
import { servicioProductos, type AlertaStockBajo } from "../../services/inventario/productos.service";
import { servicioIngresos } from "../../services/ingresos.service";
import { useBorradoresDialogos } from "../../hooks/use-borradores-dialogos";
import { AccionPrincipalProvider } from "../../components/ui/accion-principal/accion-principal";
const cantidadStock = (valor: string) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(Number(valor) || 0);

export function InicioPage() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { perfil, salir } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarCierreSesion, setConfirmarCierreSesion] = useState(false);
  const [asideContraido, setAsideContraido] = useState(false);
  const [colapsoDashboard, setColapsoDashboard] = useState(false);
  const [menuCabecera, setMenuCabecera] = useState<"notificaciones" | null>(null);
  const [alertasStockBajo, setAlertasStockBajo] = useState<AlertaStockBajo[]>([]);
  const [seriesFaltantes, setSeriesFaltantes] = useState<{ tipo: string; nombre: string; icono: string }[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);
  const [errorAlertasStock, setErrorAlertasStock] = useState("");
  const cabeceraRef = useRef<HTMLElement>(null);
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
  const { moduloActivo, submoduloActivo, navegacionVisible } = obtenerNavegacionAside(rutaActual, perfil?.permisos ?? []);
  const vistaInventario = moduloActivo?.nombre === "Inventario" || rutaActual === "/egresos/compras";
  const vistaMototaxis = rutaActual.startsWith("/mototaxis");
  const vistaEgresos = moduloActivo?.nombre === "Egresos";
  const vistaAdminCatalogo = rutaActual === "/inventario/marcas" || rutaActual === "/inventario/categorias";
  const vistaSubmoduloInventario = rutaActual === "/inventario/productos" || rutaActual === "/inventario/mototaxis" || rutaActual === "/inventario/mototaxis/unidades";
  const dashboardActivo = ubicacion.pathname === "/inicio" || ubicacion.pathname === "/";
  const puedeLeerInventario = perfil?.permisos.includes("INVENTARIO.LEER") ?? false;
  const puedeVerAlertasIngresos = perfil?.permisos.includes("INGRESOS.LEER") || perfil?.permisos.includes("INGRESOS.CREAR") || perfil?.permisos.includes("FINANZAS.ADMINISTRAR") || false;
  const puedeAdministrarSeries = perfil?.permisos.includes("FINANZAS.ADMINISTRAR") ?? false;

  const cargarAlertasStock = useCallback(async () => {
    if (!puedeLeerInventario && !puedeVerAlertasIngresos) {
      setAlertasStockBajo([]);
      setSeriesFaltantes([]);
      setCargandoAlertasStock(false);
      return;
    }
    setCargandoAlertasStock(true);
    const [resultadoStock, resultadoSeries] = await Promise.allSettled([
      puedeLeerInventario ? servicioProductos.alertasStockBajo() : Promise.resolve([] as AlertaStockBajo[]),
      puedeVerAlertasIngresos ? servicioIngresos.numeraciones() : Promise.resolve(null),
    ]);
    if (resultadoStock.status === "fulfilled") { setAlertasStockBajo(resultadoStock.value); setErrorAlertasStock(""); }
    else setErrorAlertasStock("No se pudieron cargar las alertas de inventario.");
    if (resultadoSeries.status === "fulfilled" && resultadoSeries.value) {
      const numeraciones = resultadoSeries.value;
      const seriesDocumento = [
        { tipo: "BOLETA", nombre: "boletas de venta", icono: "B" },
        { tipo: "FACTURA", nombre: "facturas de venta", icono: "F" },
        { tipo: "NOTA_VENTA", nombre: "notas de venta", icono: "NV" },
        { tipo: "ORDEN_SERVICIO", nombre: "órdenes de servicio", icono: "OS" },
        { tipo: "COTIZACION", nombre: "cotizaciones", icono: "COT" },
        { tipo: "GUIA_REMITENTE", nombre: "guías de remisión de remitente", icono: "GR" },
      ];
      setSeriesFaltantes(seriesDocumento.filter((documento) => !numeraciones[documento.tipo as keyof typeof numeraciones].codigo));
    } else if (!puedeVerAlertasIngresos || resultadoSeries.status === "rejected") setSeriesFaltantes([]);
    setCargandoAlertasStock(false);
  }, [puedeLeerInventario, puedeVerAlertasIngresos]);

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
    setMenuAbierto(false);
  }, [ubicacion.pathname, moduloActivo?.nombre, dashboardActivo]);

  useEffect(() => {
    if (ubicacion.pathname.startsWith("/mototaxis/") && !moduloActivo) navegar("/mototaxis/unidades", { replace: true });
  }, [ubicacion.pathname, moduloActivo, navegar]);


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

  const rolPrincipal = perfil?.roles[0] ?? "Usuario";
  const cantidadNotificaciones = alertasStockBajo.length + seriesFaltantes.length;
  return (
    <main className={`erp-layout${asideContraido ? " is-collapsed" : ""}${dashboardActivo || colapsoDashboard ? " is-dashboard" : ""}${menuAbierto ? " menu-open" : ""}`}>
      <ErpAside
        rutaActual={rutaActual}
        moduloActivo={moduloActivo}
        submoduloActivo={submoduloActivo}
        navegacionVisible={navegacionVisible}
        dashboardActivo={dashboardActivo}
        contraido={asideContraido}
        menuMovilAbierto={menuAbierto}
        onContraidoChange={setAsideContraido}
        onCerrarMenuMovil={() => setMenuAbierto(false)}
        onNavegar={navegar}
        onNavegarResumen={() => { setColapsoDashboard(true); setMenuAbierto(false); }}
      />

      <section className="erp-main">
        <header className="erp-topbar" ref={cabeceraRef}>
          <button className="erp-menu-toggle" type="button" aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuAbierto} onClick={() => setMenuAbierto((abierto) => !abierto)}><Icono nombre="menu" /></button>
          <div className="erp-page-title" aria-live="polite">
            <strong>{submoduloActivo?.nombre ?? "Resumen"}</strong>
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
                {seriesFaltantes.length > 0 && <div className="topbar-stock-alert-list">
                  {seriesFaltantes.map((documento) => puedeAdministrarSeries ? <button className="topbar-stock-alert" type="button" key={documento.tipo} onClick={() => { setMenuCabecera(null); navegar("/configuracion/series"); }}>
                    <span className="topbar-stock-alert-icon is-sales" aria-hidden="true">{documento.icono}</span><span className="topbar-stock-alert-copy"><strong>FALTA CONFIGURAR SERIE</strong><small>Configura la serie de {documento.nombre}.</small></span><span className="topbar-stock-alert-tag is-warning">Configurar</span>
                  </button> : <div className="topbar-stock-alert" role="status" key={documento.tipo}>
                    <span className="topbar-stock-alert-icon is-sales" aria-hidden="true">{documento.icono}</span><span className="topbar-stock-alert-copy"><strong>FALTA CONFIGURAR SERIE</strong><small>Solicita a un administrador la serie de {documento.nombre}.</small></span>
                  </div>)}
                </div>}
                {alertasStockBajo.length > 0 && <div className="topbar-stock-alert-list">
                  {alertasStockBajo.map((alerta) => {
                    const sinStock = Number(alerta.stockActual) <= 0;
                    return <button className="topbar-stock-alert" type="button" key={`stock-${alerta.id}`} onClick={() => { setMenuCabecera(null); navegar("/inventario/productos"); }}>
                      <span className="topbar-stock-alert-icon" aria-hidden="true">!</span><span className="topbar-stock-alert-copy"><strong>{sinStock ? "Sin stock: " : "Stock bajo: "}{alerta.nombre}</strong><small>{alerta.codigo} · {cantidadStock(alerta.stockActual)} de {cantidadStock(alerta.stockMinimo)} {alerta.unidad}</small></span><span className={`topbar-stock-alert-tag${sinStock ? " is-danger" : " is-warning"}`}>{sinStock ? "Agotado" : "Mínimo"}</span>
                    </button>;
                  })}
                </div>}
                {cantidadNotificaciones === 0 && !cargandoAlertasStock && !errorAlertasStock && <div className="topbar-empty-notifications"><span aria-hidden="true"><Icono nombre="notificaciones" /></span><strong>{puedeLeerInventario || puedeVerAlertasIngresos ? "Sin alertas activas" : "No tienes notificaciones disponibles"}</strong><small>{puedeLeerInventario || puedeVerAlertasIngresos ? "Te avisaremos si el inventario requiere atención o falta configurar una serie." : "Solicita acceso a inventario o ingresos para consultar alertas."}</small></div>}
              </section>}
            </div>
            <button className="topbar-logout-button" type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={() => setConfirmarCierreSesion(true)}><Icono nombre="salir" /><span>Cerrar sesión</span></button>
          </div>
          <span className="erp-topbar-underline" aria-hidden="true"><span /><span /></span>
        </header>

        <div ref={contenidoRef} className={`erp-content${vistaInventario || vistaEgresos || vistaMototaxis || vistaAdminCatalogo ? " is-catalog-view" : ""}${vistaAdminCatalogo ? " is-catalog-admin-view" : ""}${vistaSubmoduloInventario ? " is-inventory-submodule-view" : ""}${ubicacion.pathname.startsWith("/ingresos/nuevo") || ubicacion.pathname === "/ingresos/ordenes-servicio" ? " is-new-sale-view" : ""}`} aria-live="polite">
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
          {ubicacion.pathname === "/configuracion/series" ? <ConfiguracionSeriesPage /> : ubicacion.pathname === "/mototaxis/compras/nueva" ? <MototaxisPage seccion="compras" esNuevaCompra puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} /> : ubicacion.pathname.startsWith("/mototaxis") ? <MototaxisPage seccion={(ubicacion.pathname.split("/")[2] || "resumen") as "resumen" | "unidades" | "compras" | "garantias" | "movimientos"} puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} /> : ubicacion.pathname === "/inventario/mototaxis/unidades" ? <MototaxisPage seccion="unidades" puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} /> : ubicacion.pathname.startsWith("/inventario/mototaxis") ? <InventarioMototaxisPage permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/finanzas/cuentas" ? <FinanzasPage puedeAdministrar={perfil?.permisos.includes("FINANZAS.ADMINISTRAR") ?? false} /> : ubicacion.pathname === "/clientes" ? <ClientesPage puedeEditar={perfil?.permisos.includes("PERSONAS.EDITAR") ?? false} /> : ubicacion.pathname === "/personas/proveedores" ? <ProveedoresPage puedeCrear={perfil?.permisos.includes("PERSONAS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/guias" ? <GuiasRemisionPage puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ordenes-servicio" ? <OrdenesServicioPage puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/cotizaciones" ? <OrdenesCotizacionesPage modo="COTIZACIONES" puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ventas/repuestos" || ubicacion.pathname === "/ingresos/ventas/mototaxis" ? <VentasPage tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} puedeEmitirNotas={perfil?.permisos.includes("FACTURACION.NOTAS_EMITIR") ?? false} puedeAnular={perfil?.permisos.includes("FACTURACION.ANULAR") ?? false} /> : ubicacion.pathname.startsWith("/ingresos/nuevo") ? <NuevoIngresoPage tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/reportes/inventario" ? <ReportePage tipo="inventario" /> : ubicacion.pathname === "/reportes/ingresos" ? <ReportePage tipo="ingresos" /> : ubicacion.pathname === "/egresos/compras/nueva" ? <ComprasPage esNuevaCompra /> : ubicacion.pathname === "/egresos/compras" ? <ComprasPage /> : ubicacion.pathname === "/inventario/movimientos-ajustes" ? <MovimientosStockPage /> : ubicacion.pathname === "/inventario/productos" ? <ProductosPage /> : ubicacion.pathname === "/inventario/marcas" ? <MarcasPage /> : ubicacion.pathname === "/inventario/categorias" ? <CategoriasPage /> : <DashboardPage nombre={perfil?.nombreCompleto ?? ""} rol={rolPrincipal} puedeVerIngresos={perfil?.permisos.includes("INGRESOS.LEER") ?? false} permisos={perfil?.permisos ?? []} />}
          </Suspense>

          </div>
          </AccionPrincipalProvider>
        </div>
      </section>
      {confirmarCierreSesion && <div className="erp-logout-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setConfirmarCierreSesion(false); }}><div ref={dialogoCierreRef} className="erp-logout-dialog" role="alertdialog" aria-modal="true" aria-labelledby="erp-logout-title" aria-describedby="erp-logout-description"><span className="erp-logout-symbol" aria-hidden="true"><Icono nombre="salir" /></span><div className="erp-logout-copy"><span className="erp-logout-kicker">SESIÓN ACTUAL</span><h2 id="erp-logout-title">¿Cerrar sesión?</h2><p id="erp-logout-description">Saldrás de tu cuenta en este dispositivo.</p></div><footer><button ref={cancelarCierreRef} className="erp-logout-cancel" type="button" onClick={() => setConfirmarCierreSesion(false)}>Seguir aquí</button><button className="erp-logout-confirm" type="button" onClick={() => { setConfirmarCierreSesion(false); void salir(); }}><Icono nombre="salir" />Cerrar sesión</button></footer></div></div>}
    </main>
  );
}


