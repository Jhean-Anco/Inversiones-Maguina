import { Power } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { BuscadorDirectorio, Opcional } from "../../components/ui/directorio/directorio";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { solicitarApi } from "../../services/api-cliente";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

type Trabajador = { id: string; codigo: string | null; fechaIngreso: string; cargo: string | null; numeroDocumento: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string | null };
const nuevo = () => ({ tipoDocumento: "DNI", numeroDocumento: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", codigo: "", fechaIngreso: new Date().toISOString().slice(0, 10) });
const nombreDe = (p: Trabajador) => [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(" ");
const fechaVisible = (fecha: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${fecha.slice(0, 10)}T00:00:00Z`));

export function PersonalPage({ puedeCrear, puedeEditar }: { puedeCrear: boolean; puedeEditar: boolean }) {
  const [items, setItems] = useState<Trabajador[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try { setItems(await solicitarApi<Trabajador[]>(`/personas/personal?busqueda=${encodeURIComponent(busqueda.trim())}`)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el personal."); }
    finally { setCargando(false); }
  }, [busqueda]);
  useEffect(() => { const espera = window.setTimeout(() => void cargar(), busqueda ? 180 : 0); return () => window.clearTimeout(espera); }, [cargar, busqueda]);

  async function darDeBaja(trabajador: Trabajador) {
    if (!window.confirm(`¿Dar de baja a ${nombreDe(trabajador)} del personal?`)) return;
    try { await solicitarApi(`/personas/personal/${trabajador.id}/baja`, { method: "PATCH" }); setExito("Persona dada de baja del personal."); await cargar(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo actualizar el registro."); }
  }

  return <section className={v.page}>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Agregar personal" onClick={() => { setError(""); setAbierto(true); }} />}
    <div className={v.toolbar}>
      <BuscadorDirectorio valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por nombre, DNI o código" etiqueta="Buscar en el personal" />
    </div>
    <ListadoMaestro<Trabajador> variante="tabla" titulo="Personal"
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      registros={items} cargando={cargando} error={abierto ? undefined : error || undefined} resetKey={busqueda} paginacion={{ modo: "local" }}
      vacio={<div className={v.empty}><strong>{busqueda ? "No hay coincidencias" : "No hay personal activo registrado"}</strong><span>{busqueda ? "Revisa el nombre, DNI o código." : "Agrega a las personas que forman parte del equipo."}</span></div>}
      encabezadoTabla={<tr><th>Nombre</th><th>DNI</th><th>Código</th><th>Cargo</th><th>Ingreso</th>{puedeEditar && <th>Acciones</th>}</tr>}
      renderizarFila={(p) => <tr key={p.id}>
        <td><strong className={v.clientName}>{nombreDe(p)}</strong></td>
        <td><span className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{p.numeroDocumento}</span></td>
        <td>{p.codigo || <span className="text-[11px] text-[#6d8093]">Sin código</span>}</td>
        <td>{p.cargo || <span className="text-[11px] text-[#6d8093]">Sin cargo</span>}</td>
        <td className="[font-variant-numeric:tabular-nums]">{fechaVisible(p.fechaIngreso)}</td>
        {puedeEditar && <td><div className={v.rowActions}><BotonAccion etiqueta={`Dar de baja a ${nombreDe(p)}`} tono="peligro" icono={<Power aria-hidden="true" />} onClick={() => void darDeBaja(p)} /></div></td>}
      </tr>}
    />
    {abierto && createPortal(<FormularioPersonal onCerrar={() => setAbierto(false)} onGuardado={() => { setAbierto(false); setExito("Persona registrada en el personal."); void cargar(); }} />, document.body)}
    {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
  </section>;
}

function FormularioPersonal({ onCerrar, onGuardado }: { onCerrar: () => void; onGuardado: () => void }) {
  const [form, setForm] = useState(nuevo);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  async function guardar(evento: FormEvent) {
    evento.preventDefault(); setOcupado(true); setError("");
    try { await solicitarApi("/personas/personal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); onGuardado(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar al trabajador."); }
    finally { setOcupado(false); }
  }
  return <Dialogo kicker="EQUIPO" titulo="Registrar personal" ancho="md" pantallaCompletaMovil cerrable={!ocupado} onCerrar={onCerrar}
    pie={<><button className="clientes-secondary-action" type="button" onClick={onCerrar}>Cancelar</button><button className="clientes-primary-action" type="submit" form="personal-form" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar personal"}</button></>}>
    <form id="personal-form" className="grid gap-4" onSubmit={(e) => void guardar(e)}>
      <div className="directorio-form-grid">
        <label>DNI *<input inputMode="numeric" maxLength={8} pattern="[0-9]{8}" required value={form.numeroDocumento} onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value.replace(/\D/g, "") })} placeholder="8 dígitos" /></label>
        <label>Fecha de ingreso *<input type="date" required value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} /></label>
        <label>Nombres *<input required maxLength={120} value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} /></label>
        <label>Apellido paterno *<input required maxLength={120} value={form.apellidoPaterno} onChange={(e) => setForm({ ...form, apellidoPaterno: e.target.value })} /></label>
        <label>Apellido materno <Opcional /><input maxLength={120} value={form.apellidoMaterno} onChange={(e) => setForm({ ...form, apellidoMaterno: e.target.value })} /></label>
        <label>Código interno <Opcional /><input maxLength={30} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Ej.: MEC-01" /></label>
      </div>
    </form>
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
  </Dialogo>;
}
