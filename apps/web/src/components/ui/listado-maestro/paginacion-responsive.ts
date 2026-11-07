export type VarianteListado = "tabla" | "tarjetas";

export function tamanioListadoSegunPantalla(ancho: number, variante: VarianteListado) {
  if (variante === "tabla") return ancho >= 1024 ? 10 : ancho >= 768 ? 8 : ancho >= 560 ? 6 : 4;
  return ancho >= 1200 ? 12 : ancho >= 900 ? 9 : ancho >= 600 ? 6 : 4;
}

export function tamanioTablaInicial() {
  return tamanioListadoSegunPantalla(typeof window === "undefined" ? 1280 : window.innerWidth, "tabla");
}
