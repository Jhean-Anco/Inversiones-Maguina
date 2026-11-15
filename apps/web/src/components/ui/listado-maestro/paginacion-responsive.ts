export type VarianteListado = "tabla" | "tarjetas";
import { getResponsiveProfile } from "../../../utilidades/responsive-profile";

export type { ResponsiveProfile } from "../../../utilidades/responsive-profile";

export function tamanioListadoSegunPantalla(ancho: number, variante: VarianteListado, alto = typeof window === "undefined" ? 768 : window.innerHeight) {
  const perfil = getResponsiveProfile(ancho, alto);
  if (variante === "tabla") {
    if (perfil === "laptop" || perfil === "tablet-landscape") return 10;
    if (perfil === "tablet-portrait") return 8;
    return perfil === "mobile-landscape" ? 6 : 4;
  }
  if (perfil === "laptop") return 12;
  if (perfil === "tablet-landscape") return 10;
  if (perfil === "tablet-portrait") return 8;
  return perfil === "mobile-landscape" ? 6 : 4;
}

export function tamanioTablaInicial() {
  return tamanioListadoSegunPantalla(typeof window === "undefined" ? 1366 : window.innerWidth, "tabla", typeof window === "undefined" ? 768 : window.innerHeight);
}
