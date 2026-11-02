import { createContext, useCallback, useContext, useLayoutEffect, useState, type ReactNode } from "react";

export type TemaAplicacion = "claro" | "oscuro";
type ContextoTema = { tema: TemaAplicacion; alternarTema: () => void };
const TemaContext = createContext<ContextoTema | null>(null);
const CLAVE_TEMA = "magina-tema";

function obtenerTemaInicial(): TemaAplicacion {
  try { return window.localStorage.getItem(CLAVE_TEMA) === "oscuro" ? "oscuro" : "claro"; }
  catch { return "claro"; }
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<TemaAplicacion>(obtenerTemaInicial);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = tema;
    document.documentElement.style.colorScheme = tema === "oscuro" ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "oscuro" ? "#0c1421" : "#f4f7fb");
    try { window.localStorage.setItem(CLAVE_TEMA, tema); } catch { /* La preferencia sigue activa durante esta sesión. */ }
  }, [tema]);
  const alternarTema = useCallback(() => setTema((actual) => actual === "claro" ? "oscuro" : "claro"), []);
  return <TemaContext.Provider value={{ tema, alternarTema }}>{children}</TemaContext.Provider>;
}

export function useTema() {
  const contexto = useContext(TemaContext);
  if (!contexto) throw new Error("useTema debe usarse dentro de TemaProvider");
  return contexto;
}
