import "./clientes-page.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";

const nombreDe = (cliente: ClienteRegistrado) => cliente.nombreComercial || cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const etiquetaDocumento = (tipo: string) => ({ "01": "DNI", "04": "Carné de extranjería", "06": "RUC", "07": "Pasaporte" } as Record<string, string>)[tipo] ?? tipo;

export function ClientesPage() {
  const [busqueda, setBusqueda] = useState("");
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [actualizarLista, setActualizarLista] = useState(0);

  useEffect(() => {
    let vigente = true;
    const espera = window.setTimeout(() => {
      setCargando(true);
      void servicioIngresos.buscarClientes(busqueda.trim()).then((datos) => { if (vigente) { setClientes(datos); setError(""); } })
        .catch((problema) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio de clientes."); })
        .finally(() => { if (vigente) setCargando(false); });
    }, 180);
    return () => { vigente = false; window.clearTimeout(espera); };
  }, [busqueda, actualizarLista]);

  async function guardarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    setError("");
    try {
      await servicioIngresos.registrarCliente(datos);
      setMostrarFormulario(false); setBusqueda(datos.numeroDocumento); setActualizarLista((n) => n + 1);
      return null;
    } catch (problema) {
      const mensaje = problema instanceof Error ? problema.message : "No se pudo registrar el cliente.";
      setError(mensaje);
      return mensaje;
    }
  }

  return <div className="clientes-page">
    <header className="clientes-heading"><div><p className="page-eyebrow">CARTERA COMERCIAL <span>·</span> RELACIONES CON CLIENTES</p><h1>Clientes</h1><p className="page-subtitle">Registra al comprador como cliente y guarda por separado sus datos de contacto y entrega.</p></div><button className="clientes-primary-action" type="button" onClick={() => { setError(""); setMostrarFormulario(true); }}>+ Nuevo cliente</button></header>
    {error && <div className="clientes-alert" role="alert">{error}</div>}
    <section className="clientes-toolbar"><label htmlFor="clientes-buscar">Directorio de clientes</label><div className="clientes-search"><span aria-hidden="true">⌕</span><input id="clientes-buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente, contacto, correo o documento" autoComplete="off" /></div><span className="clientes-count">{cargando ? "Buscando…" : `${clientes.length} ${clientes.length === 1 ? "cliente" : "clientes"}`}</span></section>
    <section className="clientes-table-wrap" aria-label="Clientes registrados">
      {cargando ? <div className="clientes-empty">Cargando clientes…</div> : clientes.length ? <div className="clientes-table"><div className="clientes-table-head"><span>CLIENTE</span><span>CONTACTO</span><span>DOCUMENTOS</span><span>CONTACTO DIRECTO</span></div>{clientes.map((cliente) => <article className="clientes-row clientes-row-account" key={cliente.id}><div className="clientes-name"><strong>{nombreDe(cliente)}</strong><small>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Cliente persona natural"}</small></div><div className="clientes-name"><strong>{cliente.contactoNombre || "—"}</strong><small>{cliente.direccion || "Sin dirección fiscal"}</small></div><div className="clientes-document">{(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((doc) => <span key={`${doc.tipoDocumento}:${doc.numeroDocumento}`}><strong>{doc.numeroDocumento}</strong><small>{etiquetaDocumento(doc.tipoDocumento)}</small></span>)}</div><div className="clientes-name"><strong>{cliente.telefono || "Sin teléfono"}</strong><small>{cliente.correo || "Sin correo"}</small></div></article>)}</div> : <div className="clientes-empty"><strong>{busqueda ? "No hay coincidencias" : "Aún no tienes clientes registrados"}</strong><span>{busqueda ? "Revisa nombre, contacto, correo o documento, o registra el cliente." : "Los clientes que registres desde una venta aparecerán aquí."}</span><button type="button" onClick={() => setMostrarFormulario(true)}>+ Registrar cliente</button></div>}
    </section>
    {mostrarFormulario && <FormularioCliente onGuardar={guardarCliente} onCancelar={() => setMostrarFormulario(false)} />}
  </div>;
}

function FormularioCliente({ onGuardar, onCancelar }: { onGuardar: (datos: DatosClienteNuevo) => Promise<string | null>; onCancelar: () => void }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  useDialogoFlotante(dialogoRef, true, onCancelar);
  const [tipoPersona, setTipoPersona] = useState<"NATURAL" | "JURIDICA">("NATURAL");
  const [tipoDocumento, setTipoDocumento] = useState<DatosClienteNuevo["tipoDocumento"]>("DNI");
  const [numeroDocumento, setNumeroDocumento] = useState(""); const [nombres, setNombres] = useState(""); const [apellidoPaterno, setApellidoPaterno] = useState(""); const [apellidoMaterno, setApellidoMaterno] = useState(""); const [razonSocial, setRazonSocial] = useState(""); const [nombreComercial, setNombreComercial] = useState(""); const [contactoNombre, setContactoNombre] = useState(""); const [correo, setCorreo] = useState(""); const [telefono, setTelefono] = useState(""); const [direccion, setDireccion] = useState(""); const [direccionEntrega, setDireccionEntrega] = useState(""); const [observacion, setObservacion] = useState("");
  const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  const [buscandoIdentidad, setBuscandoIdentidad] = useState(false);
  const esJuridica = tipoPersona === "JURIDICA";

  async function consultarIdentidad() {
    if (tipoDocumento !== "DNI" && tipoDocumento !== "RUC") return;
    setBuscandoIdentidad(true); setError("");
    try {
      const identidad = await servicioIngresos.consultarIdentidadCliente(tipoDocumento, numeroDocumento.trim());
      setTipoPersona(identidad.tipoPersona ?? "NATURAL");
      setRazonSocial(identidad.razonSocial ?? ""); setNombres(identidad.nombres ?? "");
      setApellidoPaterno(identidad.apellidoPaterno ?? ""); setApellidoMaterno(identidad.apellidoMaterno ?? "");
      setDireccion(identidad.direccion ?? "");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscandoIdentidad(false); }
  }

  async function submit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datos: DatosClienteNuevo = { tipoPersona, tipoDocumento, numeroDocumento: numeroDocumento.trim(), ...(esJuridica ? { razonSocial: razonSocial.trim() } : { nombres: nombres.trim(), apellidoPaterno: apellidoPaterno.trim(), apellidoMaterno: apellidoMaterno.trim() }), nombreComercial: nombreComercial.trim(), contactoNombre: contactoNombre.trim(), correo: correo.trim(), telefono: telefono.trim(), direccion: direccion.trim(), direccionEntrega: direccionEntrega.trim(), observacion: observacion.trim() };
    const errorGuardar = await onGuardar(datos); if (errorGuardar) setError(errorGuardar);
    setGuardando(false);
  }

  return <div className="clientes-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancelar(); }}><form ref={dialogoRef} className="clientes-modal" role="dialog" aria-modal="true" onSubmit={(e) => void submit(e)} aria-labelledby="clientes-form-title"><header><div><p className="page-eyebrow">CARTERA COMERCIAL</p><h2 id="clientes-form-title">Registrar cliente</h2></div><button type="button" aria-label="Cerrar" onClick={onCancelar}>×</button></header>
    <div className="clientes-form-grid">
      <label>Tipo de cliente<select value={tipoPersona} onChange={(e) => { const tipo = e.target.value as "NATURAL" | "JURIDICA"; setTipoPersona(tipo); setTipoDocumento(tipo === "JURIDICA" ? "RUC" : "DNI"); setNumeroDocumento(""); }}><option value="NATURAL">Persona natural</option><option value="JURIDICA">Empresa / organización</option></select></label>
      <label>Documento de identidad<select value={tipoDocumento} onChange={(e) => setTipoDocumento(e.target.value as DatosClienteNuevo["tipoDocumento"])}><option value="RUC">RUC</option>{!esJuridica && <><option value="DNI">DNI</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></>}</select></label>
      <label className="clientes-form-wide">Número de documento<span className="clientes-document-search"><input required inputMode={tipoDocumento === "DNI" || tipoDocumento === "RUC" ? "numeric" : "text"} value={numeroDocumento} maxLength={tipoDocumento === "DNI" ? 8 : tipoDocumento === "RUC" ? 11 : 20} onChange={(e) => setNumeroDocumento(tipoDocumento === "DNI" || tipoDocumento === "RUC" ? e.target.value.replace(/\D/g, "") : e.target.value)} />{(tipoDocumento === "DNI" || tipoDocumento === "RUC") && <button type="button" onClick={() => void consultarIdentidad()} disabled={buscandoIdentidad || (tipoDocumento === "DNI" ? numeroDocumento.length !== 8 : numeroDocumento.length !== 11)}>{buscandoIdentidad ? "Consultando…" : "Buscar"}</button>}</span></label>
      {esJuridica ? <label className="clientes-form-wide">Razón social<input required maxLength={180} value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} /></label> : <><label>Nombres<input required maxLength={120} value={nombres} onChange={(e) => setNombres(e.target.value)} /></label><label>Apellido paterno<input required maxLength={120} value={apellidoPaterno} onChange={(e) => setApellidoPaterno(e.target.value)} /></label><label>Apellido materno<input maxLength={120} value={apellidoMaterno} onChange={(e) => setApellidoMaterno(e.target.value)} /></label></>}
      <label className="clientes-form-wide">Nombre comercial o cómo identificarlo<input maxLength={180} value={nombreComercial} onChange={(e) => setNombreComercial(e.target.value)} placeholder="Opcional: nombre del negocio o referencia" /></label>
      <label>Persona de contacto<input maxLength={180} value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder={esJuridica ? "Compras, administración…" : "Opcional"} /></label>
      <label>Teléfono<input type="tel" maxLength={30} value={telefono} onChange={(e) => setTelefono(e.target.value)} /></label>
      <label className="clientes-form-wide">Correo electrónico<input type="email" maxLength={254} value={correo} onChange={(e) => setCorreo(e.target.value)} /></label>
      <label className="clientes-form-wide">Dirección fiscal<input maxLength={240} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></label>
      <label className="clientes-form-wide">Dirección de entrega<input maxLength={240} value={direccionEntrega} onChange={(e) => setDireccionEntrega(e.target.value)} /></label>
      <label className="clientes-form-wide">Nota interna<textarea maxLength={1000} rows={3} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Dato útil para futuras ventas" /></label>
    </div>{error && <p className="clientes-form-error" role="alert">{error}</p>}<footer><button className="clientes-secondary-action" type="button" onClick={onCancelar}>Cancelar</button><button className="clientes-primary-action" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar cliente"}</button></footer></form></div>;
}
