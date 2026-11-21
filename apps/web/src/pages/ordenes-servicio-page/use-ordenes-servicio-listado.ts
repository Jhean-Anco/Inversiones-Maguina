import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type OrdenServicio } from "../../services/ingresos.service";

export function useOrdenesServicioListado() {
  const navegar = useNavigate();
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarOrdenes = useCallback(async () => {
    setCargando(true);
    try {
      setOrdenes(await servicioIngresos.listarOrdenesServicio(busqueda));
      setError("");
    } catch (problema) {
      if (problema instanceof ErrorApi && problema.estado === 401) {
        navegar("/login", { replace: true });
        return;
      }
      setError(problema instanceof Error ? problema.message : "No se pudieron cargar las órdenes de servicio.");
    } finally {
      setCargando(false);
    }
  }, [busqueda, navegar]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargarOrdenes(), busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [busqueda, cargarOrdenes]);

  return { ordenes, setOrdenes, busqueda, setBusqueda, cargando, error, setError, cargarOrdenes };
}
