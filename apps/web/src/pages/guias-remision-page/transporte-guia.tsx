import { useState } from "react";
import { claseCampoGuia, SeccionGuia, SelectGuia } from "./campos-guia";
import { ConductorGuia, TransportistaGuia } from "./participante-guia";

const motivosTraslado = [
  ["01", "Venta"], ["14", "Venta sujeta a confirmación"], ["02", "Compra"],
  ["04", "Traslado entre establecimientos"], ["03", "Venta con entrega a terceros"],
  ["06", "Devolución"], ["13", "Otros"],
] as const;

/** Fila de datos principales: motivo · fecha de inicio · peso bruto · bultos. */
export function DatosTrasladoGuia({ hoy }: { hoy: string }) {
  const [motivo, setMotivo] = useState("01");
  return <SeccionGuia paso={2} id="guia-titulo-traslado" titulo="Datos del traslado">
    <div className="os-campos guia-campos">
      <label className={claseCampoGuia}>Motivo del traslado *
        <SelectGuia name="motivoTraslado" value={motivo} onChange={(evento) => setMotivo(evento.target.value)}>
          {motivosTraslado.map(([valor, nombre]) => <option key={valor} value={valor}>{nombre}</option>)}
        </SelectGuia>
      </label>
      <label className={claseCampoGuia}>Fecha de inicio *
        <input name="fechaInicio" type="date" min={hoy} defaultValue={hoy} required />
      </label>
      <label className={claseCampoGuia}>Peso bruto total (kg) *
        <input name="pesoBrutoTotal" type="number" min="0.001" step="0.001" placeholder="Ej. 12.5" required />
      </label>
      <label className={claseCampoGuia}>Número de bultos *
        <input name="numeroBultos" type="number" min="1" step="1" defaultValue="1" required />
      </label>
      {motivo === "13" && <label className={`${claseCampoGuia} guia-campo-ancho`}>Descripción del motivo *
        <input name="motivoTrasladoOtros" maxLength={70} placeholder="Ej. Traslado a feria comercial" required />
      </label>}
    </div>
  </SeccionGuia>;
}

export function TransporteGuia({ hoy }: { hoy: string }) {
  const [modalidad, setModalidad] = useState<"01" | "02">("01");
  return <SeccionGuia paso={5} id="guia-titulo-transporte" titulo="Transporte">
    <div className="guia-bloque">
      <div className="guia-modalidad" role="radiogroup" aria-label="Tipo de transporte">
        {([["01", "Público"], ["02", "Privado"]] as const).map(([valor, nombre]) => <label key={valor}>
          <input className="sr-only" type="radio" name="tipoTransporte" value={valor} checked={modalidad === valor} onChange={() => setModalidad(valor)} />
          <span>{nombre}</span>
        </label>)}
      </div>
      <div className="os-campos guia-campos-dos">
        <label className={claseCampoGuia}>Placa del vehículo *
          <input className="os-placa" name="placa" maxLength={8} placeholder="Ej. ABC-123" required />
        </label>
        {modalidad === "01" && <label className={claseCampoGuia}>Entrega al transportista *
          <input name="fechaEntregaTransportista" type="date" min={hoy} defaultValue={hoy} required />
        </label>}
      </div>
      {modalidad === "01" ? <TransportistaGuia /> : <ConductorGuia />}
    </div>
  </SeccionGuia>;
}
