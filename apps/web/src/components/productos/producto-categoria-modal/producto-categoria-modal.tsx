import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import type { FormEvent } from "react";
import { Dialogo } from "../../ui/dialogo/dialogo";

type PropiedadesProductoCategoriaModal = {
  nombre: string;
  guardando: boolean;
  error: string;
  alCambiarNombre: (valor: string) => void;
  alCrear: () => void;
  alCerrar: () => void;
};

export function ProductoCategoriaModal({ nombre, guardando, error, alCambiarNombre, alCrear, alCerrar }: PropiedadesProductoCategoriaModal) {
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    alCrear();
  }

  return (
    <Dialogo
      kicker="CATÁLOGO"
      titulo="Agregar categoría"
      ancho="sm"
      cerrable={!guardando}
      onCerrar={alCerrar}
      pie={
        <>
          <button className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" type="button" disabled={guardando} onClick={alCerrar}>Cancelar</button>
          <button className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" type="submit" form="producto-categoria-form" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar categoría"}
          </button>
        </>
      }
    >
      <p className="m-0 -mt-2 text-[13px] text-[#52697d]">Define el grupo en el catálogo.</p>
      <form id="producto-categoria-form" className="grid gap-4" onSubmit={manejarEnvio}>
        <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">
          Nombre de la categoría
          <input className="h-11 w-full rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42]" autoFocus value={nombre} onChange={(evento) => alCambiarNombre(evento.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Frenos" />
        </label>
      </form>
      {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo>
  );
}
