import { Search, UserPlus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { servicioIdentidad } from "../../services/identidad.service";
import { servicioMototaxis, type ProveedorMototaxi } from "../../services/mototaxis.service";

const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "P";
const proveedorVacio = (numeroDocumento = "") => ({
  tipoDocumento: numeroDocumento.length === 8 ? "DNI" : "RUC", numeroDocumento, razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "", nombreComercial: "",
});
const campo = "grid gap-1.5 text-xs font-bold text-[#52697d]";
const entrada = "h-11 rounded-xl border border-[#c5d1db] px-3 text-sm";

type Props = {
  proveedores: ProveedorMototaxi[];
  proveedorId: string;
  alElegir: (id: string) => void;
  alCrear: (proveedor: ProveedorMototaxi) => void;
  alError: (mensaje: string) => void;
};

/** Proveedor de la compra con la base `os-*`: buscador, resultados, alta rápida con lo escrito y proveedor fijado. */
export function ProveedorCompraMototaxi({ proveedores, proveedorId, alElegir, alCrear, alError }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [nuevo, setNuevo] = useState<ReturnType<typeof proveedorVacio> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const proveedor = proveedores.find((item) => item.id === proveedorId);
  const termino = busqueda.trim().toLocaleLowerCase();
  const encontrados = termino ? proveedores.filter((item) => `${item.nombre} ${item.tipoDocumento} ${item.numeroDocumento}`.toLocaleLowerCase().includes(termino)).slice(0, 8) : [];
  const longitud = nuevo?.tipoDocumento === "RUC" ? 11 : 8;

  function abrirAlta() {
    const digitos = busqueda.replace(/\D/g, "");
    setNuevo(proveedorVacio(digitos.length === 8 || digitos.length === 11 ? digitos : ""));
  }

  async function consultarDocumento() {
    if (!nuevo) return;
    if (nuevo.numeroDocumento.length !== longitud) { alError(`Ingresa los ${longitud} dígitos del ${nuevo.tipoDocumento}.`); return; }
    setConsultando(true);
    try {
      const identidad = await servicioIdentidad.consultar(nuevo.tipoDocumento as "DNI" | "RUC", nuevo.numeroDocumento);
      setNuevo((actual) => actual && ({ ...actual, razonSocial: identidad.razonSocial ?? "", nombres: identidad.nombres ?? "", apellidoPaterno: identidad.apellidoPaterno ?? "", apellidoMaterno: identidad.apellidoMaterno ?? "", nombreComercial: actual.nombreComercial || identidad.razonSocial || "" }));
    } catch (problema) { alError(problema instanceof Error ? problema.message : "No se pudo consultar el documento del proveedor."); }
    finally { setConsultando(false); }
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    if (!nuevo) return;
    setGuardando(true);
    try {
      const creado = await servicioMototaxis.crearProveedor(nuevo);
      alCrear(creado);
      setBusqueda(""); setNuevo(null);
    } catch (problema) { alError(problema instanceof Error ? problema.message : "No se pudo registrar el proveedor."); }
    finally { setGuardando(false); }
  }

  const dialogo = nuevo && <Dialogo kicker="NUEVO PROVEEDOR" titulo="Agregar proveedor" subtitulo="Completa sus datos para usarlo en esta compra." ancho="md"
    cerrable={!guardando} onCerrar={() => setNuevo(null)}
    pie={<>
      <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" onClick={() => setNuevo(null)}>Cancelar</button>
      <button type="submit" form="moto-provider-form" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={guardando || consultando}><UserPlus aria-hidden="true" size={16} />Guardar y usar en esta compra</button>
    </>}>
    <form id="moto-provider-form" className="grid grid-cols-1 gap-3.5 sm:grid-cols-2" onSubmit={(evento) => void guardar(evento)}>
      <label className={campo}>Tipo de documento
        <select className={entrada} disabled={consultando} value={nuevo.tipoDocumento} onChange={(evento) => setNuevo({ ...proveedorVacio(), tipoDocumento: evento.target.value })}>
          <option value="RUC">RUC</option><option value="DNI">DNI</option>
        </select>
      </label>
      <label className={campo}>{nuevo.tipoDocumento} del proveedor
        <span className="flex gap-2">
          <input className={`${entrada} min-w-0 flex-1`} required disabled={consultando} inputMode="numeric" maxLength={longitud} value={nuevo.numeroDocumento}
            onChange={(evento) => setNuevo({ ...nuevo, numeroDocumento: evento.target.value.replace(/\D/g, "").slice(0, longitud), razonSocial: "", nombres: "", apellidoPaterno: "", apellidoMaterno: "" })} />
          <button type="button" className="h-11 rounded-xl border border-[#c7d8e7] bg-[#f4f8fb] px-3 text-sm font-bold text-[#174f88] disabled:opacity-50"
            disabled={consultando || nuevo.numeroDocumento.length !== longitud} onClick={() => void consultarDocumento()}>{consultando ? "Consultando…" : "Buscar"}</button>
        </span>
      </label>
      {nuevo.tipoDocumento === "RUC" && nuevo.numeroDocumento.startsWith("20")
        ? <label className={`${campo} sm:col-span-2`}>Razón social<input className={entrada} required maxLength={180} value={nuevo.razonSocial} onChange={(evento) => setNuevo({ ...nuevo, razonSocial: evento.target.value })} /></label>
        : <>
          <label className={campo}>Nombres<input className={entrada} required maxLength={120} value={nuevo.nombres} onChange={(evento) => setNuevo({ ...nuevo, nombres: evento.target.value })} /></label>
          <label className={campo}>Apellido paterno<input className={entrada} required maxLength={120} value={nuevo.apellidoPaterno} onChange={(evento) => setNuevo({ ...nuevo, apellidoPaterno: evento.target.value })} /></label>
          <label className={campo}>Apellido materno<input className={entrada} maxLength={120} value={nuevo.apellidoMaterno} onChange={(evento) => setNuevo({ ...nuevo, apellidoMaterno: evento.target.value })} /></label>
        </>}
      <label className={`${campo} sm:col-span-2`}>Nombre comercial (opcional)<input className={entrada} maxLength={180} value={nuevo.nombreComercial} onChange={(evento) => setNuevo({ ...nuevo, nombreComercial: evento.target.value })} /></label>
    </form>
  </Dialogo>;

  if (proveedor) return <div className="os-cliente">
    <div className="os-cliente-fijo es-editable">
      <span className="os-avatar" aria-hidden="true">{iniciales(proveedor.nombre)}</span>
      <div className="os-cliente-datos"><strong>{proveedor.nombre}</strong><span>{proveedor.tipoDocumento} {proveedor.numeroDocumento}</span></div>
      <button className="os-cliente-cambiar" type="button" aria-label="Cambiar proveedor" title="Cambiar proveedor" onClick={() => alElegir("")}><X aria-hidden="true" size={18} /></button>
    </div>
  </div>;

  return <div className="os-cliente">
    <div className="os-cliente-buscador">
      <div className="os-cliente-fila">
        <label className="os-buscador-campo compra-moto-proveedor-busqueda">
          <Search aria-hidden="true" size={18} strokeWidth={2} />
          <input id="compra-moto-proveedor" type="search" aria-label="Buscar proveedor" autoComplete="off" value={busqueda} placeholder="Nombre, RUC o DNI del proveedor"
            onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} onChange={(evento) => setBusqueda(evento.target.value)} />
        </label>
        <button className="os-boton-icono" type="button" aria-label="Agregar proveedor" title="Agregar proveedor" onClick={abrirAlta}><UserPlus aria-hidden="true" size={20} strokeWidth={1.9} /></button>
      </div>
      {termino && (encontrados.length ? <ul className="os-cliente-resultados" aria-label="Proveedores encontrados">
        {encontrados.map((item) => <li key={item.id}><button type="button" onClick={() => { alElegir(item.id); setBusqueda(""); }}>
          <strong>{item.nombre}</strong><small>{item.tipoDocumento} · {item.numeroDocumento}</small>
        </button></li>)}
      </ul> : <div className="os-resultados-estado"><strong>No encontramos este proveedor</strong><span>Regístralo con los datos del comprobante.</span>
        <button className="os-crear-repuesto" type="button" onClick={abrirAlta}><UserPlus aria-hidden="true" size={16} />Registrar proveedor «{busqueda.trim()}»</button>
      </div>)}
    </div>
    {dialogo}
  </div>;
}
