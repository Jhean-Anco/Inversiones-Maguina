import "./finanzas-page.css";
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
import { useViewportProfile } from "../../utilidades/use-viewport-profile";

const tipos: Array<{ valor: TipoCuentaFinanciera; nombre: string }> = [
  { valor: "EFECTIVO", nombre: "Caja / efectivo" },
  { valor: "BANCO", nombre: "Cuenta bancaria" },
  { valor: "BILLETERA", nombre: "Billetera digital" },
  { valor: "TARJETA", nombre: "Tarjeta" },
];
const moneda = (valor: string | number, codigo: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: codigo }).format(Number(valor) || 0);
const cantidad = (valor: number) => new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(valor);
const fechaLocal = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
const fechaMovimiento = (fecha: string) => new Date(`${fecha}T00:00:00.000Z`).toLocaleDateString("es-PE", { timeZone: "UTC" });
const etiquetaTipo = (tipo: TipoCuentaFinanciera) => tipos.find((item) => item.valor === tipo)?.nombre ?? tipo;
const identificadorCuenta = (cuenta: CuentaFinanciera) => {
  if (cuenta.identificador !== undefined) return cuenta.identificador || "—";
  const valor = cuenta.numeroCuenta || cuenta.cci || cuenta.telefono || cuenta.numeroTarjeta;
  if (!valor) return "—";
  const digitos = valor.replace(/\D/g, "");
  return digitos.length > 4 ? `•••• ${digitos.slice(-4)}` : valor;
};
const inicial = (): DatosCuentaFinanciera => ({ tipo: "EFECTIVO", nombre: "", entidad: "", titular: "", moneda: "PEN", saldoInicial: "", fechaSaldoInicial: "", numeroCuenta: "", cci: "", numeroTarjeta: "", telefono: "", observacion: "" });

const estilo = {
  page: "grid gap-[18px] py-2 pb-7 text-[var(--erp-ink,#14345a)]",
  flowPanel: "finanzas-flow-panel grid gap-4 rounded-2xl border border-[#dce5ee] bg-[linear-gradient(155deg,#fff,#fbfdff)] p-[22px] shadow-[0_8px_24px_#173b5b08] [html[data-responsive-profile='mobile-portrait']_&]:p-[13px] [html[data-responsive-profile='mobile-landscape']_&]:p-4",
  flowHeading: "finanzas-flow-heading flex items-start justify-between gap-5 [html[data-responsive-profile='mobile-portrait']_&]:flex-col [html[data-responsive-profile='mobile-landscape']_&]:flex-col",
  flowTitle: "my-1 mb-[5px] text-[22px] text-[#173b59]",
  flowDescription: "m-0 text-[13px] text-[#70849a]",
  flowFilters: "finanzas-flow-filters flex items-center gap-[9px] [html[data-responsive-profile='mobile-portrait']_&]:w-full [html[data-responsive-profile='mobile-portrait']_&]:flex-wrap [html[data-responsive-profile='mobile-landscape']_&]:w-full [html[data-responsive-profile='mobile-landscape']_&]:flex-wrap",
  accountFilter: "h-[42px] min-w-[190px] rounded-lg border border-[#d3e0eb] bg-white px-[10px] font-semibold text-[#183754] [html[data-responsive-profile='mobile-portrait']_&]:w-full [html[data-responsive-profile='mobile-landscape']_&]:w-full",
  period: "finanzas-flow-period inline-flex gap-[3px] rounded-[10px] border border-[#dce5ed] bg-[#f3f7fa] p-1 [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:flex-1",
  periodButton: "min-h-[34px] cursor-pointer rounded-[7px] border border-transparent bg-transparent px-[13px] text-xs font-[750] text-[#60788e] [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-portrait']_&]:px-2 [html[data-responsive-profile='mobile-landscape']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:px-2",
  activePeriod: "border-[#dce5ed] bg-white text-[#164e79] shadow-[0_2px_7px_#173b5b12]",
  dateInput: "finanzas-flow-date h-[42px] w-[150px] min-w-0 rounded-lg border border-[#d3e0eb] bg-white px-[10px] font-semibold text-[#183754] [html[data-responsive-profile='mobile-portrait']_&]:flex-1 [html[data-responsive-profile='mobile-landscape']_&]:flex-1",
  yearInput: "w-[100px]",
  flowTotals: "finanzas-flow-totals grid grid-cols-3 gap-[10px] [html[data-responsive-profile='mobile-portrait']_&]:gap-[6px]",
  flowTotal: "grid gap-[6px] rounded-[11px] border border-[#e0e9ef] bg-[#f8fafc] px-[15px] py-[13px] [html[data-responsive-profile='mobile-portrait']_&]:px-2 [html[data-responsive-profile='mobile-portrait']_&]:py-[10px]",
  flowTotalLabel: "text-xs text-[#71859a] [html[data-responsive-profile='mobile-portrait']_&]:text-[10px]",
  flowTotalValue: "text-xl text-[#173b59] [html[data-responsive-profile='mobile-landscape']_&]:text-base [html[data-responsive-profile='mobile-portrait']_&]:text-sm",
  chart: "h-[300px] w-full min-w-0 [html[data-responsive-profile='mobile-landscape']_&]:h-[250px] [html[data-responsive-profile='mobile-portrait']_&]:h-[220px]",
  flowNote: "m-0 text-[11px] text-[#778b9d]",
  chartMessage: "grid min-h-[170px] place-items-center text-center text-[#74889a]",
  formFields: "grid gap-[13px]",
  field: "grid gap-[6px] text-[13px] font-bold text-[#38546e] [&_input]:min-h-[42px] [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-[#d3e0eb] [&_input]:bg-white [&_input]:px-[11px] [&_input]:py-[9px] [&_input]:text-[#183754] [&_select]:min-h-[42px] [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-[#d3e0eb] [&_select]:bg-white [&_select]:px-[11px] [&_select]:py-[9px] [&_select]:text-[#183754] [&_textarea]:min-h-[75px] [&_textarea]:w-full [&_textarea]:resize-y [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-[#d3e0eb] [&_textarea]:bg-white [&_textarea]:px-[11px] [&_textarea]:py-[9px] [&_textarea]:text-[#183754] [&_small]:font-normal [&_small]:text-xs [&_input:focus-visible]:outline-3 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-[#3784bd55] [&_select:focus-visible]:outline-3 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-[#3784bd55] [&_textarea:focus-visible]:outline-3 [&_textarea:focus-visible]:outline-offset-2 [&_textarea:focus-visible]:outline-[#3784bd55]",
};

export function FinanzasPage({ puedeAdministrar, vista }: { puedeAdministrar: boolean; vista: "cuentas" | "movimientos" }) {
  const alertas = useAlertas();
  const navegar = useNavigate();
  const perfilViewport = useViewportProfile();
  const esMovil = perfilViewport === "mobile-portrait" || perfilViewport === "mobile-landscape";
  const [items, setItems] = useState<CuentaFinanciera[]>([]);
  const [periodoFlujo, setPeriodoFlujo] = useState<PeriodoMovimientosCuenta>("MES");
  const [fechaFlujo, setFechaFlujo] = useState(fechaLocal);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState("");
  const [paginaMovimientos, setPaginaMovimientos] = useState(1);
  const [porPaginaMovimientos, setPorPaginaMovimientos] = useState(10);
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
    void servicioFinanzas.movimientos(periodoFlujo, fecha, cuentaSeleccionada, paginaMovimientos, porPaginaMovimientos)
      .then((resultado) => { if (vigente) setMovimientos(resultado); })
      .catch((e: unknown) => { if (vigente) setErrorMovimientos(e instanceof Error ? e.message : "No se pudieron cargar los movimientos de las cuentas."); })
      .finally(() => { if (vigente) setCargandoMovimientos(false); });
    return () => { vigente = false; };
  }, [periodoFlujo, fechaFlujo, cuentaSeleccionada, paginaMovimientos, vista]);

  const cuentasDelPeriodo = (movimientos?.items ?? []).filter((cuenta) => !cuentaSeleccionada || cuenta.id === cuentaSeleccionada);
  const movimientosRegistrados = movimientos?.movimientos ?? [];
  const totalMovimientosRegistrados = movimientos?.totalMovimientos ?? 0;
  const totalPaginasMovimientos = movimientos?.totalPaginasMovimientos ?? 1;
  const cuentasPorMoneda = cuentasDelPeriodo.reduce<Record<string, typeof cuentasDelPeriodo>>((grupos, cuenta) => {
    (grupos[cuenta.moneda] ??= []).push(cuenta);
    return grupos;
  }, {});
  const importePeriodo = (campo: "ingresos" | "egresos" | "neto") => {
    const totales = Object.entries(cuentasDelPeriodo.reduce<Record<string, number>>((grupo, cuenta) => {
      grupo[cuenta.moneda] = (grupo[cuenta.moneda] ?? 0) + Number(cuenta[campo]);
      return grupo;
    }, {}));
    if (!totales.length) return moneda(0, movimientos?.items.find((cuenta) => cuenta.id === cuentaSeleccionada)?.moneda ?? "PEN");
    return totales.map(([codigo, total]) => moneda(total, codigo)).join(" · ");
  };

  function editar(cuenta: CuentaFinanciera) {
    setEditando(cuenta.id);
    setFormulario({ tipo: cuenta.tipo, nombre: cuenta.nombre, entidad: cuenta.entidad ?? "", titular: cuenta.titular ?? "", moneda: cuenta.moneda, saldoInicial: cuenta.saldoInicial ?? "", fechaSaldoInicial: cuenta.fechaSaldoInicial ?? "", numeroCuenta: cuenta.numeroCuenta ?? "", cci: cuenta.cci ?? "", numeroTarjeta: cuenta.numeroTarjeta ?? "", telefono: cuenta.telefono ?? "", observacion: cuenta.observacion ?? "" });
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
  const monedasSaldo = [...new Set(items.filter((cuenta) => cuenta.activa).map((cuenta) => cuenta.moneda))].sort();
  const totalesSaldo = monedasSaldo.map((codigo) => {
    const cuentasMoneda = items.filter((cuenta) => cuenta.activa && cuenta.moneda === codigo);
    const conciliadas = cuentasMoneda.every((cuenta) => cuenta.saldoEstado === "CONCILIADO" && cuenta.saldoActual !== null && cuenta.saldoActual !== undefined);
    return { codigo, cuentas: cuentasMoneda.length, saldo: conciliadas ? cuentasMoneda.reduce((suma, cuenta) => suma + Number(cuenta.saldoActual), 0) : null,
      pendientes: cuentasMoneda.filter((cuenta) => cuenta.saldoEstado !== "CONCILIADO").length };
  });
  const cuentasActivas = items.filter((cuenta) => cuenta.activa).length;

  return <section className={`${estilo.page} finanzas-page`}>
    {vista === "movimientos" && <section className={estilo.flowPanel}>
      <header className={estilo.flowHeading}><div><h2 className={estilo.flowTitle}>Flujo por cuenta</h2><p className={estilo.flowDescription}>Entradas y salidas registradas en las cuentas seleccionadas.</p></div><div className={estilo.flowFilters} aria-label="Filtros de movimientos"><div className={estilo.period} role="group" aria-label="Periodo de movimientos">{([ ["DIA", "Día"], ["MES", "Mes"], ["ANIO", "Año"] ] as const).map(([valor, nombre]) => <button type="button" key={valor} className={`${estilo.periodButton} ${periodoFlujo === valor ? estilo.activePeriod : ""}`} aria-pressed={periodoFlujo === valor} onClick={() => { setPeriodoFlujo(valor); setPaginaMovimientos(1); }}>{nombre}</button>)}</div><input className={`${estilo.dateInput} ${periodoFlujo === "ANIO" ? estilo.yearInput : ""}`} aria-label={periodoFlujo === "DIA" ? "Seleccionar día" : periodoFlujo === "MES" ? "Seleccionar mes" : "Seleccionar año"} type={periodoFlujo === "DIA" ? "date" : periodoFlujo === "MES" ? "month" : "number"} min={periodoFlujo === "ANIO" ? "1900" : undefined} max={periodoFlujo === "ANIO" ? String(new Date().getFullYear()) : undefined} value={periodoFlujo === "DIA" ? fechaFlujo : periodoFlujo === "MES" ? fechaFlujo.slice(0, 7) : fechaFlujo.slice(0, 4)} onChange={(evento) => { const valor = evento.target.value; if (!valor) return; setPaginaMovimientos(1); setFechaFlujo(periodoFlujo === "DIA" ? valor : periodoFlujo === "MES" ? `${valor}-01` : `${valor}-01-01`); }} /><label className="finanzas-flow-account grid gap-1 text-[10px] font-bold uppercase tracking-wide text-[#71859a]">Cuenta<select className={estilo.accountFilter} aria-label="Cuenta" value={cuentaSeleccionada} onChange={(evento) => { setCuentaSeleccionada(evento.target.value); setPaginaMovimientos(1); }}><option value="">Todas las cuentas</option>{(movimientos?.items ?? []).map((cuenta) => <option key={cuenta.id} value={cuenta.id}>{cuenta.nombre}</option>)}</select></label></div></header>
      {errorMovimientos ? <NotificacionFlotante mensaje={errorMovimientos} /> : cargandoMovimientos || !movimientos ? <div className={estilo.chartMessage} role="status">Cargando movimientos de cuentas…</div> : <>
        <div className={estilo.flowTotals}><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Entradas del periodo</span><strong className={estilo.flowTotalValue}>{importePeriodo("ingresos")}</strong></div><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Salidas del periodo</span><strong className={estilo.flowTotalValue}>{importePeriodo("egresos")}</strong></div><div className={estilo.flowTotal}><span className={estilo.flowTotalLabel}>Neto del periodo</span><strong className={estilo.flowTotalValue}>{importePeriodo("neto")}</strong></div></div>
        {Object.keys(cuentasPorMoneda).length ? <>{Object.entries(cuentasPorMoneda).map(([codigoMoneda, cuentasMoneda]) => <div className={estilo.chart} key={codigoMoneda} role="img" aria-label={`Entradas y salidas por cuenta en ${codigoMoneda}`}><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={cuentasMoneda} margin={{ top: 10, right: 14, left: 8, bottom: 4 }} barCategoryGap="30%"><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="nombre" tickLine={false} axisLine={false} tick={{ fill: "#60788e", fontSize: 11 }} interval={0} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} tickFormatter={(valor: number) => `${codigoMoneda} ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={75} /><Tooltip formatter={(valor, nombre) => [moneda(Number(valor), codigoMoneda), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 11 }} /><Legend align="left" verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: 11 }} /><Bar isAnimationActive={false} dataKey="ingresos" name="Entradas" fill="var(--erp-brand)" radius={[5, 5, 0, 0]} barSize={24} /><Bar isAnimationActive={false} dataKey="egresos" name="Salidas" fill="var(--erp-accent)" radius={[5, 5, 0, 0]} barSize={24} /></BarChart></ResponsiveContainer></div>)}</> : <div className={estilo.chartMessage}>No hay movimientos para las cuentas y el periodo seleccionados.</div>}
        {esMovil
          ? <ListadoMaestro<NonNullable<MovimientosCuentas["movimientos"]>[number]> variante="tarjetas" titulo="Movimientos del periodo" descripcion={`Se muestran ${movimientosRegistrados.length} de ${totalMovimientosRegistrados} movimientos registrados.`} registros={movimientosRegistrados} cargando={cargandoMovimientos} paginacion={{ modo: "remota", pagina: paginaMovimientos, tamanio: porPaginaMovimientos, total: totalMovimientosRegistrados, totalPaginas: totalPaginasMovimientos, desde: totalMovimientosRegistrados ? (paginaMovimientos - 1) * porPaginaMovimientos + 1 : 0, hasta: Math.min(paginaMovimientos * porPaginaMovimientos, totalMovimientosRegistrados), alCambiarPagina: setPaginaMovimientos, alCambiarTamanio: (tamanio) => { setPorPaginaMovimientos(tamanio); setPaginaMovimientos(1); } }} vacio="No hay movimientos registrados para los filtros seleccionados." columnas={1} renderizarTarjeta={(movimiento) => <article key={movimiento.id} className="grid gap-2 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-3"><div className="flex items-start justify-between gap-3"><strong className="min-w-0 break-words">{movimiento.descripcion}</strong><Etiqueta compacta tono={movimiento.sentido === "INGRESO" ? "positiva" : "peligro"}>{movimiento.sentido === "INGRESO" ? "Entrada" : "Salida"}</Etiqueta></div><div className="flex flex-wrap gap-x-2 text-xs text-[var(--erp-text-muted)]"><span>{fechaMovimiento(movimiento.fecha)}</span><span aria-hidden="true">·</span><span>{movimiento.cuentaNombre}</span></div><strong className="text-right font-semibold tabular-nums">{moneda(movimiento.importe, movimiento.moneda)}</strong><small className="text-[var(--erp-text-muted)]">{movimiento.clase}</small></article>} />
          : <ListadoMaestro<NonNullable<MovimientosCuentas["movimientos"]>[number]> variante="tabla" titulo="Movimientos del periodo" descripcion={`Se muestran ${movimientosRegistrados.length} de ${totalMovimientosRegistrados} movimientos registrados.`} registros={movimientosRegistrados} cargando={cargandoMovimientos} paginacion={{ modo: "remota", pagina: paginaMovimientos, tamanio: porPaginaMovimientos, total: totalMovimientosRegistrados, totalPaginas: totalPaginasMovimientos, desde: totalMovimientosRegistrados ? (paginaMovimientos - 1) * porPaginaMovimientos + 1 : 0, hasta: Math.min(paginaMovimientos * porPaginaMovimientos, totalMovimientosRegistrados), alCambiarPagina: setPaginaMovimientos, alCambiarTamanio: (tamanio) => { setPorPaginaMovimientos(tamanio); setPaginaMovimientos(1); } }} vacio="No hay movimientos registrados para los filtros seleccionados." encabezadoTabla={<tr><th>Fecha</th><th>Movimiento</th><th>Cuenta</th><th>Tipo</th><th>Monto</th></tr>} renderizarFila={(movimiento) => <tr key={movimiento.id}><td>{fechaMovimiento(movimiento.fecha)}</td><td><strong>{movimiento.descripcion}</strong><small className="block">{movimiento.clase}</small></td><td>{movimiento.cuentaNombre}</td><td><Etiqueta compacta tono={movimiento.sentido === "INGRESO" ? "positiva" : "peligro"}>{movimiento.sentido === "INGRESO" ? "Entrada" : "Salida"}</Etiqueta></td><td className="font-semibold tabular-nums">{moneda(movimiento.importe, movimiento.moneda)}</td></tr>} />}
        <p className={estilo.flowNote}>El gráfico resume pagos registrados con una cuenta asignada; no representa el saldo bancario disponible si no se ha ingresado un saldo inicial.</p>
      </>}
    </section>}
    {vista === "cuentas" && <>
    <dl className="finanzas-saldos-resumen" aria-label="Resumen de saldos calculados">
      <div className="finanzas-saldo-metrica"><dt>Cuentas activas</dt><dd>{cantidad(cuentasActivas)}</dd><small>De {cantidad(items.length)} cuentas registradas</small></div>
      {totalesSaldo.map(({ codigo, cuentas, saldo, pendientes }) => <div className="finanzas-saldo-metrica" key={codigo}><dt>Saldo total · {codigo}</dt><dd>{saldo === null ? "No disponible" : moneda(saldo, codigo)}</dd><small>{saldo === null ? `${cantidad(pendientes)} de ${cantidad(cuentas)} sin conciliar` : `${cantidad(cuentas)} cuentas calculadas desde su corte`}</small></div>)}
    </dl>
    <p className="finanzas-saldos-nota">El saldo se calcula desde la fecha de corte con los cobros y pagos registrados en el ERP. Las transferencias entre cuentas no se registran en este módulo y no están incluidas.</p>
    {esMovil
      ? <ListadoMaestro<CuentaFinanciera> variante="tarjetas" columnas={1} titulo="Cuentas y medios de pago"
        registros={cuentasVisibles} paginacion={{ modo: "local" }} resetKey={`${busqueda}|${estado}`} cargando={cargando} error={errorCarga || undefined}
        vacio="No hay cuentas para mostrar."
        controlesCabecera={<>
          <label className="listado-maestro-busqueda">Buscar cuenta<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, entidad o tipo" /></label>
          <label className="listado-maestro-filtro">Estado<select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todas</option><option value="ACTIVA">Activas</option><option value="INACTIVA">Inactivas</option></select></label>
          {puedeAdministrar && <RegistrarAccionPrincipal etiqueta="Crear cuenta financiera" onClick={() => { setEditando(null); setFormulario(inicial()); setAbierto(true); }} />}
        </>}
        renderizarTarjeta={(cuenta) => <article key={cuenta.id} className="grid gap-3 rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface)] p-4">
          <header className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><h3 className="m-0 break-words text-base font-bold text-[var(--erp-ink,#172033)]">{cuenta.nombre}</h3>{cuenta.entidad && <p className="m-0 mt-1 text-sm text-[var(--erp-ink-muted,#718797)]">{cuenta.entidad}</p>}</div><Etiqueta compacta tono={cuenta.activa ? "positiva" : "neutral"}>{cuenta.activa ? "Activa" : "Inactiva"}</Etiqueta></header>
          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--erp-border)] pt-3 text-sm"><div><dt className="text-xs text-[var(--erp-ink-muted,#718797)]">Número</dt><dd className="m-0 break-all font-medium">{identificadorCuenta(cuenta)}</dd></div><div><dt className="text-xs text-[var(--erp-ink-muted,#718797)]">Moneda</dt><dd className="m-0 font-medium">{cuenta.moneda}</dd></div><div><dt className="text-xs text-[var(--erp-ink-muted,#718797)]">Tipo</dt><dd className="m-0 font-medium">{etiquetaTipo(cuenta.tipo)}</dd></div><div><dt className="text-xs text-[var(--erp-ink-muted,#718797)]">Saldo disponible</dt><dd className="m-0 font-semibold tabular-nums">{cuenta.saldoEstado === "CONCILIADO" && cuenta.saldoActual !== null && cuenta.saldoActual !== undefined ? moneda(cuenta.saldoActual, cuenta.moneda) : <span title={cuenta.saldoMensaje ?? "Registra saldo inicial y fecha de corte."}>No conciliado</span>}</dd></div></dl>
          {puedeAdministrar && <div className="flex flex-wrap gap-1.5 border-t border-[var(--erp-border)] pt-2"><AccionIcono accion="editar" etiqueta={`Editar cuenta ${cuenta.nombre}`} onClick={() => editar(cuenta)} /><AccionIcono accion={cuenta.activa ? "desactivar" : "activar"} etiqueta={`${cuenta.activa ? "Desactivar" : "Activar"} cuenta ${cuenta.nombre}`} onClick={() => void alternarEstado(cuenta)} /></div>}
        </article>} />
      : <ListadoMaestro<CuentaFinanciera> variante="tabla" titulo="Cuentas y medios de pago"
        registros={cuentasVisibles} paginacion={{ modo: "local" }} resetKey={`${busqueda}|${estado}`} cargando={cargando} error={errorCarga || undefined}
        vacio="No hay cuentas para mostrar."
        controlesCabecera={<>
          <label className="listado-maestro-busqueda">Buscar cuenta<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, entidad o tipo" /></label>
          <label className="listado-maestro-filtro">Estado<select value={estado} onChange={(e) => setEstado(e.target.value)}><option value="">Todas</option><option value="ACTIVA">Activas</option><option value="INACTIVA">Inactivas</option></select></label>
          {puedeAdministrar && <RegistrarAccionPrincipal etiqueta="Crear cuenta financiera" onClick={() => { setEditando(null); setFormulario(inicial()); setAbierto(true); }} />}
        </>}
        encabezadoTabla={<tr><th>Cuenta</th><th>Número</th><th>Moneda</th><th>Tipo</th><th>Estado</th><th>Saldo calculado</th><th>Entradas del mes</th><th>Salidas del mes</th>{puedeAdministrar && <th>Acciones</th>}</tr>}
        renderizarFila={(cuenta) => <tr key={cuenta.id}>
          <td><strong>{cuenta.nombre}</strong>{cuenta.entidad && <small className="block">{cuenta.entidad}</small>}</td>
          <td className="finanzas-cuenta-numero">{identificadorCuenta(cuenta)}</td><td>{cuenta.moneda}</td>
          <td>{etiquetaTipo(cuenta.tipo)}</td><td><Etiqueta compacta tono={cuenta.activa ? "positiva" : "neutral"}>{cuenta.activa ? "Activa" : "Inactiva"}</Etiqueta></td>
          <td className="finanzas-saldo-celda">{cuenta.saldoEstado === "CONCILIADO" && cuenta.saldoActual !== null && cuenta.saldoActual !== undefined ? <strong>{moneda(cuenta.saldoActual, cuenta.moneda)}</strong> : <span title={cuenta.saldoMensaje ?? "Registra saldo inicial y fecha de corte."}>No conciliado<small className="block">{cuenta.saldoMensaje ?? "Registra saldo inicial y fecha de corte."}</small></span>}</td>
          <td>{moneda(cuenta.ingresosMes ?? 0, cuenta.moneda)}</td><td>{moneda(cuenta.egresosMes ?? 0, cuenta.moneda)}</td>
          {puedeAdministrar && <td><div className="flex flex-wrap gap-1.5"><AccionIcono accion="editar" etiqueta={`Editar cuenta ${cuenta.nombre}`} onClick={() => editar(cuenta)} /><AccionIcono accion={cuenta.activa ? "desactivar" : "activar"} etiqueta={`${cuenta.activa ? "Desactivar" : "Activar"} cuenta ${cuenta.nombre}`} onClick={() => void alternarEstado(cuenta)} /></div></td>}
        </tr>} />}
    </>}
    {vista === "cuentas" && abierto && <DialogoCatalogo titulo={editando ? "Editar cuenta financiera" : "Crear cuenta financiera"} articulo={formulario.nombre || etiquetaTipo(formulario.tipo)} codigo="" guardando={guardando} pantallaCompletaMovil alCerrar={() => setAbierto(false)}
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
      <div className="finanzas-saldo-inicial-grid">
        <label className={estilo.field}>Saldo inicial conciliado<input aria-describedby="finanzas-saldo-inicial-ayuda" type="number" step="0.01" value={formulario.saldoInicial ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, saldoInicial: evento.target.value }))} placeholder="Opcional" /></label>
        <label className={estilo.field}>Fecha del saldo inicial<input aria-describedby="finanzas-saldo-inicial-ayuda" type="date" max={fechaLocal()} value={formulario.fechaSaldoInicial ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, fechaSaldoInicial: evento.target.value }))} /></label>
        <p id="finanzas-saldo-inicial-ayuda" className="finanzas-saldo-inicial-ayuda">Completa ambos campos para conciliar. El importe corresponde al saldo al inicio de la fecha elegida; desde ese día se suman solo los cobros y pagos asociados a esta cuenta. Si falta una asignación o aparece un movimiento en otra moneda, el saldo quedará como no conciliado.</p>
      </div>
      <label className={estilo.field}>Observación<textarea maxLength={1000} value={formulario.observacion ?? ""} onChange={(evento) => setFormulario((actual) => ({ ...actual, observacion: evento.target.value }))} /></label>
      </div>
      </form>
    </DialogoCatalogo>}
  </section>;
}
