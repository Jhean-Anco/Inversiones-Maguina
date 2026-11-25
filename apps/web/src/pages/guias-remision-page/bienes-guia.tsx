import { Package, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import type { DetalleDocumentoGuia } from "../../services/ingresos.service";
import { claseCampoGuia, claseControlGuia, SeccionGuia } from "./campos-guia";

const formatoCantidad = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 });

type Props = {
  bienes: DetalleDocumentoGuia[];
  cantidades: Record<string, string>;
  alCambiarCantidad: (id: string, cantidad: string | null) => void;
};

export function BienesGuia({ bienes, cantidades, alCambiarCantidad }: Props) {
  const seleccionados = bienes.filter((bien) => cantidades[bien.id] !== undefined);

  return <SeccionGuia titulo="Bienes seleccionados para el traslado" icono={<Package />}>
    <div className="grid min-w-0 gap-3">
      {seleccionados.length ? <ul className="m-0 list-none divide-y divide-border overflow-hidden rounded-md border border-border p-0">
        {seleccionados.map((bien) => <li className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)]" key={bien.id}>
          <span className="grid min-w-0 gap-0.5"><strong className="text-sm [overflow-wrap:anywhere]">{bien.descripcion}</strong><span className="text-xs text-muted-foreground">{bien.tipo === "MOTOTAXI" ? "Mototaxi" : "Repuesto"}{bien.codigo && ` · ${bien.codigo}`} · {formatoCantidad.format(Number(bien.cantidad))} {bien.unidad ?? "NIU"} en factura</span></span>
          <div className="flex items-center gap-1.5">
            <label className="sr-only" htmlFor={`cantidad-guia-${bien.id}`}>Cantidad a trasladar de {bien.descripcion}</label>
            <input id={`cantidad-guia-${bien.id}`} className={`${claseControlGuia} max-w-28 tabular-nums`} type="number" min="0.001" max={Number(bien.cantidad)} step="0.001" required value={cantidades[bien.id]} onChange={(evento) => alCambiarCantidad(bien.id, evento.target.value)} />
            <Button size="icon" variant="ghost" aria-label={`Quitar ${bien.descripcion}`} onClick={() => alCambiarCantidad(bien.id, null)}><X size={16} aria-hidden="true" /></Button>
          </div>
        </li>)}
      </ul> : <p className="m-0 rounded-md border border-dashed border-input bg-muted px-3 py-6 text-center text-sm text-muted-foreground">Busca repuestos o mototaxis en el catálogo y agrégalos al traslado.</p>}
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
