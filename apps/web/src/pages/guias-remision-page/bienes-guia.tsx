import { Package, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import type { DetalleDocumentoGuia } from "../../services/ingresos.service";
import { claseCampoGuia, claseControlGuia, evitarEnvioBusqueda, SeccionGuia } from "./campos-guia";

const formatoCantidad = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

type Props = {
  bienes: DetalleDocumentoGuia[];
  cantidades: Record<string, string>;
  alCambiarCantidad: (id: string, cantidad: string | null) => void;
};

export function BienesGuia({ bienes, cantidades, alCambiarCantidad }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const consulta = busqueda.trim().toLocaleLowerCase("es-PE");
  const visibles = bienes.filter((bien) => {
    const tipo = bien.tipo === "MOTOTAXI" ? "mototaxi" : "repuesto";
    return cantidades[bien.id] !== undefined || `${bien.descripcion} ${bien.codigo ?? ""} ${tipo}`.toLocaleLowerCase("es-PE").includes(consulta);
  });

  return <SeccionGuia titulo="Detalle de bienes a trasladar" icono={<Package />}>
    <div className="grid min-w-0 items-start gap-4 @[58rem]:grid-cols-[minmax(0,1fr)_15rem] @[58rem]:gap-6">
      <div className="grid min-w-0 gap-3">
        <label className={`${claseCampoGuia} max-w-sm`}>Buscar bien en el documento
          <input className={claseControlGuia} type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} onKeyDown={evitarEnvioBusqueda} placeholder="Nombre o código del bien" />
        </label>
        <div className="rounded-md border border-border">
          <div className="hidden grid-cols-[minmax(0,1fr)_7rem_8rem] items-center gap-4 border-b border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground @[35rem]:grid" aria-hidden="true">
            <span>Descripción</span><span>Cant. en venta</span><span>Cant. a trasladar</span>
          </div>
          <ul className="m-0 list-none divide-y divide-border p-0">
            {visibles.map((bien) => {
              const cantidad = cantidades[bien.id];
              const agregado = cantidad !== undefined;
              return <li className={`grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 @[35rem]:grid-cols-[minmax(0,1fr)_7rem_8rem] @[35rem]:gap-x-4 ${agregado ? "bg-muted" : ""}`} key={bien.id}>
                <div className="col-span-full grid min-w-0 gap-0.5 @[35rem]:col-span-1">
                  <strong className="text-sm [overflow-wrap:anywhere]">{bien.descripcion}</strong>
                  <span className="text-xs text-muted-foreground">{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"}{bien.codigo && ` · ${bien.codigo}`}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums"><span className="@[35rem]:sr-only">Cant. en venta </span>{formatoCantidad.format(Number(bien.cantidad))} {bien.unidad ?? "NIU"}</span>
                {agregado
                  ? <div className="flex items-center gap-1.5">
                      <input aria-label={`Cantidad a trasladar de ${bien.descripcion}`} className={`${claseControlGuia} max-w-22 tabular-nums`} type="number" min="0.001" max={Number(bien.cantidad)} step="0.001" required value={cantidad} onChange={(evento) => alCambiarCantidad(bien.id, evento.target.value)} />
                      <Button size="icon" variant="ghost" aria-label={`Quitar ${bien.descripcion}`} onClick={() => alCambiarCantidad(bien.id, null)}><X size={16} aria-hidden="true" /></Button>
                    </div>
                  : <Button size="sm" variant="outline" className="justify-self-start" aria-label={`Agregar ${bien.descripcion}`} onClick={() => alCambiarCantidad(bien.id, bien.cantidad)}><Plus size={15} aria-hidden="true" />Agregar</Button>}
              </li>;
            })}
            {!visibles.length && <li className="px-3 py-3 text-sm text-muted-foreground">No hay bienes que coincidan con esa búsqueda.</li>}
          </ul>
        </div>
      </div>
      <fieldset className="m-0 grid min-w-0 gap-3 rounded-md border border-border bg-muted px-3 pb-3 @[28rem]:grid-cols-2 @[58rem]:grid-cols-1">
        <legend className="px-1 text-sm font-semibold">Carga del traslado</legend>
        <label className={claseCampoGuia}>Peso bruto total (kg)
          <input className={claseControlGuia} name="pesoBrutoTotal" type="number" min="0.001" step="0.001" required />
        </label>
        <label className={claseCampoGuia}>Número de bultos
          <input className={claseControlGuia} name="numeroBultos" type="number" min="1" step="1" defaultValue="1" required />
        </label>
      </fieldset>
    </div>
  </SeccionGuia>;
}
