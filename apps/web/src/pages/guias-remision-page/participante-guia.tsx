import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ArrowRight, Check, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { servicioConductores, type Conductor, type DatosConductor } from "../../services/conductores.service";
import { servicioTransportistas } from "../../services/transportistas.service";
import { claseCampoGuia, claseControlGuia, claseOpcionGuia, claseResultadosGuia, evitarEnvioBusqueda } from "./campos-guia";
import { useBusquedaGuia } from "./use-busqueda-guia";

type Persona = { id: string };
type SelectorProps<T extends Persona> = {
  tipo: "transportista" | "conductor";
  placeholder: string;
  nombre: (persona: T) => string;
  datos: (persona: T) => string;
  buscar: (consulta: string) => Promise<T[]>;
  registro?: (seleccionar: (persona: T) => void) => ReactNode;
};

function SelectorPersonaGuia<T extends Persona>({ tipo, placeholder, nombre, datos, buscar, registro }: SelectorProps<T>) {
  const [seleccion, setSeleccion] = useState<T | null>(null);
  const [consulta, setConsulta] = useState("");
  const buscarActiva = !seleccion && (tipo === "conductor" || Boolean(consulta.trim()));
  const resultados = useBusquedaGuia(buscar, consulta, buscarActiva);

  function seleccionar(persona: T) {
    setSeleccion(persona);
  }

  if (seleccion) return <div className="flex flex-wrap items-center justify-between gap-2.5 self-start rounded-md border border-border bg-surface px-3 py-2.5">
    <input type="hidden" name={`${tipo}Id`} value={seleccion.id} />
    <div className="flex min-w-0 items-start gap-2.5">
      <Check size={17} className="mt-0.5 shrink-0 text-[#247251]" aria-hidden="true" />
      <div className="grid min-w-0 gap-0.5">
        <strong className="text-sm [overflow-wrap:anywhere]">{nombre(seleccion)}</strong>
        <span className="text-xs text-muted-foreground">{datos(seleccion)}</span>
      </div>
    </div>
    <Button variant="outline" size="sm" onClick={() => { setSeleccion(null); setConsulta(""); }}>Cambiar {tipo}</Button>
  </div>;

  return <div className="grid min-w-0 content-start gap-2.5">
    <label className={claseCampoGuia}>Buscar {tipo}
      <input className={claseControlGuia} type="search" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} onKeyDown={evitarEnvioBusqueda} placeholder={placeholder} />
    </label>
    {resultados.items.length > 0 && <div className={claseResultadosGuia}>
      {resultados.items.map((persona) => <button className={claseOpcionGuia} type="button" key={persona.id} onClick={() => seleccionar(persona)}>
        <span className="grid min-w-0 gap-0.5">
          <strong className="text-[13px] [overflow-wrap:anywhere]">{nombre(persona)}</strong>
          <span className="text-xs text-muted-foreground">{datos(persona)}</span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-primary" aria-hidden="true" />
      </button>)}
    </div>}
    {resultados.cargando && <p role="status" className="text-sm text-muted-foreground">Buscando…</p>}
    {buscarActiva && !resultados.cargando && !resultados.error && !resultados.items.length && <p className="text-sm text-muted-foreground">{consulta.trim() ? "No hay coincidencias." : `No hay registros de ${tipo}.`}</p>}
    {resultados.error && <NotificacionFlotante mensaje={resultados.error} />}
    {registro && <details className="rounded-md border border-dashed border-input bg-surface p-3">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-[13px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <UserPlus size={16} aria-hidden="true" />Registrar {tipo}
      </summary>
      {registro(seleccionar)}
    </details>}
  </div>;
}

function RegistroConductor({ alGuardar }: { alGuardar: (persona: Conductor) => void }) {
  const [datos, setDatos] = useState<DatosConductor>({ tipoDocumento: "DNI", numeroDocumento: "", nombres: "", apellidoPaterno: "", numeroLicencia: "" });
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

  return <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
    <label className={claseCampoGuia}>Tipo de documento
      <select className={claseControlGuia} value={datos.tipoDocumento} onChange={(evento) => setDatos({ ...datos, tipoDocumento: evento.target.value as Conductor["tipoDocumento"] })}>
        <option>DNI</option><option>CE</option><option>PASAPORTE</option>
      </select>
    </label>
    {([
      ["numeroDocumento", "Número de documento", 15],
      ["nombres", "Nombres", 120],
      ["apellidoPaterno", "Apellido paterno", 120],
      ["numeroLicencia", "Licencia", 10],
    ] as const).map(([campo, etiqueta, maximo]) => <label className={claseCampoGuia} key={campo}>{etiqueta}
      <input className={claseControlGuia} maxLength={maximo} value={datos[campo]} onChange={(evento) => setDatos({ ...datos, [campo]: evento.target.value })} />
    </label>)}
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <Button variant="secondary" size="sm" className="col-span-full justify-self-start" disabled={guardando} onClick={() => void registrar()}>{guardando ? "Guardando…" : "Guardar conductor"}</Button>
  </div>;
}

export function TransportistaGuia() {
  return <SelectorPersonaGuia
    tipo="transportista"
    placeholder="RUC o razón social"
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
    registro={(seleccionar) => <RegistroConductor alGuardar={seleccionar} />}
  />;
}
