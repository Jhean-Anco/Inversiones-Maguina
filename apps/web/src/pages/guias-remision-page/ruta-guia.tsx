import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { Circle, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { servicioIngresos, type UbigeoPeru } from "../../services/ingresos.service";
import { claseCampoGuia, SeccionGuia, SelectGuia } from "./campos-guia";

function PuntoTraslado({ tipo, ubigeos, departamentos, cargando }: { tipo: "partida" | "llegada"; ubigeos: UbigeoPeru[]; departamentos: string[]; cargando: boolean }) {
  const [departamento, setDepartamento] = useState("");
  const [provincia, setProvincia] = useState("");
  const [distrito, setDistrito] = useState("");
  const enDepartamento = ubigeos.filter((item) => item.departamento === departamento);
  const provincias = [...new Set(enDepartamento.map((item) => item.provincia))];
  const distritos = enDepartamento.filter((item) => item.provincia === provincia);

  return <div className="os-revision guia-punto" role="group" aria-labelledby={`guia-punto-${tipo}`}>
    <span id={`guia-punto-${tipo}`} className="os-revision-titulo">
      {tipo === "partida" ? <Circle aria-hidden="true" size={14} /> : <MapPin aria-hidden="true" size={16} />}Punto de {tipo}
    </span>
    <div className="guia-ubigeo">
      <label className={claseCampoGuia}>Departamento *
        <SelectGuia aria-label={`Departamento de ${tipo}`} value={departamento} required onChange={(evento) => { setDepartamento(evento.target.value); setProvincia(""); setDistrito(""); }}>
          <option value="">{cargando ? "Cargando…" : "Seleccionar"}</option>
          {departamentos.map((item) => <option key={item}>{item}</option>)}
        </SelectGuia>
      </label>
      <label className={claseCampoGuia}>Provincia *
        <SelectGuia aria-label={`Provincia de ${tipo}`} value={provincia} required disabled={!departamento} onChange={(evento) => { setProvincia(evento.target.value); setDistrito(""); }}>
          <option value="">Seleccionar</option>
          {provincias.map((item) => <option key={item}>{item}</option>)}
        </SelectGuia>
      </label>
      <label className={claseCampoGuia}>Distrito *
        <SelectGuia aria-label={`Distrito de ${tipo}`} name={`${tipo}Ubigeo`} value={distrito} required disabled={!provincia} onChange={(evento) => setDistrito(evento.target.value)}>
          <option value="">Seleccionar</option>
          {distritos.map((item) => <option key={item.codigo} value={item.codigo}>{item.distrito}</option>)}
        </SelectGuia>
      </label>
    </div>
    <label className={claseCampoGuia}>Dirección de {tipo} *
      <input name={`${tipo}Direccion`} maxLength={150} placeholder={tipo === "partida" ? "Ej. Jr. Ica 380, Huancayo" : "Ej. Av. Ferrocarril 1020, El Tambo"} required />
    </label>
  </div>;
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
  return <SeccionGuia paso={4} id="guia-titulo-ruta" titulo="Ruta del traslado">
    {error && <NotificacionFlotante mensaje={error} />}
    <div className="guia-ruta">
      <PuntoTraslado tipo="partida" ubigeos={ubigeos} departamentos={departamentos} cargando={cargando} />
      <PuntoTraslado tipo="llegada" ubigeos={ubigeos} departamentos={departamentos} cargando={cargando} />
    </div>
  </SeccionGuia>;
}
