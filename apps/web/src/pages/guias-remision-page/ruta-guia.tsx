import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { Circle, MapPin, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { servicioIngresos, type UbigeoPeru } from "../../services/ingresos.service";
import { claseCampoGuia, claseControlGuia, SeccionGuia } from "./campos-guia";

function PuntoTraslado({ tipo, ubigeos, departamentos, cargando }: { tipo: "partida" | "llegada"; ubigeos: UbigeoPeru[]; departamentos: string[]; cargando: boolean }) {
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const enDepartamento = ubigeos.filter((item) => item.departamento === departamento);
  const provincias = [...new Set(enDepartamento.map((item) => item.provincia))];
  const distritos = enDepartamento.filter((item) => item.provincia === provincia);

  return <section aria-labelledby={`guia-punto-${tipo}`} className="@container/punto grid min-w-0 content-start gap-3 rounded-md border border-border bg-muted p-3.5">
    <h3 id={`guia-punto-${tipo}`} className="flex items-center gap-2 text-sm font-bold">
      {tipo === "partida" ? <Circle size={14} className="text-primary" aria-hidden="true" /> : <MapPin size={16} className="text-destructive" aria-hidden="true" />}
      Punto de {tipo}
    </h3>
    <div className="grid min-w-0 gap-2.5 @[19rem]/punto:grid-cols-2 @[28rem]/punto:grid-cols-3">
      <label className={claseCampoGuia}>Departamento
        <select className={claseControlGuia} aria-label={`Departamento de ${tipo}`} value={departamento} required onChange={(evento) => { setDepartamento(evento.target.value); setProvincia(""); setDistrito(""); }}>
          <option value="">{cargando ? "Cargando…" : "Seleccionar"}</option>
          {departamentos.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className={claseCampoGuia}>Provincia
        <select className={claseControlGuia} aria-label={`Provincia de ${tipo}`} value={provincia} required disabled={!departamento} onChange={(evento) => { setProvincia(evento.target.value); setDistrito(""); }}>
          <option value="">Seleccionar</option>
          {provincias.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <label className={`${claseCampoGuia} @[19rem]/punto:col-span-full @[28rem]/punto:col-span-1`}>Distrito
        <select className={claseControlGuia} aria-label={`Distrito de ${tipo}`} name={`${tipo}Ubigeo`} value={distrito} required disabled={!provincia} onChange={(evento) => setDistrito(evento.target.value)}>
          <option value="">Seleccionar</option>
          {distritos.map((item) => <option key={item.codigo} value={item.codigo}>{item.distrito}</option>)}
        </select>
      </label>
    </div>
    <label className={claseCampoGuia}>Dirección de {tipo}
      <input className={claseControlGuia} name={`${tipo}Direccion`} maxLength={150} required />
    </label>
  </section>;
}

export function RutaGuia() {
  const [ubigeos, setUbigeos] = useState<UbigeoPeru[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let vigente = true;
    void servicioIngresos.listarUbigeos().then((items) => {
      if (vigente) setUbigeos(items);
    }).catch((problema: unknown) => {
      if (vigente) setError(problema instanceof Error ? problema.message : "No se pudieron cargar los ubigeos.");
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, []);

  const departamentos = [...new Set(ubigeos.map((item) => item.departamento))];
  return <SeccionGuia titulo="Ruta del traslado" icono={<Route />}>
    {error && <NotificacionFlotante mensaje={error} />}
    <div className="grid min-w-0 gap-3 @[43rem]:grid-cols-2">
      <PuntoTraslado tipo="partida" ubigeos={ubigeos} departamentos={departamentos} cargando={cargando} />
      <PuntoTraslado tipo="llegada" ubigeos={ubigeos} departamentos={departamentos} cargando={cargando} />
    </div>
  </SeccionGuia>;
}
