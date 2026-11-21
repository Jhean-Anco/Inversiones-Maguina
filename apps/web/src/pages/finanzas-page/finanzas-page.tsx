import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { Button } from "../../components/ui/button";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ErrorApi } from "../../services/api-cliente";
import { servicioFinanzas, type CuentaFinanciera, type DatosCuentaFinanciera, type MovimientosCuentas, type PeriodoMovimientosCuenta, type TipoCuentaFinanciera } from "../../services/finanzas.service";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { AccionIcono } from "../../components/ui/accion-icono";
import { Etiqueta } from "../../components/ui/etiqueta";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useNavigate } from "react-router-dom";

const tipos: Array<{ valor: TipoCuentaFinanciera; nombre: string }> = [
  { valor: "EFECTIVO", nombre: "Caja / efectivo" },
  { valor: "BANCO", nombre: "Cuenta bancaria" },
  { valor: "BILLETERA", nombre: "Billetera digital" },
  { valor: "TARJETA", nombre: "Tarjeta" },
];
const moneda = (valor: string | number, codigo: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(Number(valor) || 0);
const fechaLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
const etiquetaTipo = (tipo: TipoCuentaFinanciera) => tipos.find((item) => item.valor === tipo)?.nombre ?? tipo;
const inicial = (): DatosCuentaFinanciera => ({ tipo: "EFECTIVO", nombre: "", entidad: "", titular: "", moneda: "PEN", numeroCuenta: "", cci: "", numeroTarjeta: "", telefono: "", observacion: "" });

const estilo = {
  page: "grid gap-[18px] py-2 pb-7 text-[var(--erp-ink,#14345a)]",
  flowPanel: "grid gap-4 rounded-2xl border border-[#dce5ee] bg-[linear-gradient(155deg,#fff,#fbfdff)] p-[22px] shadow-[0_8px_24px_#173b5b08] [html[data-responsive-profile='mobile-portrait']_&]:p-[13px] [html[data-responsive-profile='mobile-landscape']_&]:p-4",
  flowHeading: "flex items-start justify-between gap-5 [html[data-responsive-profile='mobile-portrait']_&]:flex-col [html[data-responsive-profile='mobile-landscape']_&]:flex-col",
  flowTitle: "my-1 mb-[5px] text-[22px] text-[#173b59]",
  flowDescription: "m-0 text-[13px] text-[#70849a]",
  flowFilters: "flex items-center gap-[9px] [html[data-responsive-profile='mobile-portrait']_&]:w-full [html[data-responsive-profile='mobile-portrait']_&]:flex-wrap [html[data-responsive-profile='mobile-landscape']_&]:w-full [html[data-responsive-profile='mobile-landscape']_&]:flex-wrap",
  period: "inline-flex gap-[3px] rounded-[10px] border border-[#dce5ed] bg-[#f3f7fa] p-1 [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:flex-1",
  periodButton: "min-h-[34px] cursor-pointer rounded-[7px] border border-transparent bg-transparent px-[13px] text-xs font-[750] text-[#60788e] [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-portrait']_&]:px-2 [html[data-responsive-profile='mobile-landscape']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:px-2",
  activePeriod: "border-[#dce5ed] bg-white text-[#164e79] shadow-[0_2px_7px_#173b5b12]",
  dateInput: "h-[42px] w-[150px] min-w-0 rounded-lg border border-[#d3e0eb] bg-white px-[10px] font-semibold text-[#183754] [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:flex-1",
  yearInput: "w-[100px]",
  flowTotals: "grid grid-cols-3 gap-[10px] [html[data-responsive-profile='mobile-portrait']_&]:gap-[6px]",
  flowTotal: "grid gap-[6px] rounded-[11px] border border-[#e0e9ef] bg-[#f8fafc] px-[15px] py-[13px] [html[data-responsive-profile='mobile-portrait']_&]:px-2 [html[data-responsive-profile='mobile-portrait']_&]:py-[10px]",
  flowTotalLabel: "text-xs text-[#71859a] [html[data-responsive-profile='mobile-portrait']_&]:text-[10px]",
  flowTotalValue: "text-xl text-[#173b59] [html[data-responsive-profile='mobile-landscape']_&]:text-base [html[data-responsive-profile='mobile-portrait']_&]:text-sm",
  chart: "h-[300px] w-full min-w-0 [html[data-responsive-profile='mobile-landscape']_&]:h-[250px] [html[data-responsive-profile='mobile-portrait']_&]:h-[220px]",
  flowList: "grid border-t border-[#e5ebf1]",
  flowRow: "text-center grid grid-cols-[minmax(170px,1.6fr)_repeat(3,minmax(120px,1fr))] items-center gap-3 border-b border-[#edf1f4] px-1 py-3 [html[data-responsive-profile='mobile-landscape']_&]:grid-cols-3 [html[data-responsive-profile='mobile-landscape']_&]:gap-2 [html[data-responsive-profile='mobile-portrait']_&]:grid-cols-3 [html[data-responsive-profile='mobile-portrait']_&]:gap-2",
  flowAccount: "grid justify-items-center gap-1 [html[data-responsive-profile='mobile-landscape']_&]:col-span-full [html[data-responsive-profile='mobile-landscape']_&]:pb-1.5 [html[data-responsive-profile='mobile-portrait']_&]:col-span-full [html[data-responsive-profile='mobile-portrait']_&]:pb-1.5",
  flowCell: "grid content-start gap-1",
  flowCellLabel: "text-xs text-[#71859a] [html[data-responsive-profile='mobile-portrait']_&]:text-[10px]",
  flowCellValue: "text-[13px] text-[#173b59]",
  flowNote: "m-0 text-[11px] text-[#778b9d]",
  chartMessage: "grid min-h-[170px] place-items-center text-center text-[#74889a]",
  formFields: "grid gap-[13px]",
  field: "grid gap-[6px] text-[13px] font-bold text-[#38546e] [&_input]:min-h-[42px] [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#d3e0eb] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-[#183754] [&_select]:min-h-[42px] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#d3e0eb] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-[9px] [&_select]:text-[#183754] [&_textarea]:min-h-[75px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#d3e0eb] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-[9px] [&_textarea]:text-[#183754] [&_small]:font-normal [&_small]:text-xs [&_input:focus-visible]:outline-3 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-[#3784bd55] [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-[#3784bd55] [&_textarea:focus-visible]:outline-3 [&_textarea:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-[#3784bd55]",
};

export function FinanzasPage({ puedeAdministrar, vista }: { puedeAdministrar: boolean; vista: "cuentas" | "movimientos" }) {
  const alertas = useAlertas();
  const navegar = useNavigate();
  const [items, setItems] = useState<CuentaFinanciera[]>([]);
  const [periodoFlujo, setPeriodoFlujo] = useState<PeriodoMovimientosCuenta>("MES");
  const [fechaFlujo, setFechaFlujo] = useState(fechaLocal);
  const [movimientos, setMovimientos] = useState<MovimientosCuentas | null>(null);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(true);
  const [errorMovimientos, setErrorMovimientos] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("");
  const [formulario, setFormulario] = useState<DatosCuentaFinanciera>(inicial);
  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const manejarError = useCallback((e: unknown) => { if (e instanceof ErrorApi && e.estado === 401) { navegar("/login", { replace: true }); return; } alertas.error(e instanceof Error ? e.message : "No se pudo completar la solicitud."); }, [alertas, navegar]);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const [resumen, catalogo] = await Promise.all([servicioFinanzas.resumen(), puedeAdministrar ? servicioFinanzas.listar() : Promise.resolve([])]); setItems(resumen.items.map((item) => ({ ...catalogo.find((cuenta) => cuenta.id === item.id), ...item }) as CuentaFinanciera)); setErrorCarga(""); }
    catch (e) { setErrorCarga("No se pudieron cargar las cuentas financieras."); manejarError(e); }
    finally { setCargando(false); }
  }, [manejarError, puedeAdministrar]);
  useEffect(() => { if (vista === "cuentas") void cargar(); }, [cargar, vista]);

  useEffect(() => {
    if (vista !== "movimientos") return;
    let vigente = true;
    const fecha = periodoFlujo === "MES" ? fechaFlujo.slice(0, 7) : periodoFlujo === "ANIO" ? fechaFlujo.slice(0, 4) : fechaFlujo;
    setCargandoMovimientos(true);
    setErrorMovimientos("");
    void servicioFinanzas.movimientos(periodoFlujo, fecha)
      .then((resultado) => { if (vigente) setMovimientos(resultado); })
      .catch((e: unknown) => { if (vigente) setErrorMovimientos(e instanceof Error ? e.message : "No se pudieron cargar los movimientos de las cuentas."); })
      .finally(() => { if (vigente) setCargandoMovimientos(false); });
    return () => { vigente = false; };
  }, [periodoFlujo, fechaFlujo, vista]);

  function editar(cuenta: CuentaFinanciera) {
    setEditando(cuenta.id);
    setFormulario({ tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad ?? "", titular: cuenta.titular ?? "", moneda: cuenta.moneda, numeroCuenta: cuenta.numeroCuenta ?? "", cci: cuenta.cci ?? "", numeroTarjeta: cuenta.numeroTarjeta ?? "", telefono: cuenta.telefono ?? "", observacion: cuenta.observacion ?? "" });
    setAbierto(true);
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      if (editando) await servicioFinanzas.actualizar(editando, formulario);
      else await servicioFinanzas.crear(formulario);
      alertas.exito(editando ? "Cuenta actualizada." : "Cuenta agregada."); setAbierto(false); setEditando(null); setFormulario(inicial()); await cargar();
    } catch (e) { manejarError(e); }
    finally { setGuardando(false); }
  }

  async function alternarEstado(cuenta: CuentaFinanciera) {
    try { await servicioFinanzas.cambiarEstado(cuenta.id, !cuenta.activa); alertas.exito(cuenta.activa ? "Cuenta desactivada. Su historial de movimientos se conserva." : "Cuenta activada."); await cargar(); }
    catch (e) { manejarError(e); }
  }

  const cuentasVisibles = items.filter((cuenta) =>
    (!estado || (estado === "ACTIVA") === cuenta.activa) &&
    [cuenta.nombre, cuenta.entidad, etiquetaTipo(cuenta.tipo)].filter(Boolean).join(" ").toLocaleLowerCase("es-PE").includes(busqueda.trim().toLocaleLowerCase("es-PE")),
  );

  return <section className={`${estilo.page} finanzas-page`}>
    {vista === "movimientos" && <section className={estilo.flowPanel}>
      <header className={estilo.flowHeading}><div><h2 className={estilo.flowTitle}>Flujo por cuenta</h2><p className={estilo.flowDescription}>Entradas y salidas registradas en las cuentas seleccionadas.</p></div><div className={estilo.flowFilters} role="group" aria-label="Periodo de movimientos"><div className={estilo.period}>{([ ["DIA", "Día"], ["MES", "Mes"], ["ANIO", "Año"] ] as const).map(([valor, nombre]) => <button type="button" key={valor} className={`${estilo.periodButton} ${periodoFlujo === valor ? estilo.activePeriod : ""}`} aria-pressed={periodoFlujo === valor} onClick={() => setPeriodoFlujo(valor)}>{nombre}</button>)}</div><input className={`${estilo.dateInput} ${periodoFlujo === "ANIO" ? estilo.yearInput : ""}`} aria-label={periodoFlujo === "DIA" ? "Seleccionar día" : periodoFlujo === "MES" ? "Seleccionar mes" : "Seleccionar año"} type={periodoFlujo === "DIA" ? "date" : periodoFlujo === "MES" ? "month" : "number"} min={periodoFlujo === "ANIO" ? "1900" : undefined} max={periodoFlujo === "ANIO" ? String(new Date().getFullYear()) : undefined} value={periodoFlujo === "DIA" ? fechaFlujo : periodoFlujo === "MES" ? fechaFlujo.slice(0, 7) : fechaFlujo.slice(0, 4)} onChange={(evento) => { const valor = evento.target.value; if (!valor) return; setFechaFlujo(periodoFlujo === "DIA" ? valor : periodoFlujo === "MES" ? `${valor}-01` : `${valor}-01-01`); }} /></div></header>
      {errorMovimientos ? <NotificacionFlotante mensaje={errorMovimientos} /> : cargandoMovimientos || !movimientos ? <div className={estilo.chartMessage} role="status">Cargando movimientos de cuentas…</div> : <>
        <div className={estilo.flowTotals}><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Entradas</span><strong className={estilo.flowTotalValue}>{moneda(movimientos.totales.ingresos, "PEN")}</strong></div><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Salidas</span><strong className={estilo.flowTotalValue}>{moneda(movimientos.totales.egresos, "PEN")}</strong></div><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Neto del periodo</span><strong className={estilo.flowTotalValue}>{moneda(movimientos.totales.neto, "PEN")}</strong></div></div>
        {movimientos.items.length ? <><div className={estilo.chart}><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={movimientos.items} margin={{ top: 10, right: 14, left: 8, bottom: 4 }} barCategoryGap="30%"><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="nombre" tickLine={false} axisLine={false} tick={{ fill: "#60788e", fontSize: 11 }} interval={0} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={62} /><Tooltip formatter={(valor, nombre) => [moneda(Number(valor), "PEN"), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 11 }} /><Legend align="left" verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} /><Bar isAnimationActive={false} dataKey="ingresos" name="Entradas" fill="var(--erp-brand)" radius={[5, 5, 0, 0]} barSize={24} /><Bar isAnimationActive={false} dataKey="egresos" name="Salidas" fill="var(--erp-accent)" radius={[5, 5, 0, 0]} barSize={24} /></BarChart></ResponsiveContainer></div><div className={estilo.flowList}>{movimientos.items.map((cuenta) => <article className={estilo.flowRow} key={cuenta.id}><div className={estilo.flowAccount}><strong className={estilo.flowCellValue}>{cuenta.nombre}</strong><small className={estilo.flowCellLabel}>{etiquetaTipo(cuenta.tipo)}</small><Etiqueta compacta tono={cuenta.activa ? "positiva" : "neutral"}>{cuenta.activa ? "Activa" : "Inactiva"}</Etiqueta></div><div className={estilo.flowCell}><small className={estilo.flowCellLabel}>Entradas</small><strong className={estilo.flowCellValue}>{moneda(cuenta.ingresos, cuenta.moneda)}</strong></div><div className={estilo.flowCell}><small className={estilo.flowCellLabel}>Salidas</small><strong className={estilo.flowCellValue}>{moneda(cuenta.egresos, cuenta.moneda)}</strong></div><div className={estilo.flowCell}><small className={estilo.flowCellLabel}>Neto</small><strong className={`${estilo.flowCellValue} ${Number(cuenta.neto) < 0 ? "text-[#c8374b]" : ""}`}>{moneda(cuenta.neto, cuenta.moneda)}</strong></div></article>)}</div></> : <div className={estilo.chartMessage}>Aún no hay cuentas registradas para mostrar.</div>}
        <p className={estilo.flowNote}>El gráfico resume pagos registrados con una cuenta asignada; no representa el saldo bancario disponible si no se ha ingresado un saldo inicial.</p>
      </>}
    </section>}
    {vista === "cuentas" && <ListadoMaestro<CuentaFinanciera> variante="tabla" titulo="Cuentas y medios de pago"
      registros={cuentasVisibles} paginacion={{ modo: "local" }} resetKey={`${busqueda}|${estado}`} cargando={cargando} error={errorCarga || undefined}
      vacio="No hay cuentas para mostrar."
      controlesCabecera={<>
        <label className="listado-maestro-busqueda">Buscar cuenta<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, entidad o tipo" /></label>
        <label className="listado-maestro-filtro">Estado<select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todas</option><option value="ACTIVA">Activas</option><option value="INACTIVA">Inactivas</option></select></label>
        {puedeAdministrar && <RegistrarAccionPrincipal etiqueta="Crear cuenta financiera" onClick={() => { setEditando(null); setFormulario(inicial()); setAbierto(true); }} />}
      </>}
      encabezadoTabla={<tr><th>Cuenta</th><th>Tipo</th><th>Estado</th><th>Entradas del mes</th><th>Salidas del mes</th>{puedeAdministrar && <th>Acciones</th>}</tr>}
      renderizarFila={(cuenta) => <tr key={cuenta.id}>
        <td><strong>{cuenta.nombre}</strong>{cuenta.entidad && <small className="block">{cuenta.entidad}</small>}</td>
        <td>{etiquetaTipo(cuenta.tipo)}</td><td><Etiqueta compacta tono={cuenta.activa ? "positiva" : "neutral"}>{cuenta.activa ? "Activa" : "Inactiva"}</Etiqueta></td>
        <td>{moneda(cuenta.ingresosMes ?? 0, cuenta.moneda)}</td><td>{moneda(cuenta.egresosMes ?? 0, cuenta.moneda)}</td>
        {puedeAdministrar && <td><div className="flex flex-wrap gap-1.5">
          <AccionIcono accion="editar" etiqueta={`Editar cuenta ${cuenta.nombre}`} onClick={() => editar(cuenta)} />
          <AccionIcono accion={cuenta.activa ? "desactivar" : "activar"} etiqueta={`${cuenta.activa ? "Desactivar" : "Activar"} cuenta ${cuenta.nombre}`} onClick={() => void alternarEstado(cuenta)} />
        </div></td>}
      </tr>}
    />}
    {vista === "cuentas" && abierto && <DialogoCatalogo titulo={editando ? "Editar cuenta financiera" : "Crear cuenta financiera"} articulo={formulario.nombre || etiquetaTipo(formulario.tipo)} codigo="" guardando={guardando} alCerrar={() => setAbierto(false)}
      acciones={<><Button variant="outline" disabled={guardando} onClick={() => setAbierto(false)}>Cancelar</Button><Button type="submit" form="finanzas-cuenta-form" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cuenta"}</Button></>}>
      <form id="finanzas-cuenta-form" onSubmit={(evento) => void guardar(evento)}>
      <div className={estilo.formFields}>
      <label className={estilo.field}>Tipo de cuenta<select value={formulario.tipo} onChange={(evento) => setFormulario((actual) => ({ ...actual, tipo: evento.target.value as TipoCuentaFinanciera }))}>{tipos.map((tipo) => <option value={tipo.valor} key={tipo.valor}>{tipo.nombre}</option>)}</select></label>
      <label className={estilo.field}>Nombre para identificarla<input required maxLength={100} value={formulario.nombre} onChange={(evento) => setFormulario((actual) => ({ ...actual, nombre: evento.target.value }))} placeholder={formulario.tipo === "EFECTIVO" ? "Ej. Caja principal" : formulario.tipo === "BANCO" ? "Ej. Cuenta corriente del negocio" : formulario.tipo === "BILLETERA" ? "Ej. Yape del negocio" : "Ej. Visa para compras"} /></label>
      {formulario.tipo !== "EFECTIVO" && <label className={estilo.field}>{formulario.tipo === "BILLETERA" ? "Billetera digital" : formulario.tipo === "TARJETA" ? "Banco emisor" : "Banco"}<input required maxLength={100} value={formulario.entidad ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, entidad: evento.target.value }))} placeholder={formulario.tipo === "BILLETERA" ? "Yape, Plin u otro" : "Nombre de la entidad"} /></label>}
      <label className={estilo.field}>Titular<input maxLength={160} value={formulario.titular ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, titular: evento.target.value }))} /></label>
      {formulario.tipo === "BANCO" && <><label className={estilo.field}>Número de cuenta<input maxLength={100} value={formulario.numeroCuenta ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, numeroCuenta: evento.target.value }))} /></label><label className={estilo.field}>CCI<input maxLength={100} value={formulario.cci ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, cci: evento.target.value }))} /></label></>}
      {formulario.tipo === "BILLETERA" && <label className={estilo.field}>Número de celular o cuenta<input required maxLength={30} value={formulario.telefono ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, telefono: evento.target.value }))} /></label>}
      {formulario.tipo === "TARJETA" && <label className={estilo.field}>Últimos cuatro dígitos<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={formulario.numeroTarjeta ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, numeroTarjeta: evento.target.value.replace(/\D/g, "").slice(0, 4) }))} /></label>}
      <label className={estilo.field}>Moneda<select value={formulario.moneda} onChange={(evento) => setFormulario((actual) => ({ ...actual, moneda: evento.target.value as DatosCuentaFinanciera["moneda"] }))}><option value="PEN">Soles (PEN)</option></select><small>Los flujos actuales se registran en soles. Se habilitarán otras monedas cuando el sistema gestione tipo de cambio.</small></label>
      <label className={estilo.field}>Observación<textarea maxLength={1000} value={formulario.observacion ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, observacion: evento.target.value }))} /></label>
      </div>
      </form>
    </DialogoCatalogo>}
  </section>;
}
