import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { servicioMototaxis, type UnidadMototaxi } from "../../services/mototaxis.service";

type Params = {
  guardando: boolean;
  setGuardando: Dispatch<SetStateAction<boolean>>;
  setError: (mensaje: string) => void;
  manejarError: (problema: unknown) => void;
  setExito: (mensaje: string) => void;
  cargar: () => Promise<void>;
};

export function useAjusteEstadoMototaxi({ guardando, setGuardando, setError, manejarError, setExito, cargar }: Params) {
  const [unidadAjuste, setUnidadAjuste] = useState<UnidadMototaxi | null>(null);
  const [estadoAjuste, setEstadoAjuste] = useState("GARANTIA");
  const [motivoAjuste, setMotivoAjuste] = useState("");
  const [observacionAjuste, setObservacionAjuste] = useState("");

  async function guardarAjuste(e: FormEvent) {
    e.preventDefault(); if (!unidadAjuste) return; setError(""); setGuardando(true);
    try { await servicioMototaxis.cambiarEstado(unidadAjuste.id, { estado: estadoAjuste, motivo: motivoAjuste, observacion: observacionAjuste }); setUnidadAjuste(null); setMotivoAjuste(""); setObservacionAjuste(""); setExito("Estado de la unidad actualizado."); await cargar(); }
    catch (e) { manejarError(e); } finally { setGuardando(false); }
  }

  function cerrarCambioEstado() { if (!guardando) setUnidadAjuste(null); }

  return { unidadAjuste, setUnidadAjuste, estadoAjuste, setEstadoAjuste, motivoAjuste, setMotivoAjuste, observacionAjuste, setObservacionAjuste, guardarAjuste, cerrarCambioEstado };
}
