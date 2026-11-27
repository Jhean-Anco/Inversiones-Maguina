import { useEffect, useState } from "react";
import { ChevronDown, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { servicioFinanzas, type CuentaFinanciera } from "../../services/finanzas.service";
import { medioPorTipo } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import { soles } from "./nuevo-ingreso-formatters";

type Cuenta = Pick<CuentaFinanciera, "id" | "tipo" | "nombre" | "entidad" | "numeroTarjeta">;

/** Una cuenta del cobro. `monto` es lo que se aplica a la venta; `recibido` solo existe en efectivo (para el vuelto). */
export type ParteCobro = { clave: number; cuentaId: string; medioPago: string; monto: string; recibido: string };

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
let siguienteClave = 1;
export const parteCobroVacia = (): ParteCobro => ({ clave: siguienteClave++, cuentaId: "", medioPago: "", monto: "", recibido: "" });

/** Importe de cada parte: la última se ajusta sola al resto del total para que la suma cuadre siempre. */
export function importesCobro(partes: ParteCobro[], total: number) {
  const previas = partes.slice(0, -1).map((parte) => Math.max(0, Number(parte.monto) || 0));
  const resto = redondear(total - previas.reduce((suma, monto) => suma + monto, 0));
  return [...previas, resto];
}

/** Error que impide emitir con este cobro, o cadena vacía si está completo. */
export function validarCobro(partes: ParteCobro[], total: number) {
  const importes = importesCobro(partes, total);
  if (partes.some((parte) => !parte.cuentaId)) return "Selecciona la cuenta de cada parte del cobro.";
  if (new Set(partes.map((parte) => parte.cuentaId)).size !== partes.length) return "No repitas la misma cuenta en el cobro.";
  if (importes.some((monto) => monto <= 0)) return "Cada cuenta del cobro debe recibir un importe mayor a cero y la suma no puede superar el total.";
  const faltaRecibir = partes.some((parte, indice) => parte.medioPago === "EFECTIVO" && parte.recibido.trim() !== "" && Number(parte.recibido) < importes[indice]);
  if (faltaRecibir) return "El efectivo recibido no puede ser menor que el importe a cobrar en efectivo.";
  return "";
}

export function vueltoCobro(partes: ParteCobro[], total: number) {
  const importes = importesCobro(partes, total);
  return redondear(partes.reduce((suma, parte, indice) => suma + (parte.medioPago === "EFECTIVO" && parte.recibido.trim() !== "" ? Math.max(0, Number(parte.recibido) - importes[indice]) : 0), 0));
}

type Props = { partes: ParteCobro[]; total: number; onChange: (partes: ParteCobro[]) => void };

/** Cobro de la venta repartido en varias cuentas, cada una una sola vez, con cálculo del vuelto en efectivo. */
export function CobroVenta({ partes, total, onChange }: Props) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    servicioFinanzas.opciones().then((lista) => { if (vigente) setCuentas(lista.filter((cuenta) => cuenta.activa && cuenta.moneda === "PEN")); })
      .catch(() => { if (vigente) setError("No se pudieron cargar las cuentas configuradas."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);
  // Con una sola cuenta disponible, se elige sola.
  useEffect(() => {
    if (cuentas.length === 1 && partes.length === 1 && !partes[0].cuentaId) onChange([{ ...partes[0], cuentaId: cuentas[0].id, medioPago: medioPorTipo[cuentas[0].tipo] }]);
  }, [cuentas, partes, onChange]);

  const importes = importesCobro(partes, total);
  const vuelto = vueltoCobro(partes, total);
  const actualizar = (clave: number, cambios: Partial<ParteCobro>) => onChange(partes.map((parte) => parte.clave === clave ? { ...parte, ...cambios } : parte));
  const usadas = new Set(partes.map((parte) => parte.cuentaId).filter(Boolean));
  const puedeAgregar = partes.length < Math.min(cuentas.length, 8);

  if (cargando) return <p className="venta-cobro-ayuda">Cargando tus cuentas…</p>;
  if (error) return <p className="venta-cobro-ayuda es-error">{error}</p>;
  if (!cuentas.length) return <p className="venta-cobro-ayuda">Configura primero una caja o cuenta en <Link to="/finanzas/cuentas">Cuentas y medios</Link>.</p>;

  return <div className="venta-cobro" role="group" aria-label="Cobro de la venta">
    <span className="os-etiqueta">Cobro *</span>
    {partes.map((parte, indice) => {
      const esUltima = indice === partes.length - 1;
      const disponibles = cuentas.filter((cuenta) => cuenta.id === parte.cuentaId || !usadas.has(cuenta.id));
      return <div className="venta-cobro-parte" key={parte.clave}>
        <div className="venta-cobro-fila">
          <span className="os-select">
            <select aria-label={`Cuenta ${indice + 1} del cobro`} value={parte.cuentaId} required onChange={(evento) => { const cuenta = cuentas.find((item) => item.id === evento.target.value); actualizar(parte.clave, { cuentaId: cuenta?.id ?? "", medioPago: cuenta ? medioPorTipo[cuenta.tipo] : "", recibido: "" }); }}>
              <option value="">Selecciona una cuenta</option>
              {disponibles.map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}{cuenta.entidad ? ` · ${cuenta.entidad}` : ""}{cuenta.numeroTarjeta ? ` ·••${cuenta.numeroTarjeta}` : ""}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={16} />
          </span>
          {partes.length > 1 && <button className="venta-cobro-quitar" type="button" aria-label={`Quitar cuenta ${indice + 1} del cobro`} onClick={() => onChange(partes.filter((item) => item.clave !== parte.clave))}><X aria-hidden="true" size={16} /></button>}
        </div>
        {partes.length > 1 && <label className="venta-cobro-importe">{esUltima ? "Resto" : "Importe"}
          {esUltima ? <strong className={importes[indice] <= 0 ? "es-error" : undefined}>{soles(importes[indice])}</strong>
            : <span className="os-monto"><span aria-hidden="true">S/</span><input type="number" min="0.01" step="0.01" max={total} value={parte.monto} onChange={(evento) => actualizar(parte.clave, { monto: evento.target.value })} aria-label={`Importe de la cuenta ${indice + 1}`} required /></span>}
        </label>}
        {parte.medioPago === "EFECTIVO" && <label className="venta-cobro-importe">Efectivo recibido
          <span className="os-monto"><span aria-hidden="true">S/</span><input type="number" min={importes[indice] > 0 ? importes[indice] : 0} step="0.01" value={parte.recibido} placeholder={importes[indice] > 0 ? importes[indice].toFixed(2) : "0.00"} onChange={(evento) => actualizar(parte.clave, { recibido: evento.target.value })} aria-label={`Efectivo recibido en la cuenta ${indice + 1}`} /></span>
        </label>}
      </div>;
    })}
    {puedeAgregar && <button className="venta-cobro-agregar" type="button" onClick={() => onChange([...partes.map((parte, indice) => indice === partes.length - 1 && !parte.monto ? { ...parte, monto: importes[indice] > 0 ? importes[indice].toFixed(2) : "" } : parte), parteCobroVacia()])}><Plus aria-hidden="true" size={15} strokeWidth={2.4} />Agregar cuenta</button>}
    {vuelto > 0 && <div className="os-saldo venta-cobro-vuelto"><span>Vuelto</span><strong>{soles(vuelto)}</strong></div>}
  </div>;
}
