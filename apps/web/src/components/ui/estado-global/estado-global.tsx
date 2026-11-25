import type { ReactNode } from "react";

type Icono = "vacio" | "error" | "buscar" | "permiso" | "aviso";

type EstadoBase = {
  titulo?: string;
  texto?: ReactNode;
  accion?: ReactNode;
  icono?: Icono;
};

type EstadoGlobalProps =
  | { tipo: "cargando" }
  | ({ tipo: "vacio"; children?: ReactNode } & EstadoBase)
  | ({ tipo: "error" } & EstadoBase)
  | ({ tipo: "sin-resultados" } & EstadoBase)
  | ({ tipo: "sin-permiso" } & EstadoBase);

const tonosIcono: Record<Icono, string> = {
  vacio: "bg-[#eef4fa] text-[#174b78]",
  buscar: "bg-[#f1f4f7] text-[#52697d]",
  error: "bg-[#fdf1ee] text-[#b3341f]",
  permiso: "bg-[#f1f4f7] text-[#52697d]",
  aviso: "bg-[#fff6e5] text-[#8a5a00]",
};

const iconos: Record<Icono, string> = {
  vacio: "M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8",
  buscar: "M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4-4",
  error: "M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  permiso: "M5 11h14v10H5zM8 11V7a4 4 0 018 0v4",
  aviso: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z",
};

const iconoPorTipo: Record<"vacio" | "error" | "sin-resultados" | "sin-permiso", Icono> = {
  vacio: "vacio",
  error: "error",
  "sin-resultados": "buscar",
  "sin-permiso": "permiso",
};

function Esqueleto({ ancho, alto = 14 }: { ancho: string; alto?: number }) {
  return <div className="rounded-lg bg-gradient-to-r from-[#e8eef3] via-[#f3f6f9] to-[#e8eef3]" style={{ width: ancho, height: alto }} />;
}

/** Estado vacío, de error, sin resultados, sin permiso o de carga. Mantiene la API previa (`tipo="cargando"` y `tipo="vacio"` con children). */
export function EstadoGlobal(props: EstadoGlobalProps) {
  if (props.tipo === "cargando") {
    return (
      <div role="status" aria-busy="true" aria-live="polite" aria-label="Cargando" className="flex min-h-40 flex-col gap-4 p-6" data-state="cargando">
        <Esqueleto ancho="40%" alto={16} />
        <Esqueleto ancho="100%" />
        <Esqueleto ancho="90%" />
        <Esqueleto ancho="75%" />
        <span className="text-center text-[13px] font-semibold text-[#52697d]">Cargando…</span>
      </div>
    );
  }

  // Compatibilidad: `vacio` sin título usa children como texto plano.
  if (props.tipo === "vacio" && props.titulo === undefined && props.texto === undefined && props.accion === undefined) {
    return (
      <div className="grid min-h-40 place-items-center p-6 text-center text-[var(--erp-ink-muted,#52697d)]" data-state="vacio" aria-live="polite">
        {props.children}
      </div>
    );
  }

  const icono = props.icono ?? iconoPorTipo[props.tipo];
  const esAlerta = props.tipo === "error";
  const titulo = props.titulo ?? (
    props.tipo === "error" ? "No se pudieron cargar los datos" :
    props.tipo === "sin-resultados" ? "Sin resultados" :
    props.tipo === "sin-permiso" ? "No tienes permiso para ver esto" :
    "Aún no hay registros"
  );
  const texto = props.texto ?? (
    "children" in props ? props.children : undefined
  );

  return (
    <section
      role={esAlerta ? "alert" : "status"}
      data-state={props.tipo}
      className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-2 p-7 text-center"
    >
      <span className={`mb-1 flex h-14 w-14 items-center justify-center rounded-full ${tonosIcono[icono]}`} aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={iconos[icono]} />
        </svg>
      </span>
      <h2 className="m-0 text-[17px] font-bold text-[#173b65]">{titulo}</h2>
      {texto && <p className="m-0 max-w-[340px] text-[13.5px] leading-normal text-[#52697d]">{texto}</p>}
      {props.accion && <div className="mt-2 flex flex-wrap justify-center gap-2.5">{props.accion}</div>}
    </section>
  );
}
