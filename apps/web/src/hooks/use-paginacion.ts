import { useEffect, useMemo, useState } from "react";

const TAMANOS_PAGINA = [4, 6, 8, 9, 12, 16, 20] as const;

export function usePaginacion<T>(registros: T[], tamanioInicial: number = TAMANOS_PAGINA[0]) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(TAMANOS_PAGINA.includes(tamanioInicial as (typeof TAMANOS_PAGINA)[number]) ? tamanioInicial : TAMANOS_PAGINA[0]);
  const totalPaginas = Math.max(1, Math.ceil(registros.length / porPagina));
  const visibles = useMemo(
    () => registros.slice((pagina - 1) * porPagina, pagina * porPagina),
    [registros, pagina, porPagina],
  );

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  useEffect(() => {
    const nuevoTamanio = TAMANOS_PAGINA.includes(tamanioInicial as (typeof TAMANOS_PAGINA)[number]) ? tamanioInicial : TAMANOS_PAGINA[0];
    if (porPagina !== nuevoTamanio) { setPorPagina(nuevoTamanio); setPagina(1); }
  }, [porPagina, tamanioInicial]);

  function cambiarPorPagina(cantidad: number) {
    if (!TAMANOS_PAGINA.includes(cantidad as (typeof TAMANOS_PAGINA)[number])) return;
    setPorPagina(cantidad);
    setPagina(1);
  }

  return {
    pagina,
    porPagina,
    visibles,
    totalPaginas,
    desde: registros.length ? (pagina - 1) * porPagina + 1 : 0,
    hasta: Math.min(pagina * porPagina, registros.length),
    cambiarPagina: setPagina,
    cambiarPorPagina,
  };
}
