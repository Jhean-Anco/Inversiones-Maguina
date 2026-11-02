import "./catalogo-paginacion.css";
type SelectorProps = {
  valor: number;
  onCambiar: (valor: number) => void;
};

type NavegacionProps = {
  desde: number;
  hasta: number;
  total: number;
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
};

export function SelectorTamanioPagina({ valor, onCambiar }: SelectorProps) {
  return (
    <label className="catalog-page-size">Mostrar
      <select value={valor} onChange={(evento) => onCambiar(Number(evento.target.value))}>
        <option value={12}>12</option>
        <option value={16}>16</option>
        <option value={20}>20</option>
      </select> por página
    </label>
  );
}

export function CatalogoPaginacion({ desde, hasta, total, pagina, totalPaginas, onCambiar }: NavegacionProps) {
  return (
    <div className="catalog-pagination">
      <span>Mostrando {desde}–{hasta} de {total}</span>
      <div>
        <button disabled={pagina === 1} onClick={() => onCambiar(pagina - 1)}>Anterior</button>
        <span>Página {pagina} de {totalPaginas}</span>
        <button disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>Siguiente</button>
      </div>
    </div>
  );
}
