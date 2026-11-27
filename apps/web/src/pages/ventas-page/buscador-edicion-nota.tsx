import { useEffect, useRef, useState } from "react";

type Props<T> = {
  etiqueta: string;
  buscar: (texto: string) => Promise<T[]>;
  describir: (resultado: T) => { id: string; titulo: string; detalle: string };
  onElegir: (resultado: T) => void;
};

/** Búsqueda breve para elegir un cliente, repuesto o modelo; los resultados son botones, operables con teclado. */
export function BuscadorEdicionNota<T>({ etiqueta, buscar, describir, onElegir }: Props<T>) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState<T[]>([]);
  const [aviso, setAviso] = useState("");
  // `buscar` cambia en cada render del diálogo; solo el texto debe disparar una consulta nueva.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    const consulta = texto.trim();
    setResultados([]); setAviso("");
    if (consulta.length < 4) return;
    let vigente = true;
    setAviso("Buscando...");
    const espera = window.setTimeout(() => {
      void buscarRef.current(consulta)
        .then((datos) => { if (vigente) { setResultados(datos); setAviso(datos.length ? "" : "Sin coincidencias."); } })
        .catch((problema: unknown) => { if (vigente) setAviso(problema instanceof Error ? problema.message : "No se pudo buscar."); });
    }, 220);
    return () => { vigente = false; window.clearTimeout(espera); };
  }, [texto]);

  return <div className="grid min-w-0 gap-1.5">
    <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">{etiqueta}
      <input type="search" className="h-11 w-full min-w-0 rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42]" value={texto} placeholder="Escribe al menos 4 caracteres"
        onChange={(evento) => setTexto(evento.target.value)} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
    </label>
    {aviso && <p className="m-0 text-xs text-[#52697d]" role="status">{aviso}</p>}
    {resultados.length > 0 && <ul className="m-0 grid max-h-48 list-none gap-1 overflow-y-auto p-0">
      {resultados.map((resultado) => {
        const { id, titulo, detalle } = describir(resultado);
        return <li key={id}><button type="button" className="w-full rounded-lg border border-[#d8e3ee] bg-white px-3 py-2 text-left text-sm text-[#173554] hover:bg-[#f6f9fc]"
          onClick={() => { onElegir(resultado); setTexto(""); }}><strong className="block">{titulo}</strong><small className="text-[#52697d]">{detalle}</small></button></li>;
      })}
    </ul>}
  </div>;
}
