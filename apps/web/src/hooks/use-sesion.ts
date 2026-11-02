import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cerrarSesion, obtenerPerfil, type PerfilSesion } from "../services/autenticacion.service";

export function useSesion() {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { perfil?: PerfilSesion | null } } | null)?.datosInicio;
  const [perfil, setPerfil] = useState<PerfilSesion | null>(() => datosInicio?.perfil ?? null);
  const [perfilValidadoAlEntrar] = useState(() => Boolean(datosInicio?.perfil));

  useEffect(() => {
    if (perfilValidadoAlEntrar) return;
    let montado = true;
    obtenerPerfil()
      .then((perfilActual) => { if (montado) setPerfil(perfilActual); })
      .catch(() => navegar("/login", { replace: true }));
    return () => { montado = false; };
  }, [navegar, perfilValidadoAlEntrar]);

  function salir() {
    void cerrarSesion().catch(() => undefined).finally(() => navegar("/login", { replace: true }));
  }

  return { perfil, salir };
}
