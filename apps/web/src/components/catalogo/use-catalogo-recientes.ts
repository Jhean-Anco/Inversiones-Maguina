import { useCallback, useRef, useState } from "react";

export const MIN_CARACTERES_BUSQUEDA_CATALOGO = 4;
export const MAX_RESULTADOS_CATALOGO = 10;
export const MAX_RECIENTES_CATALOGO = 10;

export type CatalogoReciente = {
  id: string;
  nombre: string;
  codigo: string;
  detalle?: string;
};

const CLAVE_CATALOGO_RECIENTES = "magina:catalogo:recientes:v1";

function esCatalogoReciente(valor: unknown): valor is CatalogoReciente {
  if (typeof valor !== "object" || valor === null) return false;
  const item = valor as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.nombre === "string" && typeof item.codigo === "string"
    && (item.detalle === undefined || typeof item.detalle === "string");
}

function leerLista(clave: string): CatalogoReciente[] {
  try {
    const valores: unknown = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
    return Array.isArray(valores) ? valores.filter(esCatalogoReciente).slice(0, MAX_RECIENTES_CATALOGO) : [];
  } catch {
    return [];
  }
}

function migrarProductosVenta(clave: string): CatalogoReciente[] {
  try {
    const valores: unknown = JSON.parse(window.localStorage.getItem(clave) ?? "[]");
    if (!Array.isArray(valores)) return [];
    return valores.flatMap((valor: unknown) => {
      if (typeof valor !== "object" || valor === null) return [];
      const item = valor as Record<string, unknown>;
      if (typeof item.presentacionId !== "string" || typeof item.nombre !== "string" || typeof item.codigo !== "string") return [];
      return [{ id: item.presentacionId, nombre: item.nombre, codigo: item.codigo, detalle: typeof item.presentacion === "string" ? item.presentacion : undefined }];
    }).slice(0, MAX_RECIENTES_CATALOGO);
  } catch {
    return [];
  }
}

export function useCatalogoRecientes(ambito: "repuestos" | "mototaxis-venta" | "mototaxis-modelos", claveMigracion?: string) {
  const clave = `${CLAVE_CATALOGO_RECIENTES}:${ambito}`;
  const [recientes, setRecientes] = useState<CatalogoReciente[]>(() => {
    const guardados = leerLista(clave);
    if (guardados.length || !claveMigracion) return guardados;
    const migrados = migrarProductosVenta(claveMigracion);
    if (migrados.length) {
      try { window.localStorage.setItem(clave, JSON.stringify(migrados)); } catch { /* La selección sigue disponible durante esta sesión. */ }
    }
    return migrados;
  });
  const recientesRef = useRef(recientes);
  recientesRef.current = recientes;

  const registrar = useCallback((item: CatalogoReciente) => {
    const siguientes = [item, ...recientesRef.current.filter((actual) => actual.id !== item.id)].slice(0, MAX_RECIENTES_CATALOGO);
    recientesRef.current = siguientes;
    setRecientes(siguientes);
    try { window.localStorage.setItem(clave, JSON.stringify(siguientes)); } catch { /* No se bloquea la operación si el navegador no permite guardar el historial. */ }
  }, [clave]);

  return { recientes, registrar } as const;
}
