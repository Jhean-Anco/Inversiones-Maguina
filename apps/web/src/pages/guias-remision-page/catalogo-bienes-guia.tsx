import { Search, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { DetalleDocumentoGuia } from "../../services/ingresos.service";
import { Button } from "../../components/ui/button";
import { evitarEnvioBusqueda } from "./campos-guia";

type FiltroBien = "TODOS" | "PRODUCTO" | "MOTOTAXI";
type Props = {
  bienes: DetalleDocumentoGuia[];
  cantidades: Record<string, string>;
  alAgregar: (bien: DetalleDocumentoGuia) => void;
  habilitado: boolean;
  ocupado: boolean;
};

const formatoCantidad = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

export function CatalogoBienesGuia({ bienes, cantidades, alAgregar, habilitado, ocupado }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<FiltroBien>("TODOS");
  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es-PE");
    return bienes.filter((bien) => (filtro === "TODOS" || bien.tipo === filtro)
      && `${bien.descripcion} ${bien.codigo ?? ""}`.toLocaleLowerCase("es-PE").includes(consulta));
  }, [bienes, busqueda, filtro]);

  return <aside className="guide-source-sidebar" aria-label="Catálogo de bienes del comprobante">
    <header className="guide-source-heading"><div><span>CATÁLOGO</span><h2>Buscar repuestos y mototaxis</h2><p>Agrega bienes de la factura seleccionada.</p></div></header>
    <label className="guide-catalog-search"><Search size={17} aria-hidden="true" /><input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} onKeyDown={evitarEnvioBusqueda} placeholder="Nombre o código del bien" aria-label="Buscar repuestos y mototaxis" disabled={ocupado} /></label>
    <div className="guide-catalog-filters" role="group" aria-label="Filtrar tipo de bien">
      {([ ["TODOS", "Todos"], ["PRODUCTO", "Repuestos"], ["MOTOTAXI", "Mototaxis"] ] as const).map(([valor, etiqueta]) => <button key={valor} type="button" className={filtro === valor ? "is-active" : ""} aria-pressed={filtro === valor} disabled={ocupado} onClick={() => setFiltro(valor)}>{etiqueta}</button>)}
    </div>
    <div className="guide-catalog-results" aria-live="polite">
      {!habilitado ? <div className="guide-catalog-empty"><strong>Selecciona la factura</strong><span>El catálogo mostrará los repuestos y mototaxis incluidos en el comprobante de origen.</span></div>
        : visibles.length ? visibles.map((bien) => {
          const agregado = cantidades[bien.id] !== undefined;
          return <article className="guide-catalog-product" key={bien.id}>
            <div className="guide-catalog-product-title"><strong>{bien.descripcion}</strong><span>{bien.codigo || (bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto")}</span></div>
            <div className="guide-catalog-product-meta"><span>{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"}</span><strong>En factura: {formatoCantidad.format(Number(bien.cantidad))} {bien.unidad ?? "NIU"}</strong></div>
            <Button size="sm" variant={agregado ? "secondary" : "outline"} disabled={agregado || !habilitado} onClick={() => alAgregar(bien)}>{agregado ? "Agregado" : <><Plus size={14} aria-hidden="true" />Agregar al traslado</>}</Button>
          </article>;
        }) : <div className="guide-catalog-empty"><strong>No hay bienes para mostrar</strong><span>Prueba con otro nombre o cambia el filtro de categoría.</span></div>}
    </div>
  </aside>;
}
