import "./login-page.css";
import logoTransparente from "./logo-transparente.png";
import { useState, type FormEvent } from "react";
import { useInicioSesion } from "../../hooks/use-inicio-sesion";
import { SparklesCore } from "../../components/ui/sparkles";

function IconoUsuario() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5" /><path d="M5 20v-1.5a7 7 0 0 1 14 0V20z" /></svg>;
}

function IconoCandado() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg>;
}

function IconoOjo({ oculto }: { oculto: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true">{oculto
    ? <><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c5.2 0 8.6 4.9 9.5 6.5a1 1 0 0 1 0 1 15 15 0 0 1-3.1 3.8M6.2 6.2a16 16 0 0 0-3.7 5.3 1 1 0 0 0 0 1C3.4 14.1 6.8 19 12 19c1.1 0 2.1-.2 3-.6" /></>
    : <><path d="M2.5 12s3.4-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.4 6.5-9.5 6.5S2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>}
  </svg>;
}

export function LoginPage() {
  const [mostrarClave, setMostrarClave] = useState(false);
  const { aviso, setAviso, cargando, accesoConfirmado, iniciar } = useInicioSesion();

  function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const datos = new FormData(event.currentTarget);
    iniciar({ usuario: datos.get("usuario"), contrasena: datos.get("clave"), recordar: datos.get("recordar") === "on" });
  }

  return (
    <main className="login-layout">
      <div className="login-sparkles" aria-hidden="true">
        <SparklesCore />
      </div>
      <section className="login-panel" aria-labelledby="login-title">
        <img className="login-mobile-logo" src={logoTransparente} alt="Logo de Inversiones Maguiña" />
        <div className="login-content">
          <h1 id="login-title">Bienvenido</h1>
          <p className="login-intro">Ingresa con tu usuario o correo electrónico.</p>

          <form className="login-form" onSubmit={iniciarSesion}>
            <label htmlFor="usuario">Usuario o correo electrónico</label>
            <div className="input-with-icon">
              <IconoUsuario />
              <input id="usuario" name="usuario" type="text" autoComplete="username" placeholder="Ingresa tu usuario o correo" required />
            </div>

            <div className="password-heading"><label htmlFor="clave">Contraseña</label></div>
            <div className="input-with-icon password-field">
              <IconoCandado />
              <input id="clave" name="clave" type={mostrarClave ? "text" : "password"} autoComplete="current-password" placeholder="Ingresa tu contraseña" required />
              <button className="visibility-button" type="button" aria-label={mostrarClave ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setMostrarClave((visible) => !visible)}>
                <IconoOjo oculto={!mostrarClave} />
              </button>
            </div>

            <div className="login-options">
              <label className="remember-option"><input type="checkbox" name="recordar" /><span>Recordar mi usuario</span></label>
              <button className="forgot-link" type="button" onClick={() => setAviso("Comunícate con el administrador para recuperar el acceso.")}>¿Olvidaste tu contraseña?</button>
            </div>

            <button className="submit-button" type="submit" disabled={cargando}>
              {cargando ? "Ingresando..." : "Iniciar sesión"}<span aria-hidden="true">→</span>
            </button>
            <p className="form-notice" aria-live="polite">{aviso}</p>
          </form>
        </div>

        <footer className="login-footer">© 2026 Inversiones Maguiña. Todos los derechos reservados.</footer>
      </section>

      {accesoConfirmado && (
        <div className="login-success-overlay" role="status" aria-live="polite">
          <div className="login-success-card">
            <span className="login-success-spinner" aria-hidden="true" />
            <h2>Validando datos</h2>
            <p>Estamos preparando los datos iniciales del resumen…</p>
          </div>
        </div>
      )}
    </main>
  );
}
