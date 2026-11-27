import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

type Props<T> = {
  etiqueta: string;
  placeholder?: string;
  buscar: (texto: string) => Promise<T[]>;
  describir: (resultado: T) => { id: string; titulo: string; detalle: string; precio?: string };
  onElegir: (resultado: T) => void;
};

/** Búsqueda breve para elegir un cliente, repuesto o modelo, con el estilo `os-buscador` de Órdenes de servicio. */
export function BuscadorEdicionNota<T>({ etiqueta, placeholder, buscar, describir, onElegir }: Props<T>) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<T[]>([]);
  const [aviso, setAviso] = useState("");
  // `buscar` cambia en cada render; solo el texto debe disparar una consulta nueva.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    const consulta = texto.trim();
    setResultados([]); setAviso("");
    if (!consulta) return;
    if (consulta.length < 4) { setAviso("Escribe al menos cuatro caracteres para buscar."); return; }
    let vigente = true;
    setAviso("Buscando…");
    const espera = window.setTimeout(() => {
      void buscarRef.current(consulta)
        .then((datos) => { if (vigente) { setResultados(datos); setAviso(datos.length ? "" : `No encontramos «${consulta}».`); } })
        .catch((problema: unknown) => { if (vigente) setAviso(problema instanceof Error ? problema.message : "No se pudo buscar."); });
    }, 220);
    return () => { vigente = false; window.clearTimeout(espera); };
  }, [texto]);

  return <div className="os-buscador">
    <label className="os-buscador-campo">
      <Search aria-hidden="true" size={18} strokeWidth={2} />
      <input type="search" value={texto} placeholder={placeholder ?? "Escribe al menos 4 caracteres"} aria-label={etiqueta} autoComplete="off"
        onChange={(evento) => setTexto(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
    </label>
    {(aviso || resultados.length > 0) && <div className="os-resultados" aria-live="polite">
      {aviso ? <p className="os-resultados-estado">{aviso}</p> : resultados.map((resultado) => {
        const { id, titulo, detalle, precio } = describir(resultado);
        return <button className="os-resultado" key={id} type="button" onClick={() => { onElegir(resultado); setTexto(""); }}>
          <span className="os-resultado-datos"><strong>{titulo}</strong><small>{detalle}</small></span>
          {precio && <strong className="os-resultado-precio">{precio}</strong>}
        </button>;
      })}
    </div>}
  </div>;
}
