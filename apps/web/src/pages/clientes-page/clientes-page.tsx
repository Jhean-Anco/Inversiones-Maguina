import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { createPortal } from "react-dom";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { tamanioTablaInicial } from "../../components/ui/listado-maestro/paginacion-responsive";
import { BotonAccion } from "../../components/ui/boton-accion";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { ChevronDown, Eye, Mail, MessageCircle, Pencil, Phone } from "lucide-react";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { ClienteDetalleDialog } from "../nuevo-ingreso-page/cliente-detalle-dialog";

const nombreDe = (cliente: ClienteRegistrado) => cliente.nombreComercial || cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const etiquetaDocumento = (tipo: string) => ({ "01": "DNI", "04": "Carné de extranjería", "06": "RUC", "07": "Pasaporte" } as Record<string, string>)[tipo] ?? tipo;

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

  async function actualizarClienteDesdeFicha(cliente: ClienteRegistrado, datos: Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">) {
    try {
      await servicioIngresos.actualizarCliente(cliente.id, datos);
      setClienteEnDetalle((actual) => actual?.id === cliente.id ? { ...actual, ...datos } : actual);
      setActualizarLista((n) => n + 1);
    } catch (problema) {
      throw new Error(problema instanceof Error ? problema.message : "No se pudo actualizar el cliente.");
    }
  }

  return <section className={v.page}>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear cliente" onClick={() => { setError(""); setMostrarFormulario(true); }} />}
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input id="clientes-buscar" type="search" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} placeholder="Buscar por nombre, contacto, correo o documento" aria-label="Buscar cliente" autoComplete="off" />
      </label>
    </div>
    <ListadoMaestro<ClienteRegistrado> variante="tabla" titulo="Directorio de clientes" registros={clientes} cargando={cargando} error={error || undefined}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      encabezadoTabla={<tr><th>Cliente</th><th>Contacto</th><th>Documentos</th><th>Teléfono y correo</th><th>Acciones</th></tr>}
      resetKey={busqueda}
      vacio={<div className={v.empty}><strong>{busqueda ? "No hay coincidencias" : "Aún no tienes clientes registrados"}</strong><span>{busqueda ? "Revisa nombre, contacto, correo o documento, o registra el cliente." : "Los clientes que registres desde una venta aparecerán aquí."}</span></div>}
      renderizarFila={(cliente) => {
        const nombre = nombreDe(cliente).trim() || "Clientes varios";
        const documentos = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
        const telefono = cliente.telefono?.replace(/\D/g, "");
        return <tr key={cliente.id}>
          <td><strong className={v.clientName}>{nombre}</strong><small className={v.minorText}>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Persona natural"}</small></td>
          <td><span className={v.clientName}>{cliente.contactoNombre || "—"}</span><small className={`${v.minorText} mx-auto max-w-[260px] overflow-hidden text-ellipsis`}>{cliente.direccion || "Sin dirección fiscal"}</small></td>
          <td>{documentos.map((doc) => <span key={`${doc.tipoDocumento}:${doc.numeroDocumento}`} className="block [&+span]:mt-1"><strong className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{doc.numeroDocumento}</strong><small className={v.minorText}>{etiquetaDocumento(doc.tipoDocumento)}</small></span>)}</td>
          <td><span className="block text-[13px] text-[#142b42] [font-variant-numeric:tabular-nums]">{cliente.telefono || "Sin teléfono"}</span><small className={v.minorText}>{cliente.correo || "Sin correo"}</small></td>
          <td><div className={v.rowActions}>
            <BotonAccion etiqueta={`Ver ficha de ${nombre}`} tono="neutral" icono={<Eye aria-hidden="true" />} onClick={() => setClienteEnDetalle(cliente)} />
            {telefono && <BotonAccion etiqueta={`Llamar a ${nombre}`} tono="informativa" icono={<Phone aria-hidden="true" />} href={`tel:${telefono}`} />}
            {telefono && <BotonAccion etiqueta={`Escribir por WhatsApp a ${nombre}`} tono="positiva" icono={<MessageCircle aria-hidden="true" />} href={`https://wa.me/${telefono.length === 9 ? `51${telefono}` : telefono}`} />}
            {cliente.correo && <BotonAccion etiqueta={`Enviar correo a ${nombre}`} tono="informativa" icono={<Mail aria-hidden="true" />} href={`mailto:${cliente.correo}`} />}
            {puedeEditar && <BotonEditarConfirmacion titulo="¿Editar los datos del cliente?" descripcion={`Vas a editar la información de ${nombre}. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver al listado" etiquetaConfirmar="Sí, editar cliente" onConfirmar={() => setClienteEditando(cliente)}><BotonAccion etiqueta={`Editar cliente ${nombre}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => undefined} /></BotonEditarConfirmacion>}
          </div></td>
        </tr>;
      }} />
    {mostrarFormulario && createPortal(<FormularioCliente onGuardar={guardarCliente} onCancelar={() => setMostrarFormulario(false)} />, document.body)}
    {clienteEditando && createPortal(<EditarClienteDialog cliente={clienteEditando} onGuardar={actualizarCliente} onCancelar={() => setClienteEditando(null)} />, document.body)}
    {clienteEnDetalle && createPortal(<ClienteDetalleDialog cliente={clienteEnDetalle} editable={puedeEditar} onClose={() => setClienteEnDetalle(null)} onSave={(datos) => actualizarClienteDesdeFicha(clienteEnDetalle, datos)} />, document.body)}
  </section>;
}

function EditarClienteDialog({ cliente, onGuardar, onCancelar }: { cliente: ClienteRegistrado; onGuardar: (datos: Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">) => Promise<string | null>; onCancelar: () => void }) {
  const [datos, setDatos] = useState({ nombreComercial: cliente.nombreComercial ?? "", contactoNombre: cliente.contactoNombre ?? "", correo: cliente.correo ?? "", telefono: cliente.telefono ?? "", direccion: cliente.direccion ?? "", direccionEntrega: cliente.direccionEntrega ?? "", observacion: cliente.observacion ?? "" });
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  async function submit(evento: FormEvent<HTMLFormElement>) { evento.preventDefault(); setGuardando(true); const resultado = await onGuardar(datos); setGuardando(false); if (resultado) setError(resultado); }
  return <Dialogo
      kicker="EDITANDO FICHA DEL CLIENTE"
      titulo={nombreDe(cliente)}
      ancho="md"
      cerrable={!guardando}
      onCerrar={onCancelar}
      pie={<><button className="clientes-secondary-action" type="button" onClick={onCancelar}>Cancelar</button><button className="clientes-primary-action" type="submit" form="cliente-edit-form" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></>}
    >
      <p className="m-0 -mt-2 text-[13px] text-[#52697d]">{etiquetaDocumento(cliente.tipoDocumento)}: {cliente.numeroDocumento}</p>
      <form id="cliente-edit-form" className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <div className="directorio-form-grid"><label className="directorio-form-wide">Nombre comercial<input value={datos.nombreComercial} maxLength={180} onChange={(e) => setDatos({ ...datos, nombreComercial: e.target.value })} /></label><label className="directorio-form-wide">Persona de contacto<input value={datos.contactoNombre} maxLength={180} onChange={(e) => setDatos({ ...datos, contactoNombre: e.target.value })} /></label><label>Teléfono<input type="tel" value={datos.telefono} maxLength={30} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} /></label><label>Correo electrónico<input type="email" value={datos.correo} maxLength={254} onChange={(e) => setDatos({ ...datos, correo: e.target.value })} /></label><label className="directorio-form-wide">Dirección fiscal<input value={datos.direccion} maxLength={240} onChange={(e) => setDatos({ ...datos, direccion: e.target.value })} /></label><label className="directorio-form-wide">Dirección de entrega<input value={datos.direccionEntrega} maxLength={240} onChange={(e) => setDatos({ ...datos, direccionEntrega: e.target.value })} /></label><label className="directorio-form-wide">Nota interna<textarea rows={3} maxLength={1000} value={datos.observacion} onChange={(e) => setDatos({ ...datos, observacion: e.target.value })} /></label></div>
      </form>
      {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo>;
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

  return <>{dialogo}<Dialogo
      kicker="CARTERA COMERCIAL"
      titulo="Registrar cliente"
      ancho="md"
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className="clientes-secondary-action" type="button" onClick={solicitarCancelacion}>Cancelar</button><button className="clientes-primary-action" type="submit" form="cliente-form" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cliente"}</button></>}
    >
      <form id="cliente-form" ref={dialogoRef} className="grid gap-4" onSubmit={(e) => void submit(e)}>
        <div className="directorio-form-grid">
      <label>Tipo de cliente *<span className="directorio-select"><select value={tipoPersona} onChange={(e) => { const tipo = e.target.value as "NATURAL" | "JURIDICA"; setTipoPersona(tipo); setTipoDocumento(tipo === "JURIDICA" ? "RUC" : "DNI"); setNumeroDocumento(""); setIdentidadConsultada(false); }}><option value="NATURAL">Persona natural</option><option value="JURIDICA">Empresa / organización</option></select><ChevronDown aria-hidden="true" /></span></label>
      <label>Documento de identidad *<span className="directorio-select"><select disabled={buscandoIdentidad} value={tipoDocumento} onChange={(e) => { setTipoDocumento(e.target.value as DatosClienteNuevo["tipoDocumento"]); setIdentidadConsultada(false); }}><option value="RUC">RUC</option>{!esJuridica && <><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></>}</select><ChevronDown aria-hidden="true" /></span></label>
      <label className="directorio-form-wide">Número de documento *<span className="clientes-document-search grid grid-cols-[minmax(0,1fr)_auto] gap-[7px]"><input required disabled={buscandoIdentidad} inputMode={tipoDocumento === "DNI" || tipoDocumento === "RUC" ? "numeric" : "text"} value={numeroDocumento} maxLength={tipoDocumento === "DNI" ? 8 : tipoDocumento === "RUC" ? 11 : 20} onChange={(e) => { setNumeroDocumento(tipoDocumento === "DNI" || tipoDocumento === "RUC" ? e.target.value.replace(/\D/g, "") : e.target.value); setIdentidadConsultada(false); }} />{(tipoDocumento === "DNI" || tipoDocumento === "RUC") && <button className="min-w-[82px] min-h-[46px] border border-[#0b2545] rounded-[10px] px-4 bg-[#0b2545] text-white font-[inherit] text-xs font-[750] cursor-pointer disabled:cursor-not-allowed disabled:opacity-[.55]" type="button" onClick={() => void consultarIdentidad()} disabled={buscandoIdentidad || (tipoDocumento === "DNI" ? numeroDocumento.length !== 8 : numeroDocumento.length !== 11)}>{buscandoIdentidad ? "Consultando…" : tipoDocumento === "RUC" ? "Consultar en SUNAT" : "Buscar"}</button>}</span></label>
      {esJuridica ? <label className="directorio-form-wide">Razón social *<input required maxLength={180} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} /></label> : <><label>Nombres *<input required maxLength={120} value={nombres} onChange={(e) => setNombres(e.target.value)} /></label><label>Apellido paterno *<input required maxLength={120} value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} /></label><label>Apellido materno<input maxLength={120} value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} /></label></>}
      {!esJuridica && <label>Fecha de nacimiento<input type="date" max={new Date().toISOString().slice(0, 10)} value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} /></label>}
      <label>Teléfono<input type="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
      <label>Correo electrónico<input type="email" maxLength={254} value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
      {esJuridica && <><label className="directorio-form-wide">Nombre comercial<input maxLength={180} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} placeholder="Ej.: Transportes El Sol" /></label>
      <label className="directorio-form-wide">Persona de contacto<input maxLength={180} value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder="Compras, administración…" /></label>
      <label className="directorio-form-wide">Dirección fiscal<input maxLength={240} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></label>
      <label className="directorio-form-wide">Dirección de entrega<input maxLength={240} value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} /></label>
      <label className="directorio-form-wide">Nota interna<textarea maxLength={1000} rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Dato útil para futuras ventas" /></label></>}

    </div>
      </form>
      {identidadConsultada && <p className="clientes-identity-note">Datos completados desde la consulta de identidad. Revísalos antes de guardar.</p>}
      {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo></>;
}
