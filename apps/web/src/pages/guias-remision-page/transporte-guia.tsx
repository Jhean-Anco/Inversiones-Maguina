import { Truck } from "lucide-react";
import { useState } from "react";
import { claseCampoGuia, claseControlGuia, SeccionGuia } from "./campos-guia";
import { ConductorGuia, TransportistaGuia } from "./participante-guia";

const motivosTraslado = [
  ["01", "Venta"], ["14", "Venta sujeta a confirmación"], ["02", "Compra"],
  ["04", "Traslado entre establecimientos"], ["03", "Venta con entrega a terceros"],
  ["06", "Devolución"], ["13", "Otros"],
] as const;

export function DatosTrasladoGuia({ hoy }: { hoy: string }) {
  const [motivo, setMotivo] = useState("01");
  return <div className="grid min-w-0 items-start gap-3 border-t border-dashed border-input pt-3 @[38rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] @[58rem]:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.75fr)]">
        <label className={claseCampoGuia}>Motivo del traslado
          <select className={claseControlGuia} name="motivoTraslado" value={motivo} onChange={(evento) => setMotivo(evento.target.value)}>
            {motivosTraslado.map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
          </select>
        </label>
        <label className={claseCampoGuia}>Fecha de inicio del traslado
          <input className={claseControlGuia} name="fechaInicio" type="date" min={hoy} defaultValue={hoy} required />
        </label>
        {motivo === "13" && <label className={`${claseCampoGuia} @[38rem]:col-span-full @[58rem]:col-span-1`}>Descripción del motivo
          <input className={claseControlGuia} name="motivoTrasladoOtros" maxLength={70} required />
        </label>}
  </div>;
}

export function TransporteGuia({ hoy }: { hoy: string }) {
  const [modalidad, setModalidad] = useState<"01" | "02">("01");
  return <SeccionGuia titulo="Transporte" icono={<Truck />}>
      <div className="grid min-w-0 gap-4 rounded-md border border-border bg-muted p-3.5 @[48rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="grid min-w-0 content-start gap-3">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-1.5 px-0 text-[13px] font-semibold">Tipo de transporte</legend>
            <div className="grid grid-cols-2 rounded-md border border-input bg-surface p-1">
              {([["01", "Público"], ["02", "Privado"]] as const).map(([valor, nombre]) => <label className="min-w-0 cursor-pointer" key={valor}>
                <input className="peer sr-only" type="radio" name="tipoTransporte" value={valor} checked={modalidad === valor} onChange={() => setModalidad(valor)} />
                <span className="grid min-h-9 place-items-center rounded-sm px-1.5 text-sm font-semibold text-muted-foreground peer-checked:bg-primary peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring">{nombre}</span>
              </label>)}
            </div>
          </fieldset>
          <label className={claseCampoGuia}>Placa del vehículo
            <input className={`${claseControlGuia} uppercase`} name="placa" maxLength={8} required />
          </label>
          {modalidad === "01" && <label className={claseCampoGuia}>Fecha de entrega al transportista
            <input className={claseControlGuia} name="fechaEntregaTransportista" type="date" min={hoy} defaultValue={hoy} required />
          </label>}
        </div>
        {modalidad === "01" ? <TransportistaGuia /> : <ConductorGuia />}
      </div>
  </SeccionGuia>;
}
