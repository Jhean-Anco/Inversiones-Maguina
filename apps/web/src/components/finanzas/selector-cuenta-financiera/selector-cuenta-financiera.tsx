import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { servicioFinanzas, type CuentaFinanciera } from "../../../services/finanzas.service";

const medioPorTipo: Record<CuentaFinanciera["tipo"], string> = { EFECTIVO: "EFECTIVO", BANCO: "TRANSFERENCIA", BILLETERA: "BILLETERA_DIGITAL", TARJETA: "TARJETA" };

export function SelectorCuentaFinanciera({ value, medioActual, onChange, required = true }: { value: string; medioActual: string; onChange: (cuentaId: string, medioPago: string) => void; required?: boolean }) {
  const [cuentas, setCuentas] = useState<CuentaFinanciera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    servicioFinanzas.opciones().then((resumen) => { if (vigente) setCuentas(resumen.filter((cuenta) => cuenta.activa && cuenta.moneda === "PEN") as CuentaFinanciera[]); })
      .catch(() => { if (vigente) setError("No se pudieron cargar las cuentas configuradas."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);
  const compatibles = cuentas.filter((cuenta) => medioPorTipo[cuenta.tipo] === medioActual);
  useEffect(() => {
    if (!value && compatibles.length === 1) onChange(compatibles[0].id, medioPorTipo[compatibles[0].tipo]);
  }, [compatibles, onChange, value]);
  const mostrar = error || !cargando && cuentas.length === 0;
  return <label className="selector-cuenta-financiera">Cuenta / medio de pago
    {cargando ? <span className="selector-cuenta-hint">Cargando tus cuentas…</span> : error ? <span className="selector-cuenta-error">{error}</span> : cuentas.length === 0 ? <span className="selector-cuenta-error">Configura primero la caja, cuenta bancaria o billetera. <Link to="/finanzas/cuentas">Abrir Cuentas y medios</Link></span> : <select required={required} value={value} onChange={(evento) => { const cuenta = cuentas.find((item) => item.id === evento.target.value); onChange(cuenta?.id ?? "", cuenta ? medioPorTipo[cuenta.tipo] : ""); }}>
      <option value="">Selecciona la cuenta</option>
      {cuentas.map((cuenta) => <option value={cuenta.id} key={cuenta.id}>{cuenta.nombre}{cuenta.entidad ? ` · ${cuenta.entidad}` : ""}{cuenta.numeroTarjeta ? ` ·••${cuenta.numeroTarjeta}` : ""}</option>)}
    </select>}
    {!mostrar && !cargando && compatibles.length === 0 && <span className="selector-cuenta-hint">Al elegir la cuenta se definirá el medio correspondiente: efectivo, transferencia, billetera o tarjeta.</span>}
  </label>;
}
