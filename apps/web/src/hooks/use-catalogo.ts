import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import type { RegistroCatalogo, ServicioCatalogo, UsoMarca } from "../services/inventario/catalogos.service";

export function useCatalogo<T extends RegistroCatalogo>(servicio: ServicioCatalogo<T>, mensajeCarga: string) {
  const navegar = useNavigate();
  const [registros, setRegistros] = useState<T[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const manejarError = useCallback((problema: unknown, mensaje: string) => {
    if (problema instanceof ErrorApi && problema.estado === 401) {
      navegar("/login", { replace: true });
      return;
    }
    setError(problema instanceof Error ? problema.message : mensaje);
  }, [navegar]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const listado = await servicio.listar();
      setRegistros(listado);
      setError("");
    } catch (problema) {
      manejarError(problema, mensajeCarga);
    } finally {
      setCargando(false);
    }
  }, [servicio, manejarError, mensajeCarga]);

  useEffect(() => { void cargar(); }, [cargar]);

  const guardar = useCallback(async (
    datos: { nombre: string; id?: string; imagen?: File; uso?: UsoMarca },
    alCrear?: (registro: T) => void,
    alCompletar?: () => void,
  ) => {
    setError("");
    setGuardando(true);
    try {
      const registro = await servicio.guardar({ nombre: datos.nombre, ...(datos.id ? { id: datos.id } : {}), ...(datos.uso ? { uso: datos.uso } : {}) });
      if (!datos.id) alCrear?.(registro);
      if (datos.imagen) await servicio.subirImagen(registro.id, datos.imagen);
      await cargar();
      alCompletar?.();
      return true;
    } catch (problema) {
      manejarError(problema, "No se pudo guardar el registro.");
      return false;
    } finally {
      setGuardando(false);
    }
  }, [servicio, cargar, manejarError]);

  const cambiarEstado = useCallback(async (registro: T) => {
    setError("");
    try {
      await servicio.cambiarEstado(registro);
      await cargar();
    } catch (problema) {
      manejarError(problema, "No se pudo actualizar el estado.");
    }
  }, [servicio, cargar, manejarError]);

  return { registros, cargando, guardando, error, setError, guardar, cambiarEstado, recargar: cargar };
}
