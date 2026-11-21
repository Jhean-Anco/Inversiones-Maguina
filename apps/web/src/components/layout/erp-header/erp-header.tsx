import { useEffect, useRef, useState, type RefObject } from "react";
import type { NavigateFunction } from "react-router-dom";
import { Icono } from "../erp-aside/erp-icon";
import { NotificacionFlotante, NotificacionesGlobales } from "../../ui/notificacion-flotante/notificacion-flotante";
import type { AlertaStockBajo } from "../../../services/inventario/productos.service";
import { formatearCantidadStock } from "../../../utilidades/formatear-stock";
import {
  clasesMenuResponsive,
  clasesTopbarResponsive,
  headerClasses,
} from "./erp-header-classes";

type SerieFaltante = { tipo: string; nombre: string; icono: string };

type ErpHeaderProps = {
  titulo: string;
  rutaActual: string;
  menuMovilAbierto: boolean;
  botonMenuRef: RefObject<HTMLButtonElement | null>;
  cantidadNotificaciones: number;
  cargandoAlertasStock: boolean;
  errorAlertasStock: string;
  alertasStockBajo: AlertaStockBajo[];
  seriesFaltantes: SerieFaltante[];
  puedeLeerInventario: boolean;
  puedeVerAlertasIngresos: boolean;
  puedeAdministrarSeries: boolean;
  cargarAlertasStock: () => Promise<void>;
  navegar: NavigateFunction;
  onMenuMovilChange: (abierto: boolean) => void;
  onCerrarSesionSolicitado: () => void;
};

export function ErpHeader({
  titulo,
  rutaActual,
  menuMovilAbierto,
  botonMenuRef,
  cantidadNotificaciones,
  cargandoAlertasStock,
  errorAlertasStock,
  alertasStockBajo,
  seriesFaltantes,
  puedeLeerInventario,
  puedeVerAlertasIngresos,
  puedeAdministrarSeries,
  cargarAlertasStock,
  navegar,
  onMenuMovilChange,
  onCerrarSesionSolicitado,
}: ErpHeaderProps) {
  const [notificacionesAbiertas, setNotificacionesAbiertas] = useState(false);
  const notificacionesRef = useRef<HTMLButtonElement>(null);
  const cerrarSesionRef = useRef<HTMLButtonElement>(null);
  const encabezadoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setNotificacionesAbiertas(false);
  }, [menuMovilAbierto, rutaActual]);

  useEffect(() => {
    if (!notificacionesAbiertas) return;
    const cerrarAlPulsarFuera = (evento: PointerEvent) => {
      if (!encabezadoRef.current?.contains(evento.target as Node)) setNotificacionesAbiertas(false);
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setNotificacionesAbiertas(false);
      notificacionesRef.current?.focus();
    };
    window.addEventListener("pointerdown", cerrarAlPulsarFuera);
    window.addEventListener("keydown", cerrarConEscape);
    return () => {
      window.removeEventListener("pointerdown", cerrarAlPulsarFuera);
      window.removeEventListener("keydown", cerrarConEscape);
    };
  }, [notificacionesAbiertas]);

  const alternarNotificaciones = () => {
    if (!notificacionesAbiertas) void cargarAlertasStock();
    setNotificacionesAbiertas((abiertas) => !abiertas);
  };

  return (
    <header className={`erp-topbar ${headerClasses.shellTopbar} ${clasesTopbarResponsive}`} ref={encabezadoRef}>
      <button
        ref={botonMenuRef}
        className={clasesMenuResponsive}
        type="button"
        aria-label={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuMovilAbierto}
        aria-controls="erp-primary-aside"
        onClick={() => onMenuMovilChange(!menuMovilAbierto)}
      >
        <Icono nombre="menu" />
      </button>
      <div className={`erp-page-title ${headerClasses.pageTitle}`} aria-live="polite">
        <strong role="heading" aria-level={1}>{titulo}</strong>
      </div>
      <div className={`erp-topbar-actions ${headerClasses.topbarActions}`}>
        <div className={`topbar-notification-wrap ${headerClasses.notificationWrap}`}>
          <button
            ref={notificacionesRef}
            id="erp-notifications-trigger"
            className={`topbar-notification-button ${headerClasses.notificationButton}`}
            type="button"
            aria-label={`Notificaciones${cantidadNotificaciones ? `, ${cantidadNotificaciones} activas` : ""}`}
            aria-expanded={notificacionesAbiertas}
            aria-controls="erp-notifications-panel"
            onClick={alternarNotificaciones}
          >
            <Icono nombre="notificaciones" />
            {cantidadNotificaciones > 0 && <span className={`topbar-notification-badge ${headerClasses.notificationBadge}`} aria-hidden="true">{cantidadNotificaciones > 99 ? "99+" : cantidadNotificaciones}</span>}
          </button>
          <section id="erp-notifications-panel" className={`topbar-popover ${headerClasses.popover}`} aria-labelledby="erp-notifications-title" aria-live="polite" hidden={!notificacionesAbiertas}>
              <div className={`topbar-notification-heading ${headerClasses.popoverHeading}`}>
                <strong id="erp-notifications-title">Notificaciones</strong>
                <span>{cargandoAlertasStock ? "Actualizando…" : `${cantidadNotificaciones} activas`}</span>
              </div>
              {notificacionesAbiertas && errorAlertasStock && <>
                <NotificacionFlotante mensaje={errorAlertasStock} accion={{ etiqueta: "Reintentar", ejecutar: () => void cargarAlertasStock() }} />
                <button className="text-sm font-semibold text-primary" type="button" onClick={() => void cargarAlertasStock()}>Reintentar carga de alertas</button>
              </>}
              {seriesFaltantes.length > 0 && <div className={`topbar-stock-alert-list ${headerClasses.alertList}`}>
                {seriesFaltantes.map((documento) => puedeAdministrarSeries ? (
                  <button className={`topbar-stock-alert ${headerClasses.stockAlert}`} type="button" key={documento.tipo} onClick={() => { setNotificacionesAbiertas(false); navegar("/configuracion/series"); }}>
                    <span className={`topbar-stock-alert-icon is-sales ${headerClasses.alertIcon} ${headerClasses.salesAlertIcon}`} aria-hidden="true">{documento.icono}</span>
                    <span className={`topbar-stock-alert-copy ${headerClasses.alertCopy}`}><strong>FALTA CONFIGURAR SERIE</strong><small>Configura la serie de {documento.nombre}.</small></span>
                    <span className={`topbar-stock-alert-tag is-warning ${headerClasses.alertTag} ${headerClasses.warningTag}`}>Configurar</span>
                  </button>
                ) : (
                  <div className={`topbar-stock-alert ${headerClasses.stockAlert}`} role="status" key={documento.tipo}>
                    <span className={`topbar-stock-alert-icon is-sales ${headerClasses.alertIcon} ${headerClasses.salesAlertIcon}`} aria-hidden="true">{documento.icono}</span>
                    <span className={`topbar-stock-alert-copy ${headerClasses.alertCopy}`}><strong>FALTA CONFIGURAR SERIE</strong><small>Solicita a un administrador la serie de {documento.nombre}.</small></span>
                  </div>
                ))}
              </div>}
              {alertasStockBajo.length > 0 && <div className={`topbar-stock-alert-list ${headerClasses.alertList}`}>
                {alertasStockBajo.map((alerta) => {
                  const sinStock = Number(alerta.stockActual) <= 0;
                  return (
                    <button className={`topbar-stock-alert ${headerClasses.stockAlert}`} type="button" key={alerta.id} onClick={() => { setNotificacionesAbiertas(false); navegar("/inventario/productos"); }}>
                      <span className={`topbar-stock-alert-icon ${headerClasses.alertIcon}`} aria-hidden="true">!</span>
                      <span className={`topbar-stock-alert-copy ${headerClasses.alertCopy}`}><strong>{sinStock ? "Sin stock: " : "Stock bajo: "}{alerta.nombre}</strong><small>{alerta.codigo} · {formatearCantidadStock(alerta.stockActual)} de {formatearCantidadStock(alerta.stockMinimo)} {alerta.unidad}</small></span>
                      <span className={`topbar-stock-alert-tag ${headerClasses.alertTag} ${sinStock ? headerClasses.dangerTag : headerClasses.warningTag}`}>{sinStock ? "Agotado" : "Mínimo"}</span>
                    </button>
                  );
                })}
              </div>}
              {cantidadNotificaciones === 0 && !cargandoAlertasStock && !errorAlertasStock && <div className={`topbar-empty-notifications ${headerClasses.emptyNotifications}`}><span aria-hidden="true"><Icono nombre="notificaciones" /></span><strong>{puedeLeerInventario || puedeVerAlertasIngresos ? "Sin alertas activas" : "No tienes notificaciones disponibles"}</strong><small>{puedeLeerInventario || puedeVerAlertasIngresos ? "Te avisaremos si el inventario requiere atención o falta configurar una serie." : "Solicita acceso a inventario o ingresos para consultar alertas."}</small></div>}
          </section>
        </div>
        <button ref={cerrarSesionRef} className={`topbar-logout-button ${headerClasses.logoutButton}`} type="button" aria-label="Cerrar sesión" title="Cerrar sesión" onClick={onCerrarSesionSolicitado}><Icono nombre="salir" /><span>Cerrar sesión</span></button>
      </div>
      <NotificacionesGlobales anclaRef={cerrarSesionRef} />
      <span className={`erp-topbar-underline ${headerClasses.topbarUnderline}`} aria-hidden="true" />
    </header>
  );
}
