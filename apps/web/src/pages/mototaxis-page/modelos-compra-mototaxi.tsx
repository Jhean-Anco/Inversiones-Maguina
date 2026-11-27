import { ChevronDown, Plus, Search, X } from "lucide-react";
import type { CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO } from "../../components/catalogo/use-catalogo-recientes";
import type { ModeloMototaxi } from "../../services/mototaxis.service";

export type LineaCompraMototaxi = { clave: string; modeloId: string; cantidad: string; costoUnitario: string; porcentajeGarantia: string; mesesGarantia: string };

const soles = (valor: number) => `S/ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  modelos: ModeloMototaxi[];
  busqueda: string;
  alBuscar: (valor: string) => void;
  alElegir: (modelo: ModeloMototaxi) => void;
  recientes: CatalogoReciente[];
  alElegirReciente: (reciente: CatalogoReciente) => void;
  alCrearModelo: () => void;
  nombreModelo: (id: string) => string;
  lineas: LineaCompraMototaxi[];
  alCambiar: (clave: string, cambios: Partial<LineaCompraMototaxi>) => void;
  alQuitar: (clave: string) => void;
  /** Sin documento no hay proveedor a quien reclamar: la línea no lleva garantía. */
  conGarantia: boolean;
};

/** Buscador de modelos y líneas `os-linea`: cantidad, costo unitario y garantía del proveedor. */
export function ModelosCompraMototaxi({ modelos, busqueda, alBuscar, alElegir, recientes, alElegirReciente, alCrearModelo, nombreModelo, lineas, alCambiar, alQuitar, conGarantia }: Props) {
  const consulta = busqueda.trim();
  const termino = consulta.toLocaleLowerCase();
  const encontrados = consulta.length >= MIN_CARACTERES_BUSQUEDA_CATALOGO
    ? modelos.filter((m) => `${m.marca} ${m.nombre} ${m.version ?? ""} ${m.codigo}`.toLocaleLowerCase().includes(termino)).slice(0, MAX_RESULTADOS_CATALOGO)
    : [];

  return <>
    <div className="os-buscador">
      <label className="os-buscador-campo">
        <Search aria-hidden="true" size={18} strokeWidth={2} />
        <input type="search" value={busqueda} autoComplete="off" placeholder="Buscar modelo por marca o nombre…" aria-label="Buscar modelos para comprar"
          onChange={(evento) => alBuscar(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
      </label>
      {consulta ? <div className="os-resultados" aria-live="polite">
        {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar en el catálogo.</p>
          : encontrados.length ? encontrados.map((modelo) => <button className="os-resultado" key={modelo.id} type="button" onClick={() => alElegir(modelo)}>
            <span className="os-resultado-datos"><strong>{nombreModelo(modelo.id)}</strong><small>{modelo.categoriaVehicular}</small></span>
            <Plus aria-hidden="true" size={16} />
          </button>)
          : <div className="os-resultados-estado"><strong>No hay modelos para mostrar</strong><span>No encontramos «{consulta}» en el catálogo.</span>
            <button className="os-crear-repuesto" type="button" onClick={alCrearModelo}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Crear modelo «{consulta}»</button>
          </div>}
      </div> : <div className="os-recientes" aria-live="polite">
        <span className="os-recientes-titulo">Últimos modelos seleccionados</span>
        {recientes.length ? recientes.map((item) => <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a agregar ${item.nombre}`} onClick={() => alElegirReciente(item)}>
          <Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}
        </button>) : <span className="os-recientes-vacio">Aún no has seleccionado modelos.</span>}
      </div>}
    </div>

    {lineas.length === 0 ? <div className="os-vacio">
      <strong>Agrega el primer modelo</strong>
      <span>Búscalo en el catálogo e indica la cantidad y el costo unitario{conGarantia ? " y la garantía del proveedor" : ""}.</span>
    </div> : <div className="os-lineas" role="table" aria-label="Modelos de la compra">
      <div className="os-lineas-cabecera" role="row"><span role="columnheader">DESCRIPCIÓN</span><span role="columnheader">CANT.</span><span role="columnheader">COSTO UNIT.</span><span role="columnheader">TOTAL</span><span role="columnheader" aria-label="Quitar" /></div>
      <div role="rowgroup" aria-label="Modelos de la compra">
        <div className="os-lineas-grupo">MOTOTAXIS</div>
        {lineas.map((linea) => {
          const nombre = nombreModelo(linea.modeloId);
          return <div role="row" className="os-linea es-producto" key={linea.clave}>
            <div role="cell" className="os-linea-descripcion">
              <input aria-label="Modelo" title={nombre} value={nombre} readOnly />
              {conGarantia && <div className="compra-moto-garantia">
                <span>Garantía</span>
                <span className="os-select">
                  <select aria-label={`Cobertura de garantía de ${nombre}`} value={linea.porcentajeGarantia} onChange={(evento) => alCambiar(linea.clave, { porcentajeGarantia: evento.target.value })}>
                    <option value="70">70%</option><option value="80">80%</option>
                  </select>
                  <ChevronDown aria-hidden="true" size={14} />
                </span>
                <span>por</span>
                <input aria-label={`Meses de garantía de ${nombre}`} type="number" min="1" max="120" step="1" required value={linea.mesesGarantia}
                  onChange={(evento) => alCambiar(linea.clave, { mesesGarantia: evento.target.value })} />
                <span>meses</span>
              </div>}
            </div>
            <label role="cell" className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
              <input aria-label={`Cantidad de ${nombre}`} type="number" min="1" max="2147483647" step="1" required value={linea.cantidad}
                onChange={(evento) => alCambiar(linea.clave, { cantidad: evento.target.value })} />
            </label>
            <label role="cell" className="os-linea-campo os-linea-precio"><span>Costo unit.</span>
              <input aria-label={`Costo unitario de ${nombre}`} type="number" min="0.01" step="0.01" placeholder="0.00" required value={linea.costoUnitario}
                onChange={(evento) => alCambiar(linea.clave, { costoUnitario: evento.target.value })} />
            </label>
            <div role="cell" className="os-linea-total"><span>Total</span><strong>{soles((Number(linea.cantidad) || 0) * (Number(linea.costoUnitario) || 0))}</strong></div>
            <button className="os-linea-quitar" type="button" aria-label={`Quitar ${nombre}`} title="Quitar" onClick={() => alQuitar(linea.clave)}><X aria-hidden="true" size={16} /></button>
          </div>;
        })}
      </div>
    </div>}
  </>;
}
