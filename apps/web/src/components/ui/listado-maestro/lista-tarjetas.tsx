import type { ReactNode } from "react";

type ListaTarjetasProps = {
  tarjetas: readonly ReactNode[];
  columnas: number;
  claseTarjeta?: string;
};

export function ListaTarjetas({ tarjetas, columnas, claseTarjeta = "" }: ListaTarjetasProps) {
  const catalogo = /(?:^|\s)catalog-admin-grid(?:\s|$)/.test(claseTarjeta);

  return <div className={`listado-maestro-tarjetas ${catalogo ? "" : "grid grid-cols-[repeat(var(--listado-columnas,3),minmax(0,1fr))] content-start gap-3 p-3 mobile-portrait:grid-cols-1 mobile-portrait:gap-2.5"} ${claseTarjeta}`} style={{ "--listado-columnas": Math.max(1, columnas) } as React.CSSProperties}>
    {tarjetas}
  </div>;
}
