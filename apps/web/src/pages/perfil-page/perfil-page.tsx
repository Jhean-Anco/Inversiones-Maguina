import "./perfil-page.css";
import type { PerfilSesion } from "../../services/autenticacion.service";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";

export function PerfilPage({ perfil }: { perfil: PerfilSesion | null }) {
  const iniciales = perfil?.nombreCompleto.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("") ?? "IM";
  const roles = perfil?.roles ?? [];

  return <section className="perfil-page" aria-label="Mi perfil">
    <article className="perfil-card">
      <header className="perfil-identity">
        <span className="perfil-avatar" aria-hidden="true">{iniciales}</span>
        <div className="perfil-identity-copy">
          <span className="perfil-kicker">CUENTA PERSONAL</span>
          <h1>{perfil?.nombreCompleto ?? "Cargando perfil"}</h1>
          <div className="perfil-role-list" aria-label="Roles asignados">
            {roles.length ? roles.map((rol) => <span className="perfil-role-chip" key={rol}><ShieldCheck size={14} aria-hidden="true" />{rol}</span>) : <span className="perfil-role-chip">Usuario</span>}
          </div>
        </div>
        <div className="perfil-access-summary">
          <span className="perfil-access-icon"><KeyRound size={18} aria-hidden="true" /></span>
          <div><strong>{perfil ? perfil.permisos.length : "—"}</strong><span>permisos asignados</span></div>
        </div>
      </header>
      <section className="perfil-details" aria-labelledby="perfil-details-title">
        <div className="perfil-section-heading">
          <div><span className="perfil-kicker">TU CUENTA</span><h2 id="perfil-details-title">Datos del perfil</h2></div>
          <span className="perfil-account-mark"><UserRound size={18} aria-hidden="true" /></span>
        </div>
        <dl className="perfil-details-grid">
          <div><dt>Nombre completo</dt><dd>{perfil?.nombreCompleto ?? "Cargando…"}</dd></div>
          <div><dt>Rol{roles.length === 1 ? "" : "es"}</dt><dd>{roles.length ? roles.join(", ") : "Usuario"}</dd></div>
          <div><dt>Permisos de acceso</dt><dd>{perfil ? `${perfil.permisos.length} accesos habilitados` : "Cargando…"}</dd></div>
        </dl>
      </section>
    </article>
  </section>;
}
