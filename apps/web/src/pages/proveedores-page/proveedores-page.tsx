import "./proveedores-page.css";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIdentidad } from "../../services/identidad.service";
import { servicioProveedores, type DatosProveedorNuevo, type ProveedorRegistrado } from "../../services/proveedores.service";

const nombreDe = (proveedor: ProveedorRegistrado) => proveedor.nombre || proveedor.razonSocial || [proveedor.nombres, proveedor.apellidoPaterno, proveedor.apellidoMaterno].filter(Boolean).join(" ");

export function ProveedoresPage({ puedeCrear }: { puedeCrear: boolean }) {
  const navegar = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorRegistrado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const cargar = useCallback(async () => {
    setCargando(true);
    try { setProveedores(await servicioProveedores.listar(busqueda)); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio."); }
    finally { setCargando(false); }
  }, [busqueda, navegar]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), 180); return () => window.clearTimeout(timer); }, [cargar]);

  async function guardar(datos: DatosProveedorNuevo) {
    try { await servicioProveedores.crear(datos); setAbierto(false); setExito("Proveedor registrado y disponible para las compras."); await cargar(); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo registrar el proveedor."; }
  }

  return <section className="proveedores-page">
    <header className="proveedores-heading"><div><span className="proveedores-kicker">CONTACTOS COMERCIALES</span><h1>Proveedores</h1><p>Directorio compartido con las compras de productos y mototaxis.</p></div>{puedeCrear && <button type="button" className="proveedores-primary erp-floating-action" aria-label="Registrar proveedor" title="Registrar proveedor" onClick={() => { setError(""); setAbierto(true); }}><span className="erp-floating-action-icon" aria-hidden="true">+</span><span className="erp-floating-action-label">Registrar proveedor</span></button>}</header>
    {error && <div className="proveedores-alert" role="alert">{error}</div>}{exito && <div className="proveedores-success" role="status">{exito}<button type="button" aria-label="Cerrar" onClick={() => setExito("")}>×</button></div>}
    <div className="proveedores-toolbar"><label htmlFor="proveedores-search">Buscar por nombre o documento</label><input id="proveedores-search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Nombre, DNI o RUC" /><span>{proveedores.length} proveedores</span></div>
    {cargando ? <div className="proveedores-empty">Cargando directorio…</div> : proveedores.length ? <div className="proveedores-grid">{proveedores.map((proveedor) => <article className="proveedores-card" key={proveedor.id}><span className="proveedores-avatar">{nombreDe(proveedor).slice(0, 1).toLocaleUpperCase("es-PE")}</span><div><h2>{nombreDe(proveedor)}</h2><p>{proveedor.tipoDocumento} · {proveedor.numeroDocumento}</p>{proveedor.razonSocial && proveedor.nombre !== proveedor.razonSocial && <small>{proveedor.razonSocial}</small>}</div><span className="proveedores-tag">Proveedor</span></article>)}</div> : <div className="proveedores-empty"><strong>{busqueda ? "No hay coincidencias" : "Aún no hay proveedores registrados"}</strong><span>Los proveedores registrados aquí también estarán disponibles al registrar compras.</span></div>}
    {abierto && <FormularioProveedor onGuardar={guardar} onCerrar={() => setAbierto(false)} />}
  </section>;
}

function FormularioProveedor({ onGuardar, onCerrar }: { onGuardar: (datos: DatosProveedorNuevo) => Promise<string | null>; onCerrar: () => void }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  useDialogoFlotante(dialogoRef, true, onCerrar);
  const [tipoDocumento, setTipoDocumento] = useState<"DNI" | "RUC">("RUC");
  const [numeroDocumento, setNumeroDocumento] = useState(""); const [razonSocial, setRazonSocial] = useState(""); const [nombres, setNombres] = useState(""); const [apellidoPaterno, setApellidoPaterno] = useState(""); const [apellidoMaterno, setApellidoMaterno] = useState(""); const [nombreComercial, setNombreComercial] = useState("");
  const [buscando, setBuscando] = useState(false); const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  const esJuridica = tipoDocumento === "RUC" && numeroDocumento.startsWith("20");
  async function buscarIdentidad() {
    setBuscando(true); setError("");
    try { const identidad = await servicioIdentidad.consultar(tipoDocumento, numeroDocumento); setRazonSocial(identidad.razonSocial ?? ""); setNombres(identidad.nombres ?? ""); setApellidoPaterno(identidad.apellidoPaterno ?? ""); setApellidoMaterno(identidad.apellidoMaterno ?? ""); if (identidad.razonSocial && !nombreComercial) setNombreComercial(identidad.razonSocial); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscando(false); }
  }
  async function submit(evento: FormEvent) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datos: DatosProveedorNuevo = { tipoDocumento, numeroDocumento, ...(esJuridica ? { razonSocial } : { nombres, apellidoPaterno, apellidoMaterno }), nombreComercial };
    const resultado = await onGuardar(datos); if (resultado) setError(resultado); setGuardando(false);
  }
  return <div className="proveedores-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onCerrar(); }}><form ref={dialogoRef} className="proveedores-form" role="dialog" aria-modal="true" aria-labelledby="proveedor-form-title" onSubmit={(evento) => void submit(evento)}><header><div><span className="proveedores-kicker">DIRECTORIO COMERCIAL</span><h2 id="proveedor-form-title">Registrar proveedor</h2></div><button type="button" aria-label="Cerrar" onClick={onCerrar}>×</button></header>
    <div className="proveedores-fields"><label>Documento<select disabled={buscando} value={tipoDocumento} onChange={(evento) => { setTipoDocumento(evento.target.value as "DNI" | "RUC"); setNumeroDocumento(""); setRazonSocial(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno(""); }}><option value="RUC">RUC</option><option value="DNI">DNI</option></select></label><label className="proveedores-document">Número de documento<div><input required disabled={buscando} inputMode="numeric" maxLength={tipoDocumento === "DNI" ? 8 : 11} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{11}"} value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value.replace(/\D/g, ""))} /><button type="button" disabled={buscando || numeroDocumento.length !== (tipoDocumento === "DNI" ? 8 : 11)} onClick={() => void buscarIdentidad()}>{buscando ? "Buscando…" : "Buscar"}</button></div></label>
      {esJuridica ? <label className="proveedores-wide">Razón social<input required maxLength={180} value={razonSocial} onChange={(evento) => setRazonSocial(evento.target.value)} /></label> : <><label>Nombres<input required maxLength={120} value={nombres} onChange={(evento) => setNombres(evento.target.value)} /></label><label>Apellido paterno<input required maxLength={120} value={apellidoPaterno} onChange={(evento) => setApellidoPaterno(evento.target.value)} /></label><label>Apellido materno<input maxLength={120} value={apellidoMaterno} onChange={(evento) => setApellidoMaterno(evento.target.value)} /></label></>}
      <label className="proveedores-wide">Nombre comercial<input maxLength={180} value={nombreComercial} onChange={(evento) => setNombreComercial(evento.target.value)} placeholder="Opcional" /></label>
    </div>{error && <p className="proveedores-alert" role="alert">{error}</p>}<footer><button type="button" onClick={onCerrar}>Cancelar</button><button type="submit" className="proveedores-primary" disabled={guardando}>{guardando ? "Guardando…" : "Guardar proveedor"}</button></footer></form></div>;
}
