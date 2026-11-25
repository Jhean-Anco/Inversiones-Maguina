import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { AccionIcono } from "../../components/ui/accion-icono";
import { anchoMinimoColumnaRelacionClasses, nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Eye } from "lucide-react";
import { ClienteDetalleDialog } from "../nuevo-ingreso-page/cliente-detalle-dialog";

const nombreDe = (cliente: ClienteRegistrado) => cliente.nombreComercial || cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const etiquetaDocumento = (tipo: string) => ({ "01": "DNI", "04": "Carné de extranjería", "06": "RUC", "07": "Pasaporte" } as Record<string, string>)[tipo] ?? tipo;
const clasesModalClientes = [
  "overscroll-contain! [scrollbar-gutter:stable]! [body_&]:overscroll-contain!",
  "[html[data-responsive-profile=mobile-portrait]_body_&]:max-h-[calc(100dvh-16px)]! [html[data-responsive-profile=mobile-portrait]_body_&]:p-4! [html[data-responsive-profile=mobile-portrait]_body_&]:rounded-[16px_16px_10px_10px]!",
  "[&_button:focus-visible]:outline-[3px]! [&_button:focus-visible]:outline-[#3784bd55]! [&_button:focus-visible]:outline-offset-2!",
  "[&_input:focus-visible]:outline-[3px]! [&_input:focus-visible]:outline-[#3784bd55]! [&_input:focus-visible]:outline-offset-2!",
  "[&_select:focus-visible]:outline-[3px]! [&_select:focus-visible]:outline-[#3784bd55]! [&_select:focus-visible]:outline-offset-2!",
  "[&_textarea:focus-visible]:outline-[3px]! [&_textarea:focus-visible]:outline-[#3784bd55]! [&_textarea:focus-visible]:outline-offset-2!",
].join(" ");
const clasesCabeceraModalClientes = "[body_&]:z-[2]! [body_&]:-top-[22px]! [body_&]:-mt-[22px]! [body_&]:[padding:20px_0_12px]! [html[data-responsive-profile=mobile-portrait]_body_&]:-top-[16px]! [html[data-responsive-profile=mobile-portrait]_body_&]:-mt-[16px]!";
const clasesPieModalClientes = "[body_&]:sticky! [body_&]:-bottom-[24px]! [body_&]:-mr-[22px]! [body_&]:-ml-[22px]! [body_&]:-mb-[22px]! [body_&]:[padding:14px_24px_24px]! [html[data-responsive-profile=mobile-portrait]_body_&]:-bottom-[16px]! [html[data-responsive-profile=mobile-portrait]_body_&]:mx-[-16px]! [html[data-responsive-profile=mobile-portrait]_body_&]:-mb-[16px]! [html[data-responsive-profile=mobile-portrait]_body_&]:[padding:12px_16px_16px]!";

export function ClientesPage({ puedeEditar = false, puedeCrear = false }: { puedeEditar?: boolean; puedeCrear?: boolean }) {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(tamanioTablaInicial);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizarLista, setActualizarLista] = useState(0);
  const [clienteEditando, setClienteEditando] = useState<ClienteRegistrado | null>(null);
  const [clienteEnDetalle, setClienteEnDetalle] = useState<ClienteRegistrado | null>(null);

  useEffect(() => {
    let vigente = true;
    const espera = window.setTimeout(() => {
      setCargando(true);
      void servicioIngresos.listarClientes(pagina, porPagina, busqueda.trim()).then((resultado) => { if (vigente) { setClientes(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); } })
        .catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio de clientes."); })
        .finally(() => { if (vigente) setCargando(false); });
    }, busqueda ? 180 : 0);
    return () => { vigente = false; window.clearTimeout(espera); };
  }, [busqueda, actualizarLista, pagina, porPagina]);

  async function guardarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    setError("");
    try {
      await servicioIngresos.registrarCliente(datos);
      setMostrarFormulario(false); setBusqueda(datos.numeroDocumento); setPagina(1); setActualizarLista((n) => n + 1);
      return null;
    } catch (problema) {
      const mensaje = problema instanceof Error ? problema.message : "No se pudo registrar el cliente.";
      setError(mensaje);
      return mensaje;
    }
  }

  async function actualizarCliente(datos: Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">): Promise<string | null> {
    if (!clienteEditando) return null;
    try {
      await servicioIngresos.actualizarCliente(clienteEditando.id, datos);
      setClienteEditando(null); setActualizarLista((n) => n + 1);
      return null;
    } catch (problema) {
      return problema instanceof Error ? problema.message : "No se pudo actualizar el cliente.";
    }
  }

  return <div className="w-full min-w-0 px-1 pt-2 pb-9 text-[#173246]">
    <ListadoMaestro<ClienteRegistrado> variante="tabla" titulo="Directorio de clientes" registros={clientes} cargando={cargando} error={error || undefined} claseContenedor="clientes-table-wrap" paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }} encabezadoTabla={<tr><th>Cliente</th><th>Contacto</th><th>Documentos</th><th>Contacto directo</th><th>Acciones</th></tr>} controlesCabecera={<><label className="listado-maestro-busqueda">Buscar cliente<input id="clientes-buscar" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Nombre, contacto, correo o documento" autoComplete="off" /></label>{puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear cliente" onClick={() => { setError(""); setMostrarFormulario(true); }} />}</>} resetKey={busqueda} vacio={<><strong>{busqueda ? "No hay coincidencias" : "Aún no tienes clientes registrados"}</strong><span>{busqueda ? "Revisa nombre, contacto, correo o documento, o registra el cliente." : "Los clientes que registres desde una venta aparecerán aquí."}</span></>} renderizarFila={(cliente) => <tr className="clientes-row-account" key={cliente.id}><td className={`${anchoMinimoColumnaRelacionClasses} w-[24%]`}><strong className={nombreRelacionListadoClasses}>{nombreDe(cliente)}</strong><small>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Cliente persona natural"}</small></td><td className="min-w-[210px] w-[22%]"><strong className={nombreRelacionListadoClasses}>{cliente.contactoNombre || "—"}</strong><small>{cliente.direccion || "Sin dirección fiscal"}</small></td><td><div className="clientes-document">{(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((doc) => <span key={`${doc.tipoDocumento}:${doc.numeroDocumento}`} className="grid gap-[2px] [&+span]:mt-[5px] [&+span]:border-t [&+span]:border-[#edf1ef] [&+span]:pt-[5px]"><strong>{doc.numeroDocumento}</strong><small>{etiquetaDocumento(doc.tipoDocumento)}</small></span>)}</div></td><td><strong>{cliente.telefono || "Sin teléfono"}</strong><small>{cliente.correo || "Sin correo"}</small></td><td><div className="flex items-center justify-end gap-2"><BotonAccion etiqueta={`Ver ficha de ${nombreDe(cliente)}`} tono="neutral" icono={<Eye aria-hidden="true" size={16} />} onClick={() => setClienteEnDetalle(cliente)} />{puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar cliente ${nombreDe(cliente)}`} onClick={() => setClienteEditando(cliente)} />}</div></td></tr>} />
    {mostrarFormulario && createPortal(<FormularioCliente onGuardar={guardarCliente} onCancelar={() => setMostrarFormulario(false)} />, document.body)}
    {clienteEditando && createPortal(<EditarClienteDialog cliente={clienteEditando} onGuardar={actualizarCliente} onCancelar={() => setClienteEditando(null)} />, document.body)}
    {clienteEnDetalle && createPortal(<ClienteDetalleDialog cliente={clienteEnDetalle} editable={false} onClose={() => setClienteEnDetalle(null)} onSave={async () => undefined} />, document.body)}
  </div>;
}

function EditarClienteDialog({ cliente, onGuardar, onCancelar }: { cliente: ClienteRegistrado; onGuardar: (datos: Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">) => Promise<string | null>; onCancelar: () => void }) {
  const [datos, setDatos] = useState({ nombreComercial: cliente.nombreComercial ?? "", contactoNombre: cliente.contactoNombre ?? "", correo: cliente.correo ?? "", telefono: cliente.telefono ?? "", direccion: cliente.direccion ?? "", direccionEntrega: cliente.direccionEntrega ?? "", observacion: cliente.observacion ?? "" });
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  async function submit(evento: FormEvent<HTMLFormElement>) { evento.preventDefault(); setGuardando(true); const resultado = await onGuardar(datos); setGuardando(false); if (resultado) setError(resultado); }
  return <div className="clientes-modal-backdrop overscroll-contain" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar(); }}><form className={`clientes-modal ${clasesModalClientes}`} role="dialog" aria-modal="true" aria-labelledby="clientes-edit-title" onSubmit={(e) => void submit(e)}><header className={clasesCabeceraModalClientes}> <div><p className="page-eyebrow">EDITANDO FICHA DEL CLIENTE</p><h2 id="clientes-edit-title">{nombreDe(cliente)}</h2><p className="clientes-edit-documento">{etiquetaDocumento(cliente.tipoDocumento)}: {cliente.numeroDocumento}</p></div><button type="button" aria-label="Cerrar" onClick={onCancelar}>×</button></header><div className="clientes-form-grid"><label className="clientes-form-wide">Nombre comercial<input value={datos.nombreComercial} maxLength={180} onChange={(e) => setDatos({ ...datos, nombreComercial: e.target.value })} /></label><label className="clientes-form-wide">Persona de contacto<input value={datos.contactoNombre} maxLength={180} onChange={(e) => setDatos({ ...datos, contactoNombre: e.target.value })} /></label><label>Teléfono<input type="tel" value={datos.telefono} maxLength={30} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} /></label><label>Correo electrónico<input type="email" value={datos.correo} maxLength={254} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} /></label><label className="clientes-form-wide">Dirección fiscal<input value={datos.direccion} maxLength={240} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} /></label><label className="clientes-form-wide">Dirección de entrega<input value={datos.direccionEntrega} maxLength={240} onChange={(e) => setDatos({ ...datos, direccionEntrega: e.target.value })} /></label><label className="clientes-form-wide">Nota interna<textarea rows={3} maxLength={1000} value={datos.observacion} onChange={(e) => setDatos({ ...datos, observacion: e.target.value })} /></label></div>{error && <NotificacionFlotante mensaje={error} />}<footer className={clasesPieModalClientes}> <button className="clientes-secondary-action" type="button" onClick={onCancelar}>Cancelar</button><button className="clientes-primary-action" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></footer></form></div>;
}

export function FormularioCliente({ onGuardar, onCancelar, numeroDocumentoInicial = "" }: { onGuardar: (datos: DatosClienteNuevo) => Promise<string | null>; onCancelar: () => void; numeroDocumentoInicial?: string }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(dialogoRef, onCancelar, "el cliente");
  useDialogoFlotante(dialogoRef, true, solicitarCancelacion);
  const documentoInicialEsRuc = numeroDocumentoInicial.length === 11;
  const [tipoPersona, setTipoPersona] = useState<"NATURAL" | "JURIDICA">(documentoInicialEsRuc && numeroDocumentoInicial.startsWith("20") ? "JURIDICA" : "NATURAL");
  const [tipoDocumento, setTipoDocumento] = useState<DatosClienteNuevo["tipoDocumento"]>(documentoInicialEsRuc ? "RUC" : "DNI");
  const [numeroDocumento, setNumeroDocumento] = useState(numeroDocumentoInicial); const [fechaNacimiento, setFechaNacimiento] = useState(""); const [nombres, setNombres] = useState(""); const [apellidoPaterno, setApellidoPaterno] = useState(""); const [apellidoMaterno, setApellidoMaterno] = useState(""); const [razonSocial, setRazonSocial] = useState(""); const [nombreComercial, setNombreComercial] = useState(""); const [contactoNombre, setContactoNombre] = useState(""); const [correo, setCorreo] = useState(""); const [telefono, setTelefono] = useState(""); const [direccion, setDireccion] = useState(""); const [direccionEntrega, setDireccionEntrega] = useState(""); const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  const [buscandoIdentidad, setBuscandoIdentidad] = useState(false);
  const [identidadConsultada, setIdentidadConsultada] = useState(false);
  const esJuridica = tipoPersona === "JURIDICA";

  async function consultarIdentidad() {
    if (tipoDocumento !== "DNI" && tipoDocumento !== "RUC") return;
    setIdentidadConsultada(false);
    setBuscandoIdentidad(true); setError("");
    try {
      const identidad = await servicioIngresos.consultarIdentidadCliente(tipoDocumento, numeroDocumento.trim());
      setIdentidadConsultada(true);
      setTipoPersona(identidad.tipoPersona ?? "NATURAL");
      setRazonSocial(identidad.razonSocial ?? ""); setNombres(identidad.nombres ?? "");
      setApellidoPaterno(identidad.apellidoPaterno ?? ""); setApellidoMaterno(identidad.apellidoMaterno ?? "");
      setDireccion(identidad.direccion ?? "");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscandoIdentidad(false); }
  }

  async function submit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datos: DatosClienteNuevo = {
      tipoPersona, tipoDocumento, numeroDocumento: numeroDocumento.trim(),
      ...(esJuridica ? { razonSocial: razonSocial.trim(), nombreComercial: nombreComercial.trim(), contactoNombre: contactoNombre.trim(), direccion: direccion.trim(), direccionEntrega: direccionEntrega.trim(), observacion: observacion.trim() } : { nombres: nombres.trim(), apellidoPaterno: apellidoPaterno.trim(), apellidoMaterno: apellidoMaterno.trim(), fechaNacimiento: fechaNacimiento || undefined }),
      correo: correo.trim(), telefono: telefono.trim(),
    };
    const errorGuardar = await onGuardar(datos); if (errorGuardar) setError(errorGuardar);
    setGuardando(false);
  }

  return <>{dialogo}<div className="clientes-modal-backdrop overscroll-contain" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) solicitarCancelacion(); }}><form ref={dialogoRef} className={`clientes-modal ${clasesModalClientes}`} role="dialog" aria-modal="true" onSubmit={(e) => void submit(e)} aria-labelledby="clientes-form-title"><header className={clasesCabeceraModalClientes}> <div><p className="page-eyebrow">CARTERA COMERCIAL</p><h2 id="clientes-form-title">Registrar cliente</h2></div><button type="button" aria-label="Cerrar" onClick={solicitarCancelacion}>×</button></header>
    <div className="clientes-form-grid">
      <label>Tipo de cliente<select value={tipoPersona} onChange={(e) => { const tipo = e.target.value as "NATURAL" | "JURIDICA"; setTipoPersona(tipo); setTipoDocumento(tipo === "JURIDICA" ? "RUC" : "DNI"); setNumeroDocumento(""); setIdentidadConsultada(false); }}><option value="NATURAL">Persona natural</option><option value="JURIDICA">Empresa / organización</option></select></label>
      <label>Documento de identidad<select disabled={buscandoIdentidad} value={tipoDocumento} onChange={(e) => { setTipoDocumento(e.target.value as DatosClienteNuevo["tipoDocumento"]); setIdentidadConsultada(false); }}><option value="RUC">RUC</option>{!esJuridica && <><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></>}</select></label>
      <label className="clientes-form-wide">Número de documento<span className="clientes-document-search grid grid-cols-[minmax(0,1fr)_auto] gap-[7px]"><input required disabled={buscandoIdentidad} inputMode={tipoDocumento === "DNI" || tipoDocumento === "RUC" ? "numeric" : "text"} value={numeroDocumento} maxLength={tipoDocumento === "DNI" ? 8 : tipoDocumento === "RUC" ? 11 : 20} onChange={(e) => { setNumeroDocumento(tipoDocumento === "DNI" || tipoDocumento === "RUC" ? e.target.value.replace(/\D/g, "") : e.target.value); setIdentidadConsultada(false); }} />{(tipoDocumento === "DNI" || tipoDocumento === "RUC") && <button className="min-w-[82px] min-h-10 border border-[#c8ded4] rounded-[8px] px-3 bg-[#edf7f1] text-[#17674f] font-[inherit] text-xs font-[750] cursor-pointer disabled:cursor-not-allowed disabled:opacity-[.55]" type="button" onClick={() => void consultarIdentidad()} disabled={buscandoIdentidad || (tipoDocumento === "DNI" ? numeroDocumento.length !== 8 : numeroDocumento.length !== 11)}>{buscandoIdentidad ? "Consultando…" : tipoDocumento === "RUC" ? "Consultar en SUNAT" : "Buscar"}</button>}</span></label>
      {esJuridica ? <label className="clientes-form-wide">Razón social<input required maxLength={180} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} /></label> : <><label>Nombres<input required maxLength={120} value={nombres} onChange={(e) => setNombres(e.target.value)} /></label><label>Apellido paterno<input required maxLength={120} value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} /></label><label>Apellido materno<input maxLength={120} value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} /></label></>}
      {!esJuridica && <label>Fecha de nacimiento<input type="date" max={new Date().toISOString().slice(0, 10)} value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} /></label>}
      <label>Teléfono<input type="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
      <label>Correo electrónico<input type="email" maxLength={254} value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
      {esJuridica && <><label className="clientes-form-wide">Nombre comercial<input maxLength={180} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} placeholder="Opcional: nombre comercial" /></label>
      <label className="clientes-form-wide">Persona de contacto<input maxLength={180} value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder="Compras, administración…" /></label>
      <label className="clientes-form-wide">Dirección fiscal<input maxLength={240} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></label>
      <label className="clientes-form-wide">Dirección de entrega<input maxLength={240} value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} /></label>
      <label className="clientes-form-wide">Nota interna<textarea maxLength={1000} rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Dato útil para futuras ventas" /></label></>}

    </div>{identidadConsultada && <p className="clientes-identity-note">Datos completados desde la consulta de identidad. Revísalos antes de guardar.</p>}{error && <NotificacionFlotante mensaje={error} />}<footer className={clasesPieModalClientes}><button className="clientes-secondary-action" type="button" onClick={solicitarCancelacion}>Cancelar</button><button className="clientes-primary-action" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cliente"}</button></footer></form></div></>;
}
