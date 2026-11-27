import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import "./tabla-listado.css";

type TablaListadoProps = {
  encabezado: ReactNode;
  filas: readonly ReactNode[];
  claseTabla?: string;
  claseContenedor?: string;
  centrarCeldas?: boolean;
};

const clases = {
  scroll: "box-border min-h-0 min-w-0 w-full flex-[1_1_auto] overflow-x-auto overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:auto]",
  table: "m-0 w-full max-w-none border-collapse tabular-nums [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:h-10 [&_th]:whitespace-nowrap [&_th]:border-b-0 [&_th]:bg-[var(--erp-surface-muted,#f8fafc)] [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-semibold [&_th]:tracking-[var(--erp-tracking-caps,.06em)] [&_th]:text-[var(--erp-ink-soft,#5d7286)] [&_th]:uppercase [&_th]:shadow-[inset_0_-1px_0_var(--erp-border,#e1e7ee)] [&_td]:border-b [&_td]:border-[var(--erp-border-subtle,#edf1f5)] [&_td]:px-4 [&_td]:py-3 [&_td]:text-[13px] [&_td]:leading-[1.45] [&_td]:text-[var(--erp-ink,#10243a)] [&_td]:align-middle [&_td]:transition-colors [&_td]:duration-150 [&_td_small]:text-[11px] [&_td_small]:leading-[1.35] [&_td_small]:text-[var(--erp-ink-soft,#5d7286)] [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover_td]:bg-[var(--erp-surface-hover,#f5f8fb)] mobile-portrait:min-w-[640px]",
};

function textoPlano(nodo: ReactNode): string {
  return Children.toArray(nodo).map((hijo) => {
    if (typeof hijo === "string" || typeof hijo === "number") return String(hijo);
    if (isValidElement<{ children?: ReactNode }>(hijo)) return textoPlano(hijo.props.children);
    return "";
  }).join(" ").replace(/\s+/g, " ").trim();
}

function etiquetasDeColumnas(encabezado: ReactNode): string[] {
  const fila = Children.toArray(encabezado).find((hijo) => isValidElement<{ children?: ReactNode }>(hijo) && hijo.type === "tr");
  if (!isValidElement<{ children?: ReactNode }>(fila)) return [];
  return Children.toArray(fila.props.children).map((celda, indice) => {
    const etiqueta = isValidElement<{ children?: ReactNode; "aria-label"?: string; title?: string }>(celda)
      ? textoPlano(celda.props.children) || celda.props["aria-label"] || celda.props.title
      : "";
    return etiqueta || `Dato ${indice + 1}`;
  });
}

function agregarEtiquetasMoviles(fila: ReactNode, etiquetas: string[]): ReactNode {
  if (!isValidElement<{ children?: ReactNode }>(fila) || fila.type !== "tr") return fila;
  let indiceColumna = 0;
  const celdas = Children.toArray(fila.props.children).map((celda) => {
    if (!isValidElement<Record<string, unknown>>(celda) || celda.type !== "td") return celda;
    const indiceActual = indiceColumna++;
    if (celda.props["data-label"]) return celda;
    return cloneElement(celda as ReactElement<Record<string, unknown>>, { "data-label": etiquetas[indiceActual] ?? `Dato ${indiceActual + 1}` });
  });
  return cloneElement(fila, undefined, celdas);
}

export function TablaListado({ encabezado, filas, claseTabla = "", claseContenedor = "", centrarCeldas = true }: TablaListadoProps) {
  const egresos = /(?:^|\s)egresos-table(?:\s|$)/.test(claseTabla);
  const etiquetas = etiquetasDeColumnas(encabezado);

  return <div className={`listado-maestro-tabla-scroll ${clases.scroll} ${claseContenedor}`}>
    <table className={`listado-maestro-tabla w-full ${egresos ? "" : clases.table} ${centrarCeldas ? "[&_th]:!text-center [&_td]:!text-center [&_td>div]:!justify-center" : ""} ${claseTabla}`}>
      <thead>{encabezado}</thead>
      <tbody>{filas.map((fila) => agregarEtiquetasMoviles(fila, etiquetas))}</tbody>
    </table>
  </div>;
}
