import "./datos-emisor-page.css";
import { useEffect, useState, type FormEvent } from "react";
import { servicioFacturacionElectronica, type DatosEmisor, type EstadoFacturacion } from "../../../services/facturacion-electronica.service";

const vacio: DatosEmisor = { ruc: "", razonSocial: "", nombreComercial: "", domicilioFiscal: "", ubigeo: "", urbanizacion: "", distrito: "", provincia: "", departamento: "", correo: "", telefono: "", logoUrl: "" };

export function DatosEmisorPage() {
  const [datos, setDatos] = useState<DatosEmisor>(vacio);
  const [estado, setEstado] = useState<EstadoFacturacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  useEffect(() => {
    let vigente = true;
    void servicioFacturacionElectronica.consultarEmisor().then((respuesta) => {
      if (!vigente) return;
      if (respuesta.emisor) setDatos({ ...vacio, ...respuesta.emisor });
      setEstado(respuesta.integracion);
    }).catch((problema) => setError(problema instanceof Error ? problema.message : "No se pudo cargar la configuración del emisor."))
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  function actualizar(campo: keyof DatosEmisor, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setError(""); setExito("");
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setGuardando(true); setError(""); setExito("");
    try {
      const respuesta = await servicioFacturacionElectronica.guardarEmisor(datos);
      if (respuesta.emisor) setDatos({ ...vacio, ...respuesta.emisor });
      setEstado(respuesta.integracion);
      setExito("Datos del emisor guardados.");
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudieron guardar los datos del emisor."); }
    finally { setGuardando(false); }
  }

  if (cargando) return <section className="emisor-page emisor-loading" role="status">Cargando la configuración del emisor…</section>;
  return <section className="emisor-page">
    <header className="emisor-heading"><div><span className="emisor-kicker">FACTURACIÓN</span><h1>Datos del emisor</h1><p>Identificación del negocio que aparecerá en las boletas emitidas por NubeFact.</p></div>{estado && <span className={`emisor-environment${estado.ambiente === "PRODUCCION" ? " is-production" : ""}`}>NUBEFACT · {estado.ambiente}</span>}</header>
    {estado && <aside className={`emisor-status${estado.emisionHabilitada ? " is-ready" : ""}`} role="status"><strong>{estado.emisionHabilitada ? "Configuración lista para emitir" : "Configuración pendiente"}</strong><span>{estado.emisionHabilitada ? "NubeFact y el emisor están configurados." : `NubeFact: ${estado.credencialesConfiguradas ? "conectado" : "faltan las credenciales"} · Serie: ${estado.seriesConfiguradas ? "configurada" : "pendiente"} · Emisor: ${estado.emisorConfigurado ? "registrado" : "pendiente"}.`}</span></aside>}
    <aside className="emisor-info"><strong>Usa los datos de la Ficha RUC</strong><span>El RUC, la razón social y el domicilio fiscal deben coincidir con los datos registrados para este emisor.</span></aside>
    {error && <p className="emisor-message is-error" role="alert">{error}</p>}{exito && <p className="emisor-message is-success" role="status">{exito}</p>}
    <form onSubmit={(evento) => void guardar(evento)} className="emisor-card">
      <div className="emisor-grid">
        <label>RUC del emisor<input required inputMode="numeric" maxLength={11} value={datos.ruc} onChange={(evento) => actualizar("ruc", evento.target.value.replace(/\D/g, ""))} autoComplete="off" /></label>
        <label>Razón social<input required maxLength={180} value={datos.razonSocial} onChange={(evento) => actualizar("razonSocial", evento.target.value)} autoComplete="organization" /></label>
        <label>Nombre comercial <small>Opcional</small><input maxLength={180} value={datos.nombreComercial ?? ""} onChange={(evento) => actualizar("nombreComercial", evento.target.value)} /></label>
        <label className="emisor-wide">Domicilio fiscal<input required maxLength={240} value={datos.domicilioFiscal} onChange={(evento) => actualizar("domicilioFiscal", evento.target.value)} autoComplete="street-address" /></label>
        <label>Ubigeo<input inputMode="numeric" maxLength={6} value={datos.ubigeo ?? ""} onChange={(evento) => actualizar("ubigeo", evento.target.value.replace(/\D/g, ""))} /></label>
        <label>Urbanización<input maxLength={100} value={datos.urbanizacion ?? ""} onChange={(evento) => actualizar("urbanizacion", evento.target.value)} /></label>
        <label>Distrito<input maxLength={100} value={datos.distrito ?? ""} onChange={(evento) => actualizar("distrito", evento.target.value)} /></label>
        <label>Provincia<input maxLength={100} value={datos.provincia ?? ""} onChange={(evento) => actualizar("provincia", evento.target.value)} /></label>
        <label>Departamento<input maxLength={100} value={datos.departamento ?? ""} onChange={(evento) => actualizar("departamento", evento.target.value)} /></label>
        <label>Correo<input type="email" maxLength={254} value={datos.correo ?? ""} onChange={(evento) => actualizar("correo", evento.target.value)} autoComplete="email" /></label>
        <label>Teléfono<input type="tel" maxLength={30} value={datos.telefono ?? ""} onChange={(evento) => actualizar("telefono", evento.target.value)} autoComplete="tel" /></label>
        <label className="emisor-wide">Logo · URL HTTPS<input type="url" value={datos.logoUrl ?? ""} onChange={(evento) => actualizar("logoUrl", evento.target.value)} placeholder="https://…" /></label>
      </div>
      <footer><button className="catalog-submit" type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar datos del emisor"}</button></footer>
    </form>
  </section>;
}
