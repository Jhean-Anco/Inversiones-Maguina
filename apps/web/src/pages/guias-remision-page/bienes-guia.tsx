import { Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { DetalleDocumentoGuia } from "../../services/ingresos.service";
import { evitarEnvioBusqueda, SeccionGuia } from "./campos-guia";

const formatoCantidad = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

type Props = {
  bienes: DetalleDocumentoGuia[];
  cantidades: Record<string, string>;
  alCambiarCantidad: (id: string, cantidad: string | null) => void;
};

/** Bienes del comprobante de origen: buscador arriba y líneas `os-linea` con la cantidad a trasladar. */
export function BienesGuia({ bienes, cantidades, alCambiarCantidad }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const seleccionados = bienes.filter((bien) => cantidades[bien.id] !== undefined);
  const disponibles = useMemo(() => {
    const consulta = busqueda.trim().toLocaleLowerCase("es-PE");
    return bienes.filter((bien) => cantidades[bien.id] === undefined && bien.descripcion.toLocaleLowerCase("es-PE").includes(consulta));
  }, [bienes, busqueda, cantidades]);

  return <SeccionGuia paso={3} id="guia-titulo-bienes" titulo="Bienes a trasladar"
    extra={<span className="os-contador">{seleccionados.length} {seleccionados.length === 1 ? "bien" : "bienes"}</span>}>
    <div className="guia-bloque">
      <div className="os-buscador">
        <label className="os-buscador-campo">
          <Search aria-hidden="true" size={18} />
          <input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} onKeyDown={evitarEnvioBusqueda}
            placeholder="Buscar repuestos o mototaxis del comprobante" aria-label="Buscar bienes del comprobante" />
        </label>
        {disponibles.length > 0 ? <div className="os-resultados guia-resultados" role="list" aria-label="Bienes disponibles">
          {disponibles.map((bien) => <button key={bien.id} role="listitem" type="button" className="os-resultado" onClick={() => alCambiarCantidad(bien.id, bien.cantidad)}>
            <span className="os-resultado-datos">
              <strong>{bien.descripcion}</strong>
              <small>{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"} · {formatoCantidad.format(Number(bien.cantidad))} {bien.unidad ?? "NIU"} en el comprobante</small>
            </span>
            <Plus aria-hidden="true" size={16} />
          </button>)}
        </div> : busqueda.trim() && <p className="os-resultados-estado"><strong>No encontramos «{busqueda.trim()}» en el comprobante</strong>Prueba con otro nombre.</p>}
      </div>

      {seleccionados.length ? <div className="os-lineas" role="table" aria-label="Bienes a trasladar">
        <div className="os-lineas-cabecera" role="row"><span role="columnheader">DESCRIPCIÓN</span><span role="columnheader">EN COMPROBANTE</span><span role="columnheader">A TRASLADAR</span><span role="columnheader" aria-label="Quitar" /></div>
        {seleccionados.map((bien) => <div role="row" className="os-linea es-producto es-incluida" key={bien.id}>
          <div role="cell" className="os-linea-descripcion"><strong className="guia-linea-nombre" title={bien.descripcion}>{bien.descripcion}</strong><small className="os-ayuda">{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"}</small></div>
          <span role="cell" className="guia-linea-celda">{formatoCantidad.format(Number(bien.cantidad))} {bien.unidad ?? "NIU"}</span>
          <label role="cell" className="os-linea-campo os-linea-cantidad"><span>A trasladar</span>
            <input type="number" min="0.001" max={Number(bien.cantidad)} step="0.001" required value={cantidades[bien.id]}
              aria-label={`Cantidad a trasladar de ${bien.descripcion}`} onChange={(evento) => alCambiarCantidad(bien.id, evento.target.value)} />
          </label>
          <button type="button" className="os-linea-quitar" aria-label={`Quitar ${bien.descripcion}`} title="Quitar" onClick={() => alCambiarCantidad(bien.id, null)}><X aria-hidden="true" size={16} /></button>
        </div>)}
      </div> : <div className="os-vacio"><strong>Aún no hay bienes en la guía</strong><span>Búscalos arriba y agrégalos al traslado.</span></div>}
    </div>
  </SeccionGuia>;
}
