import { Pencil, Power } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { servicioFinanzas, type CuentaFinanciera, type DatosCuentaFinanciera } from "../../services/finanzas.service";
import { dialogosModeloClasses as d, tonosPill } from "../inventario-mototaxis-page/dialogos-modelo-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { cuentaVacia, datosDeCuenta, etiquetaTipo, identificadorCuenta, moneda, saldoConciliado } from "./finanzas-formatters";
import { FormularioCuenta } from "./formulario-cuenta";

type FiltroEstado = "ACTIVAS" | "INACTIVAS";
const normalizar = (texto: string) => texto.trim().toLocaleLowerCase("es-PE");

export function CuentasFinancieras({ puedeAdministrar, manejarError }: { puedeAdministrar: boolean; manejarError: (e: unknown) => void }) {
  const alertas = useAlertas();
  const [items, setItems] = useState<CuentaFinanciera[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("ACTIVAS");
  const [formulario, setFormulario] = useState<DatosCuentaFinanciera>(cuentaVacia);
  const [editando, setEditando] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [resumen, catalogo] = await Promise.all([servicioFinanzas.resumen(), puedeAdministrar ? servicioFinanzas.listar() : Promise.resolve([])]);
      setItems(resumen.items.map((item) => ({ ...catalogo.find((cuenta) => cuenta.id === item.id), ...item }) as CuentaFinanciera));
      setErrorCarga("");
    } catch (e) { setErrorCarga("No se pudieron cargar las cuentas financieras."); manejarError(e); }
    finally { setCargando(false); }
  }, [manejarError, puedeAdministrar]);
  useEffect(() => { void cargar(); }, [cargar]);

  function abrirNueva() { setEditando(null); setFormulario(cuentaVacia()); setAbierto(true); }
  function editar(cuenta: CuentaFinanciera) { setEditando(cuenta.id); setFormulario(datosDeCuenta(cuenta)); setAbierto(true); }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    try {
      if (editando) await servicioFinanzas.actualizar(editando, formulario);
      else await servicioFinanzas.crear(formulario);
      alertas.exito(editando ? "Cuenta actualizada." : "Cuenta agregada.");
      setAbierto(false); setEditando(null); setFormulario(cuentaVacia());
      await cargar();
    } catch (e) { manejarError(e); }
    finally { setGuardando(false); }
  }

  async function alternarEstado(cuenta: CuentaFinanciera) {
    if (!window.confirm(cuenta.activa ? `¿Desactivar la cuenta ${cuenta.nombre}? Su historial se conserva.` : `¿Activar la cuenta ${cuenta.nombre}?`)) return;
    try { await servicioFinanzas.cambiarEstado(cuenta.id, !cuenta.activa); alertas.exito(cuenta.activa ? "Cuenta desactivada. Su historial de movimientos se conserva." : "Cuenta activada."); await cargar(); }
    catch (e) { manejarError(e); }
  }

  const activas = items.filter((cuenta) => cuenta.activa);
  const termino = normalizar(busqueda);
  const cuentasVisibles = items.filter((cuenta) => (estado === "ACTIVAS") === cuenta.activa
    && normalizar([cuenta.nombre, cuenta.entidad, etiquetaTipo(cuenta.tipo)].filter(Boolean).join(" ")).includes(termino));

  return <section className={v.page}>
    {puedeAdministrar && <RegistrarAccionPrincipal etiqueta="Crear cuenta financiera" onClick={abrirNueva} />}
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, entidad o tipo" aria-label="Buscar cuenta" />
      </label>
      <div className={v.filters} role="group" aria-label="Estado">
        {([["ACTIVAS", "Activas", activas.length], ["INACTIVAS", "Inactivas", items.length - activas.length]] as const).map(([valor, etiqueta, total]) =>
          <button key={valor} type="button" className={v.chip} aria-pressed={estado === valor} onClick={() => setEstado(valor)}>{etiqueta}<span className={v.chipCount}>{total}</span></button>)}
      </div>
    </div>
    <ListadoMaestro<CuentaFinanciera> variante="tabla" titulo="Cuentas y medios de pago"
      registros={cuentasVisibles} paginacion={{ modo: "local" }} resetKey={`${busqueda}|${estado}`} cargando={cargando} error={errorCarga || undefined}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      vacio={<div className={v.empty}><strong>No hay cuentas para mostrar</strong><span>{termino ? "Prueba con otra búsqueda." : estado === "ACTIVAS" ? "Registra la primera caja o cuenta del negocio." : "No hay cuentas desactivadas."}</span></div>}
      encabezadoTabla={<tr><th>Cuenta</th><th>Tipo</th><th>Número</th><th>Saldo calculado</th><th>Entradas del mes</th><th>Salidas del mes</th><th>Estado</th>{puedeAdministrar && <th>Acciones</th>}</tr>}
      renderizarFila={(cuenta) => {
        const tono = cuenta.activa ? tonosPill.verde : tonosPill.gris;
        const mensajeSaldo = cuenta.saldoMensaje ?? "Registra saldo inicial y fecha de corte.";
        return <tr key={cuenta.id}>
          <td><strong className={v.documentCode}>{cuenta.nombre}</strong>{cuenta.entidad && <small className={v.minorText}>{cuenta.entidad}</small>}</td>
          <td>{etiquetaTipo(cuenta.tipo)}<small className={v.minorText}>{cuenta.moneda}</small></td>
          <td className="[font-variant-numeric:tabular-nums]">{identificadorCuenta(cuenta)}</td>
          <td>{saldoConciliado(cuenta) ? <span className={v.total}>{moneda(cuenta.saldoActual!, cuenta.moneda)}</span>
            : <span title={mensajeSaldo}><span className={`${v.status} ${tonosPill.azul.caja}`}><i className={`${d.punto} ${tonosPill.azul.punto}`} aria-hidden="true" />No conciliado</span><small className={v.statusDetail + " mx-auto"}>{mensajeSaldo}</small></span>}</td>
          <td className="[font-variant-numeric:tabular-nums]">{moneda(cuenta.ingresosMes ?? 0, cuenta.moneda)}</td>
          <td className="[font-variant-numeric:tabular-nums]">{moneda(cuenta.egresosMes ?? 0, cuenta.moneda)}</td>
          <td><span className={`${v.status} ${tono.caja}`}><i className={`${d.punto} ${tono.punto}`} aria-hidden="true" />{cuenta.activa ? "Activa" : "Inactiva"}</span></td>
          {puedeAdministrar && <td><div className={v.rowActions}>
            <BotonAccion etiqueta={`Editar cuenta ${cuenta.nombre}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => editar(cuenta)} />
            <BotonAccion etiqueta={`${cuenta.activa ? "Desactivar" : "Activar"} cuenta ${cuenta.nombre}`} tono={cuenta.activa ? "peligro" : "positiva"} icono={<Power aria-hidden="true" />} onClick={() => void alternarEstado(cuenta)} />
          </div></td>}
        </tr>;
      }}
    />
    {abierto && <FormularioCuenta editando={Boolean(editando)} formulario={formulario} guardando={guardando}
      alCambiar={(cambio) => setFormulario((actual) => ({ ...actual, ...cambio }))} alGuardar={(e) => void guardar(e)} alCerrar={() => setAbierto(false)} />}
  </section>;
}
