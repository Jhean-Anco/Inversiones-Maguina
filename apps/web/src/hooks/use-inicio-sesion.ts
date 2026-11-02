import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../services/api-cliente";
import { iniciarSesion, obtenerPerfil } from "../services/autenticacion.service";
import { servicioDashboard } from "../services/dashboard.service";

export function useInicioSesion() {
  const navegar = useNavigate();
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);
  const [accesoConfirmado, setAccesoConfirmado] = useState(false);
  const [progresoCarga, setProgresoCarga] = useState(0);

  function iniciar(datos: { usuario: FormDataEntryValue | null; contrasena: FormDataEntryValue | null; recordar: boolean }) {
    setAviso("");
    setCargando(true);
    setAccesoConfirmado(false);
    setProgresoCarga(0);
    void iniciarSesion(datos)
      .then(async () => {
        setAccesoConfirmado(true);
        const inicioValidacion = window.performance.now();
        const [perfil, resumen] = await Promise.allSettled([
          obtenerPerfil(),
          servicioDashboard.resumen(),
        ]);
        const duracionMinima = 1100;
        const esperaRestante = Math.max(0, duracionMinima - (window.performance.now() - inicioValidacion));
        if (esperaRestante > 0) await new Promise<void>((resolver) => window.setTimeout(resolver, esperaRestante));
        navegar("/inicio", {
          replace: true,
          state: {
            datosInicio: {
              perfil: perfil.status === "fulfilled" ? perfil.value : null,
              resumen: resumen.status === "fulfilled" ? resumen.value : null,
              errorResumen: resumen.status === "rejected"
                ? resumen.reason instanceof Error ? resumen.reason.message : "No se pudo cargar el resumen del negocio."
                : "",
            },
          },
        });
      })
      .catch((problema: unknown) => {
        setAviso(problema instanceof ErrorApi && problema.estado === 401
          ? "Usuario o contraseña incorrectos."
          : "No se pudo conectar o iniciar sesión. Inténtalo nuevamente.");
      })
      .finally(() => setCargando(false));
  }

  return { aviso, setAviso, cargando, accesoConfirmado, iniciar };
}
