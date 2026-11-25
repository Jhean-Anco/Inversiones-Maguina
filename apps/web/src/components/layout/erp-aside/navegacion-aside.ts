export type PermisoNavegacion =
  | "INGRESOS.CREAR"
  | "INGRESOS.LEER"
  | "INVENTARIO.CREAR"
  | "EGRESOS.LEER"
  | "MOTOTAXIS.CREAR"
  | "INVENTARIO.LEER"
  | "MOTOTAXIS.LEER"
  | "PERSONAS.LEER"
  | "FINANZAS.LEER"
  | "FINANZAS.ADMINISTRAR";

export type SubmoduloAside = {
  nombre: string;
  ruta: string;
  permiso: PermisoNavegacion;
  rutasRelacionadas?: { ruta: string; permiso: PermisoNavegacion }[];
};

export type ModuloAside = {
  nombre: string;
  icono: string;
  /** Sección del aside bajo la que se agrupa el módulo. */
  seccion?: string;
  ruta?: string;
  hijos: SubmoduloAside[];
};

export const elementosAside: ModuloAside[] = [
  { nombre: "Resumen", icono: "inicio", ruta: "/inicio", hijos: [] },
  {
    nombre: "Ingresos",
    seccion: "OPERACIÓN",
    icono: "venta",
    hijos: [
      { nombre: "Órdenes de servicio", ruta: "/ingresos/ordenes-servicio", permiso: "INGRESOS.LEER" },
      { nombre: "Cotizaciones", ruta: "/ingresos/cotizaciones", permiso: "INGRESOS.LEER" },
      { nombre: "Venta de repuestos", ruta: "/ingresos/ventas/repuestos", rutasRelacionadas: [{ ruta: "/ingresos/nuevo/repuestos", permiso: "INGRESOS.CREAR" }], permiso: "INGRESOS.LEER" },
      { nombre: "Venta de mototaxis", ruta: "/ingresos/ventas/mototaxis", rutasRelacionadas: [{ ruta: "/ingresos/nuevo/mototaxis", permiso: "INGRESOS.CREAR" }], permiso: "INGRESOS.LEER" },
      { nombre: "Guías de remisión", ruta: "/ingresos/guias", permiso: "INGRESOS.LEER" },
    ],
  },
  {
    nombre: "Egresos",
    seccion: "OPERACIÓN",
    icono: "egresos",
    hijos: [
      { nombre: "Compra de repuestos", ruta: "/egresos/compras", rutasRelacionadas: [{ ruta: "/egresos/compras/nueva", permiso: "INVENTARIO.CREAR" }], permiso: "INVENTARIO.LEER" },
      { nombre: "Compra de mototaxis", ruta: "/mototaxis/compras", rutasRelacionadas: [{ ruta: "/mototaxis/compras/nueva", permiso: "MOTOTAXIS.CREAR" }], permiso: "MOTOTAXIS.LEER" },
    ],
  },
  {
    nombre: "Catálogos",
    seccion: "ALMACÉN",
    icono: "catalogos",
    hijos: [
      { nombre: "Categorías", ruta: "/inventario/categorias", permiso: "INVENTARIO.LEER" },
      { nombre: "Marcas", ruta: "/inventario/marcas", permiso: "INVENTARIO.LEER" },
    ],
  },
  {
    nombre: "Inventario",
    seccion: "ALMACÉN",
    icono: "inventario",
    hijos: [
      { nombre: "Mototaxis", ruta: "/inventario/mototaxis", rutasRelacionadas: ["/mototaxis/garantias"].map((ruta) => ({ ruta, permiso: "MOTOTAXIS.LEER" as const })), permiso: "MOTOTAXIS.LEER" },
      { nombre: "Repuestos", ruta: "/inventario/productos", permiso: "INVENTARIO.LEER" },
      { nombre: "Ajustes de inventario de repuestos", ruta: "/inventario/movimientos-ajustes", permiso: "INVENTARIO.LEER" },
      { nombre: "Ajustes de inventario de mototaxis", ruta: "/mototaxis/movimientos", permiso: "MOTOTAXIS.LEER" },
    ],
  },
  {
    nombre: "Contactos",
    seccion: "GESTIÓN",
    icono: "personas",
    hijos: [
      { nombre: "Clientes", ruta: "/clientes", permiso: "PERSONAS.LEER" },
      { nombre: "Proveedores", ruta: "/personas/proveedores", permiso: "PERSONAS.LEER" },
      { nombre: "Conductores", ruta: "/personas/conductores", permiso: "PERSONAS.LEER" },
    ],
  },
  { nombre: "Finanzas", seccion: "GESTIÓN", icono: "finanzas", hijos: [{ nombre: "Cuentas y medios de pago", ruta: "/finanzas/cuentas", permiso: "FINANZAS.LEER" }, { nombre: "Movimientos por cuenta", ruta: "/finanzas/movimientos", permiso: "FINANZAS.LEER" }] },
  {
    nombre: "Reportes",
    seccion: "GESTIÓN",
    icono: "reportes",
    hijos: [
      { nombre: "Inventario", ruta: "/reportes/inventario", permiso: "INVENTARIO.LEER" },
    ],
  },
  { nombre: "Configuración", seccion: "SISTEMA", icono: "administracion", hijos: [{ nombre: "Series de documentos", ruta: "/configuracion/series", permiso: "FINANZAS.ADMINISTRAR" }] },
];

function rutaCoincide(rutaActual: string, elemento: SubmoduloAside) {
  return elemento.ruta === rutaActual || elemento.rutasRelacionadas?.some(({ ruta }) => ruta === rutaActual) === true;
}

function permisoDeRuta(rutaActual: string, elemento: SubmoduloAside) {
  return elemento.ruta === rutaActual
    ? elemento.permiso
    : elemento.rutasRelacionadas?.find(({ ruta }) => ruta === rutaActual)?.permiso ?? elemento.permiso;
}

export function obtenerNavegacionAside(rutaActual: string, permisos: string[]) {
  const elementoActual = elementosAside
    .flatMap((modulo) => modulo.hijos.map((hijo) => ({ modulo, hijo })))
    .find(({ hijo }) => rutaCoincide(rutaActual, hijo));

  const navegacionVisible = elementosAside
    .map((modulo) => ({ ...modulo, hijos: modulo.hijos.filter((hijo) => permisos.includes(hijo.permiso)) }))
    .filter((modulo) => modulo.ruta || modulo.hijos.length > 0);

  const accesoDenegado = Boolean(elementoActual && !permisos.includes(permisoDeRuta(rutaActual, elementoActual.hijo)));
  const moduloActivo = accesoDenegado ? undefined : elementoActual?.modulo;
  const submoduloActivo = accesoDenegado ? undefined : elementoActual?.hijo;

  return { moduloActivo, submoduloActivo, navegacionVisible, accesoDenegado };
}
