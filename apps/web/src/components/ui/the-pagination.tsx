import { ChevronLeft, ChevronRight } from "lucide-react";
import "./the-pagination.css";

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
  const paginas: Array<number | "ellipsis-start" | "ellipsis-end"> = paginasTotales <= 7
    ? Array.from({ length: paginasTotales }, (_, index) => index + 1)
    : paginaActual <= 4
      ? [1, 2, 3, 4, 5, "ellipsis-end", paginasTotales]
      : paginaActual >= paginasTotales - 3
        ? [1, "ellipsis-start", paginasTotales - 4, paginasTotales - 3, paginasTotales - 2, paginasTotales - 1, paginasTotales]
        : [1, "ellipsis-start", paginaActual - 1, paginaActual, paginaActual + 1, "ellipsis-end", paginasTotales];

  return <nav className="the-pagination" aria-label={ariaLabel}>
    <ul className="pagination__content">
      <li className="pagination__item">
        <button className="pagination__link pagination__link--nav" type="button" aria-label="Página anterior" disabled={isDisabled || paginaActual === 1} onClick={() => onPageChange(Math.max(1, paginaActual - 1))}>
          <ChevronLeft aria-hidden="true" size={16} /><span>Anterior</span>
        </button>
      </li>
      {paginas.map((numero) => (
        <li className="pagination__item" key={numero}>
          {typeof numero === "number" ? (
            <button className="pagination__link" type="button" aria-label={`Página ${numero}`} aria-current={numero === paginaActual ? "page" : undefined} data-active={numero === paginaActual ? "true" : undefined} disabled={isDisabled} onClick={() => onPageChange(numero)}>
              {numero}
            </button>
          ) : <span className="pagination__ellipsis" aria-hidden="true">…</span>}
        </li>
      ))}
      <li className="pagination__item">
        <button className="pagination__link pagination__link--nav" type="button" aria-label="Página siguiente" disabled={isDisabled || paginaActual === paginasTotales} onClick={() => onPageChange(Math.min(paginasTotales, paginaActual + 1))}>
          <span>Siguiente</span><ChevronRight aria-hidden="true" size={16} />
        </button>
      </li>
    </ul>
  </nav>;
}
