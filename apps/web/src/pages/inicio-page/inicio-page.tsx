import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErpAside, obtenerNavegacionAside } from "../../components/layout/erp-aside/erp-aside";
import { Icono } from "../../components/layout/erp-aside/erp-icon";
import { ErpHeader } from "../../components/layout/erp-header/erp-header";
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
const ConductoresPage = lazy(() => import("../conductores-page/conductores-page").then((modulo) => ({ default: modulo.ConductoresPage })));
const FinanzasPage = lazy(() => import("../finanzas-page/finanzas-page").then((modulo) => ({ default: modulo.FinanzasPage })));
const ConfiguracionSeriesPage = lazy(() => import("../configuracion-series-page/configuracion-series-page").then((modulo) => ({ default: modulo.ConfiguracionSeriesPage })));
const SIN_PERMISOS: string[] = [];
import { useSesion } from "../../hooks/use-sesion";
import { useViewportProfile } from "../../utilidades/use-viewport-profile";
import { useBorradoresDialogos } from "../../hooks/use-borradores-dialogos";
import { AccionPrincipalProvider } from "../../components/ui/accion-principal/accion-principal";
import { catalogAdminClasses } from "../../components/catalogo/catalogo-admin-page/catalogo-admin-classes";
import { useAlertasInicio } from "./use-alertas-inicio";
import {
  clasesContenidoResponsive, clasesLayoutResponsive, clasesMainResponsive, inicioClasses,
} from "./clases-layout-responsive";

export function InicioPage() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const { perfil, salir } = useSesion();
  const perfilViewport = useViewportProfile();
  const perfilAmplio = perfilViewport === "laptop" || perfilViewport === "tablet-landscape";
  const permisosPerfil = perfil?.permisos ?? SIN_PERMISOS;
  const cerrarMenuMovil = useCallback(() => setMenuAbierto(false), []);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarCierreSesion, setConfirmarCierreSesion] = useState(false);
  const [asideContraido, setAsideContraido] = useState(false);
  const [colapsoDashboard, setColapsoDashboard] = useState(false);
  const botonMenuRef = useRef<HTMLButtonElement>(null);
  const contenidoRef = useRef<HTMLDivElement>(null);
  const cancelarCierreRef = useRef<HTMLButtonElement>(null);
  const dialogoCierreRef = useRef<HTMLDivElement>(null);
  const rutaActual = ubicacion.pathname;
  useBorradoresDialogos(rutaActual, perfil?.id ?? null);
  const {
    alertasStockBajo, hayMasAlertasStock, cargandoMasAlertasStock,
    cargarMasAlertasStock, seriesFaltantes, cargandoAlertasStock, errorAlertasStock,
    cargarAlertasStock, puedeLeerInventario, puedeVerAlertasIngresos, puedeAdministrarSeries,
    cantidadNotificaciones,
  } = useAlertasInicio(permisosPerfil);
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
  const { moduloActivo, submoduloActivo, navegacionVisible, accesoDenegado } = obtenerNavegacionAside(rutaActual, permisosPerfil);
  const autorizacionResuelta = perfil !== null;
  const accesoDenegadoActual = autorizacionResuelta && accesoDenegado;
  const rutaMototaxiNoReconocida = autorizacionResuelta && rutaActual.startsWith("/mototaxis/") && !moduloActivo && !accesoDenegadoActual;
  const vistaInventario = autorizacionResuelta && !accesoDenegadoActual && (moduloActivo?.nombre === "Inventario" || rutaActual === "/egresos/compras");
  const vistaMototaxis = autorizacionResuelta && !accesoDenegadoActual && rutaActual.startsWith("/mototaxis");
  const vistaEgresos = autorizacionResuelta && !accesoDenegadoActual && moduloActivo?.nombre === "Egresos";
  const vistaNuevaCompra = rutaActual === "/egresos/compras/nueva" || rutaActual === "/mototaxis/compras/nueva";
  const vistaDocumentoOperativo = autorizacionResuelta && !accesoDenegadoActual &&
    (vistaNuevaCompra || rutaActual.startsWith("/ingresos/nuevo") || rutaActual === "/ingresos/ordenes-servicio");
  const vistaAdminCatalogo = autorizacionResuelta && !accesoDenegadoActual && (rutaActual === "/inventario/marcas" || rutaActual === "/inventario/categorias");
  const vistaSubmoduloInventario = autorizacionResuelta && !accesoDenegadoActual && (rutaActual === "/inventario/productos" || rutaActual === "/inventario/mototaxis");
  const dashboardActivo = ubicacion.pathname === "/inicio" || ubicacion.pathname === "/";
  useEffect(() => {
    const tieneDatosIniciales = Boolean((ubicacion.state as { datosInicio?: unknown } | null)?.datosInicio);
    if (tieneDatosIniciales) navegar(ubicacion.pathname, { replace: true, state: null });
  }, [ubicacion.pathname, ubicacion.state, navegar]);

  useEffect(() => {
    setColapsoDashboard(false);
    setMenuAbierto(false);
  }, [ubicacion.pathname, moduloActivo?.nombre, dashboardActivo]);

  useEffect(() => {
    if (rutaMototaxiNoReconocida) {
      navegar("/inventario/mototaxis", { replace: true });
    }
  }, [navegar, rutaMototaxiNoReconocida]);


  useLayoutEffect(() => {
    contenidoRef.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [ubicacion.pathname]);

  const rolPrincipal = perfil?.roles[0] ?? "Usuario";
  const asideContraidoEscritorio = perfilAmplio && asideContraido;
  const tituloPagina = !autorizacionResuelta ? "Cargando sesión" : accesoDenegadoActual ? "Acceso no disponible" : submoduloActivo?.nombre ?? "Resumen";
  return (
    <main className={`erp-layout ${clasesLayoutResponsive}${asideContraidoEscritorio ? ` is-collapsed grid-cols-[84px_minmax(0,1fr)]${menuAbierto ? " tablet-portrait:grid-cols-[minmax(0,1fr)] mobile-landscape:grid-cols-[minmax(0,1fr)] mobile-portrait:grid-cols-[minmax(0,1fr)]" : " [&.is-collapsed]:grid-cols-[84px_minmax(0,1fr)] [&.is-collapsed]:grid-rows-[minmax(0,1fr)] tablet-portrait:grid-cols-[84px_minmax(0,1fr)] tablet-portrait:grid-rows-[minmax(0,1fr)] mobile-landscape:grid-cols-[84px_minmax(0,1fr)] mobile-landscape:grid-rows-[minmax(0,1fr)] mobile-portrait:grid-cols-[84px_minmax(0,1fr)] mobile-portrait:grid-rows-[minmax(0,1fr)]"}` : ""}${autorizacionResuelta && (dashboardActivo || colapsoDashboard) ? " is-dashboard" : ""}${menuAbierto ? " menu-open" : ""}`}>
      <ErpAside
        moduloActivo={moduloActivo}
        submoduloActivo={submoduloActivo}
        navegacionVisible={navegacionVisible}
        dashboardActivo={dashboardActivo}
        contraido={asideContraidoEscritorio}
        menuMovilAbierto={menuAbierto}
        botonMenuRef={botonMenuRef}
        onContraidoChange={setAsideContraido}
        onCerrarMenuMovil={cerrarMenuMovil}
        onNavegarResumen={() => { setColapsoDashboard(true); setMenuAbierto(false); }}
      />

      <section className={`erp-main ${clasesMainResponsive}${asideContraidoEscritorio && !menuAbierto ? " is-collapsed tablet-portrait:[&.is-collapsed]:col-start-2 tablet-portrait:[&.is-collapsed]:row-start-1 tablet-portrait:[&.is-collapsed]:grid-rows-[minmax(0,1fr)] mobile-landscape:[&.is-collapsed]:col-start-2 mobile-landscape:[&.is-collapsed]:row-start-1 mobile-landscape:[&.is-collapsed]:grid-rows-[minmax(0,1fr)] mobile-portrait:[&.is-collapsed]:col-start-2 mobile-portrait:[&.is-collapsed]:row-start-1 mobile-portrait:[&.is-collapsed]:grid-rows-[minmax(0,1fr)]" : ""}`}>
        <ErpHeader
          titulo={tituloPagina}
          rutaActual={rutaActual}
          menuMovilAbierto={menuAbierto}
          botonMenuRef={botonMenuRef}
          cantidadNotificaciones={cantidadNotificaciones}
          hayMasAlertasStock={hayMasAlertasStock}
          cargandoMasAlertasStock={cargandoMasAlertasStock}
          cargarMasAlertasStock={cargarMasAlertasStock}
          cargandoAlertasStock={cargandoAlertasStock}
          errorAlertasStock={errorAlertasStock}
          alertasStockBajo={alertasStockBajo}
          seriesFaltantes={seriesFaltantes}
          puedeLeerInventario={puedeLeerInventario}
          puedeVerAlertasIngresos={puedeVerAlertasIngresos}
          puedeAdministrarSeries={puedeAdministrarSeries}
          cargarAlertasStock={cargarAlertasStock}
          navegar={navegar}
          onMenuMovilChange={setMenuAbierto}
          onCerrarSesionSolicitado={() => setConfirmarCierreSesion(true)}
        />

        <div ref={contenidoRef} className={`erp-content ${inicioClasses.shellContent} ${clasesContenidoResponsive}${!vistaNuevaCompra && (vistaInventario || vistaEgresos || vistaMototaxis || vistaAdminCatalogo) ? " is-catalog-view" : ""}${vistaAdminCatalogo ? ` is-catalog-admin-view ${catalogAdminClasses.shell}` : ""}${vistaSubmoduloInventario ? " is-inventory-submodule-view" : ""}${vistaDocumentoOperativo ? " is-new-sale-view" : ""}`} aria-live="polite">
          <AccionPrincipalProvider key={ubicacion.pathname}>
          <div key={ubicacion.pathname} className={`modulo-route-transition ${vistaAdminCatalogo ? catalogAdminClasses.transition : ""}`}>
          <Suspense fallback={(
            <div className={`module-loading ${inicioClasses.moduleLoading}`} role="status" aria-live="polite" aria-label="Cargando módulo">
              <span className={`module-loading-message ${inicioClasses.moduleLoadingMessage}`}>Preparando el espacio de trabajo…</span>
              <div className={`module-loading-heading ${inicioClasses.moduleLoadingHeading}`} aria-hidden="true">
                <div><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /></div><i className={inicioClasses.loadingShimmer} />
              </div>
              <div className={`module-loading-cards ${inicioClasses.moduleLoadingCards}`} aria-hidden="true"><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /></div>
              <div className={`module-loading-panel ${inicioClasses.moduleLoadingPanel}`} aria-hidden="true"><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /><i className={inicioClasses.loadingShimmer} /></div>
            </div>
          )}>
          {!autorizacionResuelta ? (
            <div className="grid min-h-[45vh] place-items-center px-6 text-center text-sm font-semibold text-[#61758a]" role="status">Validando tu sesión y tus permisos…</div>
          ) : accesoDenegadoActual ? (
            <section className="mx-auto grid min-h-[45vh] max-w-xl content-center justify-items-center gap-3 px-6 text-center" role="alert">
              <h2 className="m-0 text-xl font-bold text-[#173b65]">No tienes permiso para abrir esta secci&#x00f3;n</h2>
              <p className="m-0 text-sm leading-relaxed text-[#61758a]">Tu usuario no tiene el permiso necesario. Solicítalo a un administrador si necesitas acceder.</p>
              <button className="rounded-lg border border-[#cbd8e4] bg-white px-4 py-2 text-sm font-semibold text-[#244967] hover:bg-[#f5f8fb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878b9]" type="button" onClick={() => navegar("/inicio")}>Volver al resumen</button>
            </section>
          ) : ubicacion.pathname === "/configuracion/series" ? <ConfiguracionSeriesPage /> : ubicacion.pathname === "/mototaxis/compras/nueva" ? <MototaxisPage seccion="compras" esNuevaCompra puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} /> : ubicacion.pathname.startsWith("/mototaxis") ? <MototaxisPage seccion={(ubicacion.pathname.split("/")[2] || "resumen") as "compras" | "garantias" | "movimientos"} puedeAjustarInventario={perfil?.permisos.includes("MOTOTAXIS.EDITAR") ?? false} puedeCrearReclamo={perfil?.permisos.includes("MOTOTAXIS.CREAR") ?? false} /> : ubicacion.pathname.startsWith("/inventario/mototaxis") ? <InventarioMototaxisPage permisos={perfil?.permisos ?? []} /> : (ubicacion.pathname === "/finanzas/cuentas" || ubicacion.pathname === "/finanzas/movimientos") ? <FinanzasPage vista={ubicacion.pathname.endsWith("/movimientos") ? "movimientos" : "cuentas"} puedeAdministrar={perfil?.permisos.includes("FINANZAS.ADMINISTRAR") ?? false} /> : ubicacion.pathname === "/clientes" ? <ClientesPage puedeCrear={permisosPerfil.includes("PERSONAS.CREAR")} puedeEditar={perfil?.permisos.includes("PERSONAS.EDITAR") ?? false} /> : ubicacion.pathname === "/personas/conductores" ? <ConductoresPage puedeCrear={permisosPerfil.includes("PERSONAS.CREAR")} puedeEditar={permisosPerfil.includes("PERSONAS.EDITAR")} /> : ubicacion.pathname === "/personas/proveedores" ? <ProveedoresPage puedeCrear={perfil?.permisos.includes("PERSONAS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/guias" ? <GuiasRemisionPage puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ordenes-servicio" ? <OrdenesServicioPage puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/cotizaciones" ? <OrdenesCotizacionesPage modo="COTIZACIONES" puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} /> : ubicacion.pathname === "/ingresos/ventas/repuestos" || ubicacion.pathname === "/ingresos/ventas/mototaxis" ? <VentasPage key={ubicacion.pathname} tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} puedeCrear={perfil?.permisos.includes("INGRESOS.CREAR") ?? false} puedeEmitirNotas={perfil?.permisos.includes("FACTURACION.NOTAS_EMITIR") ?? false} puedeAnular={perfil?.permisos.includes("FACTURACION.ANULAR") ?? false} puedeAplicarGarantia={perfil?.permisos.includes("MOTOTAXIS.CREAR") ?? false} /> : ubicacion.pathname.startsWith("/ingresos/nuevo") ? <NuevoIngresoPage tipoVenta={ubicacion.pathname.endsWith("/mototaxis") ? "MOTOTAXIS" : "REPUESTOS"} permisos={perfil?.permisos ?? []} /> : ubicacion.pathname === "/reportes/inventario" ? <ReportePage /> : ubicacion.pathname === "/egresos/compras/nueva" ? <ComprasPage esNuevaCompra /> : ubicacion.pathname === "/egresos/compras" ? <ComprasPage /> : ubicacion.pathname === "/inventario/movimientos-ajustes" ? <MovimientosStockPage puedeAjustar={permisosPerfil.includes("INVENTARIO.EDITAR")} /> : ubicacion.pathname === "/inventario/productos" ? <ProductosPage permisos={permisosPerfil} /> : ubicacion.pathname === "/inventario/marcas" ? <MarcasPage /> : ubicacion.pathname === "/inventario/categorias" ? <CategoriasPage /> : <DashboardPage nombre={perfil?.nombreCompleto ?? ""} rol={rolPrincipal} puedeVerIngresos={perfil?.permisos.includes("INGRESOS.LEER") ?? false} permisos={perfil?.permisos ?? []} />}
          </Suspense>

          </div>
          </AccionPrincipalProvider>
        </div>
      </section>
      {confirmarCierreSesion && <div className={`erp-logout-backdrop ${inicioClasses.logoutBackdrop}`} role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setConfirmarCierreSesion(false); }}><div ref={dialogoCierreRef} className={`erp-logout-dialog ${inicioClasses.logoutDialog}`} role="alertdialog" aria-modal="true" aria-labelledby="erp-logout-title" aria-describedby="erp-logout-description"><span className={`erp-logout-symbol ${inicioClasses.logoutSymbol}`} aria-hidden="true"><Icono nombre="salir" /></span><div className={`erp-logout-copy ${inicioClasses.logoutCopy}`}><span className="erp-logout-kicker">SESIÓN ACTUAL</span><h2 id="erp-logout-title">¿Cerrar sesión?</h2><p id="erp-logout-description">Saldrás de tu cuenta en este dispositivo.</p></div><footer className={`erp-logout-footer ${inicioClasses.logoutFooter}`}><button ref={cancelarCierreRef} className="erp-logout-cancel" type="button" onClick={() => setConfirmarCierreSesion(false)}>Seguir aquí</button><button className="erp-logout-confirm" type="button" onClick={() => { setConfirmarCierreSesion(false); void salir(); }}><Icono nombre="salir" />Cerrar sesión</button></footer></div></div>}
    </main>
  );
}


