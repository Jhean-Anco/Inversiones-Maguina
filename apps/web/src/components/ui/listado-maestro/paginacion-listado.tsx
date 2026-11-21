import { PaginationBasic } from "../the-pagination";

type PaginacionListadoProps = {
  pagina: number;
  totalPaginas: number;
  alCambiar: (pagina: number) => void;
  cargando?: boolean;
  clase?: string;
};

export function PaginacionListado({ pagina, totalPaginas, alCambiar, cargando = false, clase = "" }: PaginacionListadoProps) {
  return (
    <footer className="listado-maestro-footer mt-auto flex w-full shrink-0 box-border items-center justify-center border-t border-[color-mix(in_srgb,var(--erp-border,#dce5ed)_70%,transparent)] bg-[var(--erp-surface,#fff)] px-[14px] py-[10px] pb-[max(10px,env(safe-area-inset-bottom))] mobile-portrait:px-2">
      <nav className={`listado-maestro-paginacion flex items-center justify-center mx-auto gap-[14px] whitespace-nowrap text-xs text-[var(--erp-ink-muted,#718797)] [&_.the-pagination]:mx-auto mobile-portrait:gap-2 mobile-portrait:text-[11px] mobile-portrait:[&>span]:hidden ${clase}`} aria-label="Paginación del listado">
        <PaginationBasic page={pagina} totalPages={totalPaginas} onPageChange={alCambiar} ariaLabel="Paginación del listado" isDisabled={cargando} />
      </nav>
    </footer>
  );
}
