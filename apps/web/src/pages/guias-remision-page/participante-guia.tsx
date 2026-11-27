import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ArrowRight, Search, UserPlus, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { servicioConductores, type Conductor, type DatosConductor } from "../../services/conductores.service";
import { servicioTransportistas } from "../../services/transportistas.service";
import { claseCampoGuia, evitarEnvioBusqueda, SelectGuia } from "./campos-guia";
import { useBusquedaGuia } from "./use-busqueda-guia";

type Persona = { id: string };
type SelectorProps<T extends Persona> = {
  tipo: "transportista" | "conductor";
  placeholder: string;
  nombre: (persona: T) => string;
  datos: (persona: T) => string;
  buscar: (consulta: string) => Promise<T[]>;
  registro?: (texto: string, seleccionar: (persona: T) => void) => ReactNode;
};

const iniciales = (texto: string) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE");

function SelectorPersonaGuia<T extends Persona>({ tipo, placeholder, nombre, datos, buscar, registro }: SelectorProps<T>) {
  const [seleccion, setSeleccion] = useState<T | null>(null);
  const [consulta, setConsulta] = useState("");
  const [registrando, setRegistrando] = useState(false);
  const buscarActiva = !seleccion && (tipo === "conductor" || Boolean(consulta.trim()));
  const resultados = useBusquedaGuia(buscar, consulta, buscarActiva);
  const seleccionar = (persona: T) => { setSeleccion(persona); setRegistrando(false); };

  if (seleccion) return <div className="os-cliente-fijo es-editable">
    <input type="hidden" name={`${tipo}Id`} value={seleccion.id} />
    <span className="os-avatar" aria-hidden="true">{iniciales(nombre(seleccion))}</span>
    <span className="os-cliente-datos"><strong>{nombre(seleccion)}</strong><span>{datos(seleccion)}</span></span>
    <button type="button" className="os-cliente-cambiar" aria-label={`Cambiar ${tipo}`} title={`Cambiar ${tipo}`} onClick={() => { setSeleccion(null); setConsulta(""); }}><X aria-hidden="true" size={16} /></button>
  </div>;

  const sinResultados = buscarActiva && !resultados.cargando && !resultados.error && !resultados.items.length;
  return <div className="os-buscador">
    <span className="os-etiqueta">{tipo === "transportista" ? "Transportista *" : "Conductor *"}</span>
    <label className="os-buscador-campo">
      <Search aria-hidden="true" size={18} />
      <input type="search" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} onKeyDown={evitarEnvioBusqueda} placeholder={placeholder} aria-label={`Buscar ${tipo}`} />
    </label>
    {resultados.items.length > 0 && <div className="os-resultados" role="list">
      {resultados.items.map((persona) => <button className="os-resultado" role="listitem" type="button" key={persona.id} onClick={() => seleccionar(persona)}>
        <span className="os-resultado-datos"><strong>{nombre(persona)}</strong><small>{datos(persona)}</small></span>
        <ArrowRight aria-hidden="true" size={16} />
      </button>)}
    </div>}
    {resultados.cargando && <p role="status" className="os-ayuda">Buscando…</p>}
    {sinResultados && <p className="os-resultados-estado"><strong>{consulta.trim() ? `No encontramos «${consulta.trim()}»` : `No hay ${tipo === "conductor" ? "conductores" : "transportistas"} registrados`}</strong></p>}
    {resultados.error && <NotificacionFlotante mensaje={resultados.error} />}
    {registro && (registrando ? registro(consulta.trim(), seleccionar)
      : <button type="button" className="os-crear-repuesto" onClick={() => setRegistrando(true)}><UserPlus aria-hidden="true" size={16} />{consulta.trim() ? `Registrar conductor «${consulta.trim()}»` : "Registrar conductor"}</button>)}
  </div>;
}

function RegistroConductor({ texto, alGuardar }: { texto: string; alGuardar: (persona: Conductor) => void }) {
  const esDocumento = /^\d{6,15}$/.test(texto);
  const [datos, setDatos] = useState<DatosConductor>({ tipoDocumento: "DNI", numeroDocumento: esDocumento ? texto : "", nombres: esDocumento ? "" : texto, apellidoPaterno: "", numeroLicencia: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function registrar() {
    setError("");
    if ([datos.numeroDocumento, datos.nombres, datos.apellidoPaterno, datos.numeroLicencia].some((valor) => !valor.trim())) {
      setError("Completa los datos requeridos para registrar al conductor.");
      return;
    }
    setGuardando(true);
    try { alGuardar(await servicioConductores.crear(datos)); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo registrar el conductor."); }
    finally { setGuardando(false); }
  }

  return <div className="os-revision guia-registro">
    <span className="os-revision-titulo"><UserPlus aria-hidden="true" size={16} />Nuevo conductor</span>
    <div className="os-campos guia-campos-dos">
      <label className={claseCampoGuia}>Tipo de documento *
        <SelectGuia value={datos.tipoDocumento} onChange={(evento) => setDatos({ ...datos, tipoDocumento: evento.target.value as Conductor["tipoDocumento"] })}>
          <option>DNI</option><option>CE</option><option>PASAPORTE</option>
        </SelectGuia>
      </label>
      {([
        ["numeroDocumento", "Número de documento", 15],
        ["nombres", "Nombres", 120],
        ["apellidoPaterno", "Apellido paterno", 120],
        ["numeroLicencia", "Licencia", 10],
      ] as const).map(([campo, etiqueta, maximo]) => <label className={claseCampoGuia} key={campo}>{etiqueta} *
        <input maxLength={maximo} value={datos[campo]} onChange={(evento) => setDatos({ ...datos, [campo]: evento.target.value })} />
      </label>)}
    </div>
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <button type="button" className="os-boton-oscuro guia-guardar-conductor" disabled={guardando} onClick={() => void registrar()}>{guardando ? "Guardando…" : "Guardar conductor"}</button>
  </div>;
}

export function TransportistaGuia() {
  return <SelectorPersonaGuia
    tipo="transportista"
    placeholder="RUC o razón social (ej. 20601234567)"
    buscar={servicioTransportistas.listar}
    nombre={(persona) => persona.nombre}
    datos={(persona) => `RUC ${persona.numeroDocumento}`}
  />;
}

export function ConductorGuia() {
  return <SelectorPersonaGuia
    tipo="conductor"
    placeholder="Nombre, documento o licencia"
    buscar={servicioConductores.listar}
    nombre={(persona) => [persona.nombres, persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(" ")}
    datos={(persona) => `${persona.tipoDocumento} ${persona.numeroDocumento} · Licencia ${persona.numeroLicencia}`}
    registro={(texto, seleccionar) => <RegistroConductor texto={texto} alGuardar={seleccionar} />}
  />;
}
