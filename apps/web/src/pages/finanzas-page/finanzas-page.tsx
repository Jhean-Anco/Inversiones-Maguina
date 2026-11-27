import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ErrorApi } from "../../services/api-cliente";
import { CuentasFinancieras } from "./cuentas-financieras";

export function FinanzasPage({ puedeAdministrar }: { puedeAdministrar: boolean }) {
  const alertas = useAlertas();
  const navegar = useNavigate();
  const manejarError = useCallback((e: unknown) => {
    if (e instanceof ErrorApi && e.estado === 401) { navegar("/login", { replace: true }); return; }
    alertas.error(e instanceof Error ? e.message : "No se pudo completar la solicitud.");
  }, [alertas, navegar]);

  return <CuentasFinancieras puedeAdministrar={puedeAdministrar} manejarError={manejarError} />;
}
