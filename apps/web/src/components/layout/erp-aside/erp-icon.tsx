import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  inicio: <><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="5" rx="2" /><rect x="13" y="10" width="8" height="11" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /></>,
  venta: <><path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.5a2 2 0 0 0 1.9-1.4L21 9H7" /><circle cx="11" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
  catalogos: <><path d="m20.6 13.4-7.2 7.2a2 2 0 0 1-2.8 0l-7.2-7.2V3.5h9.9l7.3 7.1a2 2 0 0 1 0 2.8Z" /><circle cx="7.5" cy="7.5" r="1.1" /></>,
  inventario: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 13l9 5 9-5M3 8v9l9 5 9-5V8" /></>,
  finanzas: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4M16 3v6" /></>,
  egresos: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h5M12 3v4M12 17v4" /><path d="m9 18 3 3 3-3" /></>,
  personas: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.6V20" /></>,
  reportes: <><path d="M4 20V9M10 20V4M16 20v-7M22 20H2" /><path d="m3 7 6-4 6 7 6-5" /></>,
  administracion: <><circle cx="12" cy="8" r="3" /><path d="M5 20v-1a7 7 0 0 1 14 0v1M19 8h3M20.5 6.5v3" /></>,
  salir: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  notificaciones: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
};

export function Icono({ nombre }: { nombre: string }) {
  return <svg className="erp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[nombre] ?? paths.inicio}</svg>;
}
