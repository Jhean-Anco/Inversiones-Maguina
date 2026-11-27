import { PaginationBasic } from "../the-pagination";

type PaginacionListadoProps = {
  pagina: number;
  totalPaginas: number;
  alCambiar: (pagina: number) => void;
  total: number;
  desde: number;
  hasta: number;
  cargando?: boolean;
  clase?: string;
};

export function PaginacionListado({ pagina, totalPaginas, alCambiar, total, desde, hasta, cargando = false, clase = "" }: PaginacionListadoProps) {
  return (
    <footer className="listado-maestro-footer mt-auto grid w-full shrink-0 box-border grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 border-t border-[var(--erp-border,#e7edf2)] bg-[var(--erp-surface,#fff)] px-4 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))] mobile-portrait:grid-cols-1 mobile-portrait:justify-items-center mobile-portrait:px-3">
      <span className="listado-maestro-resumen justify-self-start whitespace-nowrap text-xs tabular-nums text-[var(--erp-ink-muted,#5f7388)] mobile-portrait:justify-self-center" aria-live="polite">
        Mostrando {desde.toLocaleString("es-PE")}–{hasta.toLocaleString("es-PE")} de {total.toLocaleString("es-PE")}
      </span>
      <nav className={`listado-maestro-paginacion flex items-center justify-self-center gap-2.5 whitespace-nowrap text-xs text-[var(--erp-ink-muted,#5f7388)] [&_.the-pagination]:mx-0 ${clase}`} aria-label="Paginación del listado">
        <PaginationBasic page={pagina} totalPages={totalPaginas} onPageChange={alCambiar} ariaLabel="Paginación del listado" isDisabled={cargando} />
      </nav>
    </footer>
  );
}
