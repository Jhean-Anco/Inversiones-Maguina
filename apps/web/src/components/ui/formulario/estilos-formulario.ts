/** Clases compartidas de los controles de formulario (campo, selector y área de texto). */
const base = "box-border w-full min-w-0 text-[length:var(--erp-text-md)] text-[var(--erp-ink)] placeholder:text-[var(--erp-ink-faint)] disabled:cursor-not-allowed";

export const claseControlFormulario = `${base} h-11 rounded-[var(--erp-radius-sm)] border border-[var(--erp-border-strong)] bg-[var(--erp-surface)] px-3 hover:border-[#b6c3d0] focus:border-[var(--erp-focus)] aria-[invalid=true]:border-[var(--erp-danger)] aria-[invalid=true]:focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--erp-danger)_20%,transparent)]`;

export const claseAreaFormulario = `${base} min-h-24 resize-y rounded-[var(--erp-radius-sm)] border border-[var(--erp-border-strong)] bg-[var(--erp-surface)] px-3 py-2.5 leading-relaxed hover:border-[#b6c3d0] focus:border-[var(--erp-focus)] aria-[invalid=true]:border-[var(--erp-danger)]`;

/** Control dentro de un contenedor con unidad: el borde y el foco los pone el contenedor. */
export const claseControlConUnidad = `${base} h-[42px] rounded-none border-0 bg-transparent px-3 shadow-none focus:shadow-none`;

export const claseContenedorUnidad = "flex items-stretch overflow-hidden rounded-[var(--erp-radius-sm)] border border-[var(--erp-border-strong)] bg-[var(--erp-surface)] transition-[border-color,box-shadow] hover:border-[#b6c3d0] focus-within:border-[var(--erp-focus)] focus-within:shadow-[var(--erp-focus-ring)] has-[[aria-invalid=true]]:border-[var(--erp-danger)] has-[:disabled]:bg-[var(--erp-surface-sunken)] motion-reduce:transition-none";
