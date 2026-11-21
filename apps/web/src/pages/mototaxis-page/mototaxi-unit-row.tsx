import type { GarantiaMototaxi, UnidadMototaxi } from "../../services/mototaxis.service";
import { Etiqueta } from "../../components/ui/etiqueta";

type MototaxiUnitRowProps = {
  unidad: UnidadMototaxi;
  garantia: GarantiaMototaxi | undefined;
  fechaGarantia: string | null;
  costo: string;
  estado: string;
  puedeCambiarEstado: boolean;
  onVerGarantia: () => void;
  onCambiarEstado: () => void;
};

export function MototaxiUnitRow({ unidad, garantia, fechaGarantia, costo, estado, puedeCambiarEstado, onVerGarantia, onCambiarEstado }: MototaxiUnitRowProps) {
  return (
    <tr>
      <td className="moto-unit-table-name"><strong>{unidad.marca} {unidad.modelo} {unidad.version}</strong><small>{unidad.codigo}{unidad.anioModelo ? ` · ${unidad.anioModelo}` : ""}{unidad.color ? ` · ${unidad.color}` : ""}</small></td>
      <td><strong>VIN {unidad.vin}</strong><small>Motor {unidad.numeroMotor}{unidad.numeroChasis ? ` · Chasis ${unidad.numeroChasis}` : ""}</small></td>
      <td className="moto-unit-table-cost"><strong>{costo}</strong><small>Costo de adquisición</small></td>
      <td className="moto-unit-table-warranty">{garantia ? <><strong>Hasta {fechaGarantia}</strong><small>{garantia.porcentajeProveedor}% · {garantia.mesesVigencia} meses</small><button type="button" onClick={onVerGarantia}>Ver garantía</button></> : <small>Sin garantía registrada</small>}</td>
      <td><Etiqueta compacta tono={unidad.estado === "DISPONIBLE" ? "positiva" : ["BAJA", "FALTANTE"].includes(unidad.estado) ? "peligro" : ["GARANTIA", "RESERVADA"].includes(unidad.estado) ? "advertencia" : "informativa"}>{estado}</Etiqueta></td>
      <td>{puedeCambiarEstado && <button className="moto-quiet-button" type="button" onClick={onCambiarEstado}>Cambiar estado</button>}</td>
    </tr>
  );
}
