import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type CompraMototaxi, type GarantiaMototaxi, type MarcaMototaxi, type ModeloMototaxi, type ProveedorMototaxi, type ReclamoGarantia } from "../../services/mototaxis.service";

export type SeccionMototaxis = "compras" | "garantias" | "movimientos";

export function useDatosMototaxis({ seccion, busquedaCompras }: { seccion: SeccionMototaxis; busquedaCompras: string }) {
  const navegar = useNavigate();
  const [marcas, setMarcas] = useState<MarcaMototaxi[]>([]);
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorMototaxi[]>([]);
  const [garantias, setGarantias] = useState<GarantiaMototaxi[]>([]);
  const [reclamos, setReclamos] = useState<ReclamoGarantia[]>([]);
  const [compras, setCompras] = useState<CompraMototaxi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const manejarError = useCallback((problema: unknown) => {
    if (problema instanceof ErrorApi && problema.estado === 401) {
      navegar("/login", { replace: true });
      return;
    }
    setError(problema instanceof Error ? problema.message : "No se pudo completar la operación.");
  }, [navegar]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      if (seccion === "compras") {
        const [marcasActuales, modelosActuales, proveedoresActuales, comprasActuales] = await Promise.all([
          servicioMototaxis.marcas(), servicioMototaxis.modelos(), servicioMototaxis.proveedores(), servicioMototaxis.compras(busquedaCompras),
        ]);
        setMarcas(marcasActuales); setModelos(modelosActuales); setProveedores(proveedoresActuales); setCompras(comprasActuales);
      } else if (seccion === "garantias") {
        const [garantiasActuales, reclamosActuales] = await Promise.all([servicioMototaxis.garantias(), servicioMototaxis.reclamos()]);
        setGarantias(garantiasActuales); setReclamos(reclamosActuales);
      }
    } catch (problema) {
      manejarError(problema);
    } finally {
      setCargando(false);
    }
  }, [busquedaCompras, manejarError, seccion]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), busquedaCompras ? 250 : 0);
    return () => window.clearTimeout(temporizador);
  }, [busquedaCompras, cargar]);

  return {
    marcas, modelos, proveedores,
    garantias, reclamos, compras, cargando, error, setError, manejarError, cargar,
    setMarcas, setModelos, setProveedores, setGarantias, setReclamos, setCompras,
  };
}
