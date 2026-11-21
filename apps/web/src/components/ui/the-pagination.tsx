import { ChevronLeft, ChevronRight } from "lucide-react";

type PaginationBasicProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  isDisabled?: boolean;
};

export function PaginationBasic({ page, totalPages, onPageChange, ariaLabel = "Paginación del listado", isDisabled = false }: PaginationBasicProps) {
  const paginasTotales = Math.max(1, totalPages);
  const paginaActual = Math.min(Math.max(1, page), paginasTotales);
  const paginas: Array<number | "ellipsis-start" | "ellipsis-end"> = paginasTotales <= 5
    ? Array.from({ length: paginasTotales }, (_, index) => index + 1)
    : paginaActual <= 3
      ? [1, 2, 3, 4, "ellipsis-end", paginasTotales]
      : paginaActual >= paginasTotales - 2
        ? [1, "ellipsis-start", paginasTotales - 3, paginasTotales - 2, paginasTotales - 1, paginasTotales]
        : [1, "ellipsis-start", paginaActual - 1, paginaActual, paginaActual + 1, "ellipsis-end", paginasTotales];

  const botonBase = "inline-flex min-h-[34px] items-center justify-center rounded-[9px] border text-[12px] font-bold transition-[background-color,border-color,color,box-shadow] duration-[150ms] ease-[ease] focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-[#9fc1e0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-[#e6ebf0] disabled:bg-[#f5f7f9] disabled:text-[#8292a1] disabled:opacity-100";
  const boton = `${botonBase} min-w-[34px] border-transparent bg-white text-[#315779] enabled:hover:border-[#bdd0e0] enabled:hover:bg-[#edf4fb] data-[active=true]:border-[#194d7e] data-[active=true]:bg-[#194d7e] data-[active=true]:text-white data-[active=true]:cursor-default data-[active=true]:enabled:hover:border-[#194d7e] data-[active=true]:enabled:hover:bg-[#194d7e]`;
  const botonNavegacion = `${botonBase} min-w-[94px] gap-1.5 border-[#d2deea] bg-[#f8fafc] px-[10px] text-[#194d7e] enabled:hover:border-[#194d7e] enabled:hover:bg-[#e7f0f8] enabled:hover:text-[#123b62] enabled:hover:shadow-[0_2px_7px_#15344f14] mobile-portrait:min-w-9 mobile-portrait:px-2 mobile-portrait:gap-0 mobile-portrait:[&>span]:hidden`;

  return <nav className="the-pagination flex w-auto items-center justify-center mx-auto" aria-label={ariaLabel}>
    <div className="flex flex-wrap items-center justify-center gap-[25px]">
      <button className={botonNavegacion} type="button" aria-label="Página anterior" disabled={isDisabled || paginaActual === 1} onClick={() => { if (paginaActual > 1 && !isDisabled) onPageChange(paginaActual - 1); }}>
        <ChevronLeft aria-hidden="true" size={16} /><span>Anterior</span>
      </button>
      <ul className="m-0 flex list-none flex-row flex-wrap items-center justify-center gap-1 p-0">
        {paginas.map((numero) => (
          <li className="list-item list-none" key={numero}>
            {typeof numero === "number" ? (
              <button className={boton} type="button" aria-label={`Página ${numero}`} aria-current={numero === paginaActual ? "page" : undefined} data-active={numero === paginaActual ? "true" : undefined} disabled={isDisabled} onClick={() => { if (numero !== paginaActual && !isDisabled) onPageChange(numero); }}>
                {numero}
              </button>
            ) : <span className="inline-flex min-h-[34px] min-w-6 items-center justify-center text-[13px] text-[#71849b]" aria-hidden="true">…</span>}
          </li>
        ))}
      </ul>
      <button className={botonNavegacion} type="button" aria-label="Página siguiente" disabled={isDisabled || paginaActual === paginasTotales} onClick={() => { if (paginaActual < paginasTotales && !isDisabled) onPageChange(paginaActual + 1); }}>
        <span>Siguiente</span><ChevronRight aria-hidden="true" size={16} />
      </button>
    </div>
  </nav>;
}
