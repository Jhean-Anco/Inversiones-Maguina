import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useNavigate } from "react-router-dom";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { BotonAccion } from "../../components/ui/boton-accion";
import { AccionesContacto, BuscadorDirectorio, Opcional, precargaBusqueda, SelectDirectorio, VacioDirectorio } from "../../components/ui/directorio/directorio";
import { Pencil, Save } from "lucide-react";
import { dialogosModeloClasses as d } from "../inventario-mototaxis-page/dialogos-modelo-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { ErrorApi } from "../../services/api-cliente";
import { servicioConductores, type Conductor, type DatosConductor } from "../../services/conductores.service";

const nombreDe = (conductor: Conductor) => [conductor.nombres, conductor.apellidoPaterno, conductor.apellidoMaterno].filter(Boolean).join(" ");
const tipoVisible = (tipo: Conductor["tipoDocumento"]) => ({ DNI: "DNI", CE: "Carné de extranjería", PASAPORTE: "Pasaporte" })[tipo];

export function ConductoresPage({ puedeCrear = false, puedeEditar = false }: { puedeCrear?: boolean; puedeEditar?: boolean }) {
  const navegar = useNavigate();
  const [conductores, setConductores] = useState<Conductor[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(() => tamanioListadoSegunPantalla(window.innerWidth, "tabla"));
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<Conductor | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [actualizar, setActualizar] = useState(0);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const resultado = await servicioConductores.listarPaginado(pagina, porPagina, busqueda); setConductores(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio de conductores."); }
    finally { setCargando(false); }
  }, [busqueda, navegar, pagina, porPagina]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), busqueda ? 180 : 0); return () => window.clearTimeout(timer); }, [cargar, actualizar]);

  async function guardar(datos: DatosConductor) {
    try { await servicioConductores.crear(datos); setAbierto(false); setBusqueda(datos.numeroDocumento); setPagina(1); setActualizar((valor) => valor + 1); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo crear el conductor."; }
  }

  async function editar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!editando || guardandoEdicion) return;
    const campos = new FormData(evento.currentTarget);
    setGuardandoEdicion(true); setErrorEdicion("");
    try {
      await servicioConductores.actualizar(editando.id, { numeroLicencia: String(campos.get("numeroLicencia")), telefono: String(campos.get("telefono")) });
      setEditando(null); setActualizar((valor) => valor + 1);
    } catch (problema) {
      setErrorEdicion(problema instanceof Error ? problema.message : "No se pudo actualizar el conductor.");
    } finally { setGuardandoEdicion(false); }
  }

  return <section className={v.page}>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear conductor" onClick={() => { setError(""); setAbierto(true); }} />}
    <div className={v.toolbar}>
      <BuscadorDirectorio valor={busqueda} alCambiar={(valor) => { setBusqueda(valor); setPagina(1); }} placeholder="Buscar por nombre, documento o licencia" etiqueta="Buscar conductor" />
    </div>
    <ListadoMaestro<Conductor>
      variante="tabla" titulo="Directorio de conductores"
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      registros={conductores} cargando={cargando} error={error || undefined} resetKey={busqueda}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      vacio={<VacioDirectorio busqueda={busqueda} entidad="conductor" ayuda="Revisa el nombre, documento o licencia, o regístralo ahora." alCrear={puedeCrear ? () => { setError(""); setAbierto(true); } : undefined} sinRegistros={<><strong>Aún no hay conductores registrados</strong><span>Los conductores registrados aquí estarán disponibles en las guías de remisión.</span></>} />}
      encabezadoTabla={<tr><th>Conductor</th><th>Documento</th><th>Licencia</th><th>Teléfono</th><th>Acciones</th></tr>}
      renderizarFila={(conductor) => {
        const nombre = nombreDe(conductor);
        return <tr key={conductor.id}>
          <td><strong className={v.clientName}>{nombre}</strong></td>
          <td><strong className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{conductor.numeroDocumento}</strong><small className={v.minorText}>{tipoVisible(conductor.tipoDocumento)}</small></td>
          <td><span className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{conductor.numeroLicencia}</span></td>
          <td><span className="text-[13px] text-[#142b42] [font-variant-numeric:tabular-nums]">{conductor.telefono || "Sin teléfono"}</span></td>
          <td><div className={v.rowActions}>
            <AccionesContacto nombre={nombre} telefono={conductor.telefono} />
            {puedeEditar && <BotonEditarConfirmacion titulo="¿Editar los datos del conductor?" descripcion={`Vas a editar la licencia y el teléfono de ${nombre}. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver al listado" etiquetaConfirmar="Sí, editar conductor" onConfirmar={() => { setErrorEdicion(""); setEditando(conductor); }}><BotonAccion etiqueta={`Editar licencia de ${nombre}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => undefined} /></BotonEditarConfirmacion>}
          </div></td>
        </tr>;
      }}
    />
    {editando && <DialogoCatalogo titulo="Editar datos del conductor" articulo={nombreDe(editando)} codigo={editando.numeroDocumento} alCerrar={() => setEditando(null)} guardando={guardandoEdicion} acciones={<><button type="button" className={d.botonSecundario} onClick={() => setEditando(null)} disabled={guardandoEdicion}>Cancelar</button><button type="submit" form="editar-conductor" className={d.botonPrincipal} disabled={guardandoEdicion}><Save aria-hidden="true" size={16} />{guardandoEdicion ? "Guardando…" : "Guardar cambios"}</button></>}>
      <form id="editar-conductor" onSubmit={(evento) => void editar(evento)}>
        <div className="directorio-form-grid">
          <label>Número de licencia *<input name="numeroLicencia" defaultValue={editando.numeroLicencia} required maxLength={10} /></label>
          <label>Teléfono <Opcional /><input name="telefono" type="tel" defaultValue={editando.telefono ?? ""} maxLength={30} /></label>
        </div>
        {errorEdicion && <NotificacionFlotante mensaje={errorEdicion} onCerrar={() => setErrorEdicion("")} />}
      </form>
    </DialogoCatalogo>}
    {abierto && createPortal(<FormularioConductor inicial={precargaBusqueda(busqueda)} onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
  </section>;
}

function FormularioConductor({ onGuardar, onCerrar, inicial }: { onGuardar: (datos: DatosConductor) => Promise<string | null>; onCerrar: () => void; inicial?: { documento: string; nombre: string } }) {
  const referencia = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(referencia, onCerrar, "el conductor");
  useDialogoFlotante(referencia, true, solicitarCancelacion);
  const [tipoDocumento, setTipoDocumento] = useState<DatosConductor["tipoDocumento"]>("DNI");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  async function submit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datosForm = new FormData(evento.currentTarget);
    const datos: DatosConductor = { tipoDocumento, numeroDocumento: String(datosForm.get("numeroDocumento") ?? "").trim(), nombres: String(datosForm.get("nombres") ?? "").trim(), apellidoPaterno: String(datosForm.get("apellidoPaterno") ?? "").trim(), apellidoMaterno: String(datosForm.get("apellidoMaterno") ?? "").trim() || undefined, numeroLicencia: String(datosForm.get("numeroLicencia") ?? "").trim(), telefono: String(datosForm.get("telefono") ?? "").trim() || undefined };
    const resultado = await onGuardar(datos); if (resultado) setError(resultado); setGuardando(false);
  }
  const maxDocumento = tipoDocumento === "DNI" ? 8 : 15;
  return <>{dialogo}<Dialogo
      kicker="DIRECTORIO DE CONDUCTORES"
      titulo="Crear conductor"
      ancho="md"
      pantallaCompletaMovil
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className="clientes-secondary-action" type="button" onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="conductor-form" className="clientes-primary-action" disabled={guardando}>{guardando ? "Guardando…" : "Crear conductor"}</button></>}
    >
    <form id="conductor-form" ref={referencia} className="grid gap-4" onSubmit={(evento) => void submit(evento)}>
    <div className="directorio-form-grid">
      <label>Tipo de documento *<SelectDirectorio value={tipoDocumento} onChange={(evento) => setTipoDocumento(evento.target.value as DatosConductor["tipoDocumento"])}><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></SelectDirectorio></label>
      <label>Número de documento *<input name="numeroDocumento" defaultValue={inicial?.documento.length === 8 ? inicial.documento : ""} required maxLength={maxDocumento} inputMode={tipoDocumento === "DNI" ? "numeric" : "text"} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : tipoDocumento === "CE" ? "[A-Za-z0-9-]{6,15}" : "[A-Za-z0-9-]{5,15}"} /></label>
      <label>Nombres *<input name="nombres" defaultValue={inicial?.nombre} required maxLength={120} /></label>
      <label>Apellido paterno *<input name="apellidoPaterno" required maxLength={120} /></label>
      <label>Apellido materno <Opcional /><input name="apellidoMaterno" maxLength={120} /></label>
      <label>Número de licencia *<input name="numeroLicencia" required maxLength={10} placeholder="Ej.: Q12345678" /></label>
      <label className="directorio-form-wide">Teléfono <Opcional /><input name="telefono" type="tel" maxLength={30} placeholder="Ej.: 987 654 321" /></label>

    </div>
    </form>
    {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo></>;
}
