import "./finanzas-page.css";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ErrorApi } from "../../services/api-cliente";
import { servicioFinanzas, type CuentaFinanciera, type DatosCuentaFinanciera, type TipoCuentaFinanciera } from "../../services/finanzas.service";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useNavigate } from "react-router-dom";

const tipos: Array<{ valor: TipoCuentaFinanciera; nombre: string }> = [
  { valor: "EFECTIVO", nombre: "Caja / efectivo" },
  { valor: "BANCO", nombre: "Cuenta bancaria" },
  { valor: "BILLETERA", nombre: "Billetera digital" },
  { valor: "TARJETA", nombre: "Tarjeta" },
];
const moneda = (valor: string | number, codigo: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(Number(valor) || 0);
const etiquetaTipo = (tipo: TipoCuentaFinanciera) => tipos.find((item) => item.valor === tipo)?.nombre ?? tipo;
const inicial = (): DatosCuentaFinanciera => ({ tipo: "EFECTIVO", nombre: "", entidad: "", titular: "", moneda: "PEN", numeroCuenta: "", cci: "", numeroTarjeta: "", telefono: "", observacion: "" });

export function FinanzasPage({ puedeAdministrar }: { puedeAdministrar: boolean }) {
  const navegar = useNavigate();
  const [items, setItems] = useState<CuentaFinanciera[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [formulario, setFormulario] = useState<DatosCuentaFinanciera>(inicial);
  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const manejarError = useCallback((e: unknown) => { if (e instanceof ErrorApi && e.estado === 401) { navegar("/login", { replace: true }); return; } setError(e instanceof Error ? e.message : "No se pudo completar la solicitud."); }, [navegar]);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const [resumen, catalogo] = await Promise.all([servicioFinanzas.resumen(), puedeAdministrar ? servicioFinanzas.listar() : Promise.resolve([])]); setItems(resumen.items.map((item) => ({ ...catalogo.find((cuenta) => cuenta.id === item.id), ...item }) as CuentaFinanciera)); setPeriodo(resumen.periodo); setError(""); }
    catch (e) { manejarError(e); }
    finally { setCargando(false); }
  }, [manejarError, puedeAdministrar]);
  useEffect(() => { void cargar(); }, [cargar]);

  function editar(cuenta: CuentaFinanciera) {
    setEditando(cuenta.id);
    setFormulario({ tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad ?? "", titular: cuenta.titular ?? "", moneda: cuenta.moneda, numeroCuenta: cuenta.numeroCuenta ?? "", cci: cuenta.cci ?? "", numeroTarjeta: cuenta.numeroTarjeta ?? "", telefono: cuenta.telefono ?? "", observacion: cuenta.observacion ?? "" });
    setAbierto(true);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault(); setGuardando(true); setError("");
    try {
      if (editando) await servicioFinanzas.actualizar(editando, formulario);
      else await servicioFinanzas.crear(formulario);
      setExito(editando ? "Cuenta actualizada." : "Cuenta agregada."); setAbierto(false); setEditando(null); setFormulario(inicial()); await cargar();
    } catch (e) { manejarError(e); }
    finally { setGuardando(false); }
  }

  async function alternarEstado(cuenta: CuentaFinanciera) {
    try { await servicioFinanzas.cambiarEstado(cuenta.id, !cuenta.activa); setExito(cuenta.activa ? "Cuenta desactivada. Su historial de movimientos se conserva." : "Cuenta activada."); await cargar(); }
    catch (e) { manejarError(e); }
  }

  return <section className="finanzas-page">
    <header className="finanzas-heading"><div><span className="finanzas-kicker">TESORERÍA</span><h1>Cuentas y medios de pago</h1><p>Registra dónde recibes y desde dónde pagas el dinero de la empresa.</p></div>{puedeAdministrar && <button className="finanzas-primary" type="button" onClick={() => { setEditando(null); setFormulario(inicial()); setAbierto(true); }}>＋ Agregar cuenta</button>}</header>
    {error && <NotificacionFlotante tipo="error" mensaje={error} duracionMs={0} onCerrar={() => setError("")} />}{exito && <NotificacionFlotante tipo="exito" mensaje={exito} duracionMs={4000} onCerrar={() => setExito("")} />}
    <section className="finanzas-summary"><div><span>Entradas registradas este mes</span><strong>{moneda(items.reduce((total, cuenta) => total + Number(cuenta.ingresosMes ?? 0), 0), "PEN")}</strong></div><div><span>Salidas registradas este mes</span><strong>{moneda(items.reduce((total, cuenta) => total + Number(cuenta.egresosMes ?? 0), 0), "PEN")}</strong></div><small>{periodo ? `Flujos vinculados a cuentas · ${periodo}` : "Resumen mensual"}</small></section>
    {cargando ? <div className="finanzas-empty">Cargando cuentas y movimientos…</div> : items.length ? <div className="finanzas-grid">{items.map((cuenta) => <article className={`finanzas-card${cuenta.activa ? "" : " is-inactive"}`} key={cuenta.id}>
      <header><span className="finanzas-type">{etiquetaTipo(cuenta.tipo)}</span><span className={`finanzas-status${cuenta.activa ? "" : " is-inactive"}`}>{cuenta.activa ? "Activa" : "Inactiva"}</span></header>
      <h2>{cuenta.nombre}</h2><p className="finanzas-institution">{[cuenta.entidad, cuenta.titular && `Titular: ${cuenta.titular}`].filter(Boolean).join(" · ") || "Caja de efectivo"}</p>
      <div className="finanzas-identifiers">{cuenta.numeroCuenta && <span>Cuenta · {cuenta.numeroCuenta}</span>}{cuenta.cci && <span>CCI · {cuenta.cci}</span>}{cuenta.telefono && <span>Celular · {cuenta.telefono}</span>}{cuenta.numeroTarjeta && <span>Tarjeta terminada en · {cuenta.numeroTarjeta}</span>}</div>
      <div className="finanzas-totals"><div><small>Entró</small><strong>{moneda(cuenta.ingresosMes ?? 0, cuenta.moneda)}</strong></div><div><small>Salió</small><strong>{moneda(cuenta.egresosMes ?? 0, cuenta.moneda)}</strong></div><div><small>Neto del mes</small><strong>{moneda(cuenta.netoMes ?? 0, cuenta.moneda)}</strong></div></div>
      {puedeAdministrar && <footer><button type="button" onClick={() => editar(cuenta)}>Editar</button><button type="button" onClick={() => void alternarEstado(cuenta)}>{cuenta.activa ? "Desactivar" : "Activar"}</button></footer>}
    </article>)}</div> : <div className="finanzas-empty"><strong>Aún no hay cuentas configuradas</strong><span>Agrega tu caja, bancos, billeteras digitales o tarjetas para asociarlas a cobros y pagos.</span>{puedeAdministrar && <button className="finanzas-primary" type="button" onClick={() => setAbierto(true)}>Configurar primera cuenta</button>}</div>}
    {items.some((cuenta) => Number(cuenta.ingresosMes) || Number(cuenta.egresosMes)) && <p className="finanzas-footnote">El resumen incluye pagos con cuenta asignada durante el mes. Los movimientos anteriores sin cuenta configurada no se pueden distribuir retroactivamente.</p>}
    {abierto && <div className="finanzas-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) setAbierto(false); }}><form className="finanzas-form" onSubmit={(evento) => void guardar(evento)}>
      <header><div><span className="finanzas-kicker">CONFIGURACIÓN DE TESORERÍA</span><h2>{editando ? "Editar cuenta" : "Agregar cuenta o medio"}</h2></div><button type="button" aria-label="Cerrar" onClick={() => setAbierto(false)}>×</button></header>
      <label>Tipo de cuenta<select value={formulario.tipo} onChange={(evento) => setFormulario((actual) => ({ ...actual, tipo: evento.target.value as TipoCuentaFinanciera }))}>{tipos.map((tipo) => <option value={tipo.valor} key={tipo.valor}>{tipo.nombre}</option>)}</select></label>
      <label>Nombre para identificarla<input required maxLength={100} value={formulario.nombre} onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} placeholder={formulario.tipo === "EFECTIVO" ? "Ej. Caja principal" : formulario.tipo === "BANCO" ? "Ej. Cuenta corriente del negocio" : formulario.tipo === "BILLETERA" ? "Ej. Yape del negocio" : "Ej. Visa para compras"} /></label>
      {formulario.tipo !== "EFECTIVO" && <label>{formulario.tipo === "BILLETERA" ? "Billetera digital" : formulario.tipo === "TARJETA" ? "Banco emisor" : "Banco"}<input required maxLength={100} value={formulario.entidad ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, entidad: evento.target.value }))} placeholder={formulario.tipo === "BILLETERA" ? "Yape, Plin u otro" : "Nombre de la entidad"} /></label>}
      <label>Titular<input maxLength={160} value={formulario.titular ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, titular: evento.target.value }))} /></label>
      {formulario.tipo === "BANCO" && <><label>Número de cuenta<input maxLength={100} value={formulario.numeroCuenta ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, numeroCuenta: evento.target.value }))} /></label><label>CCI<input maxLength={100} value={formulario.cci ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, cci: evento.target.value }))} /></label></>}
      {formulario.tipo === "BILLETERA" && <label>Número de celular o cuenta<input required maxLength={30} value={formulario.telefono ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, telefono: evento.target.value }))} /></label>}
      {formulario.tipo === "TARJETA" && <label>Últimos cuatro dígitos<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={formulario.numeroTarjeta ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, numeroTarjeta: evento.target.value.replace(/\D/g, "").slice(0, 4) }))} /></label>}
      <label>Moneda<select value={formulario.moneda} onChange={(evento) => setFormulario((actual) => ({ ...actual, moneda: evento.target.value as DatosCuentaFinanciera["moneda"] }))}><option value="PEN">Soles (PEN)</option></select><small>Los flujos actuales se registran en soles. Se habilitarán otras monedas cuando el sistema gestione tipo de cambio.</small></label>
      <label>Observación<textarea maxLength={1000} value={formulario.observacion ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, observacion: evento.target.value }))} /></label>
      <footer><button type="button" onClick={() => setAbierto(false)}>Cancelar</button><button className="finanzas-primary" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar cuenta"}</button></footer>
    </form></div>}
  </section>;
}
