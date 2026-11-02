import "./perfil-page.css";
import type { PerfilSesion } from "../../services/autenticacion.service";

export function PerfilPage({ perfil }: { perfil: PerfilSesion | null }) {
  const iniciales = perfil?.nombreCompleto.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("") ?? "IM";

  return <section className="perfil-page">
    <header className="perfil-heading"><div><p className="perfil-eyebrow">CUENTA Y ACCESO</p><h1>Mi perfil</h1><p className="perfil-subtitle">Información de la cuenta con la que ingresaste al sistema.</p></div></header>
    <article className="perfil-card">
      <div className="perfil-identity"><span className="perfil-avatar">{iniciales}</span><div><h2>{perfil?.nombreCompleto ?? "Cargando perfil"}</h2><p>{perfil?.roles.join(" · ") || "Usuario"}</p></div></div>
      <dl className="perfil-details">
        <div><dt>Nombre</dt><dd>{perfil?.nombreCompleto ?? "Cargando…"}</dd></div>
        <div><dt>Rol{(perfil?.roles.length ?? 0) === 1 ? "" : "es"}</dt><dd>{perfil?.roles.join(", ") || "Usuario"}</dd></div>
        <div><dt>Accesos habilitados</dt><dd>{perfil ? `${perfil.permisos.length} permisos asignados` : "Cargando…"}</dd></div>
      </dl>
    </article>
  </section>;
}
