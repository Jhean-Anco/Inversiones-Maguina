import type { ReactNode } from "react";
import { Dialogo } from "../ui/dialogo/dialogo";

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });
const formatoFecha = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "America/Lima" });

export const monedaInventario = (valor: string | number | null | undefined) =>
  valor == null || valor === "" ? "—" : formatoSoles.format(Number(valor));

export function fechaInventario(valor: string | null | undefined) {
  if (!valor) return "—";
  return formatoFecha.format(new Date(valor.length === 10 ? `${valor}T12:00:00-05:00` : valor));
}

export function estadoPrecio(precio: { vigenteDesde?: string | null; vigenteHasta?: string | null; activo?: boolean }, ahora: number) {
  if (precio.activo === false) return "Inactivo";
  if (precio.vigenteHasta && Date.parse(precio.vigenteHasta) <= ahora) return "Finalizado";
  if (precio.vigenteDesde && Date.parse(precio.vigenteDesde) > ahora) return "Programado";
  return "Vigente";
}

export const clasesCamposPrecio = "grid gap-3 sm:grid-cols-2 [&_label]:grid [&_label]:gap-1.5 [&_label]:text-sm [&_label]:font-medium [&_input]:min-w-0 [&_select]:min-w-0 [&_input]:w-full [&_select]:w-full [&_input]:rounded-md [&_select]:rounded-md [&_input]:border [&_select]:border [&_input]:border-[var(--erp-border)] [&_select]:border-[var(--erp-border)] [&_input]:bg-[var(--erp-surface)] [&_select]:bg-[var(--erp-surface)] [&_input]:p-2 [&_select]:p-2";
export const clasesTablaDialogo = "w-full border-collapse text-sm [&_td]:text-center [&_th]:text-center [&_td]:border-t [&_th]:border-t [&_td]:border-[var(--erp-border)] [&_th]:border-[var(--erp-border)] [&_td]:px-3 [&_th]:px-3 [&_td]:py-2 [&_th]:py-2 [&_th]:text-xs [&_th]:font-medium";

export function ReferenciasPrecio({ vigente, promedio, ultimo, fecha, base }: {
  vigente?: string | null;
  promedio?: string | null;
  ultimo?: string | null;
  fecha?: string | null;
  base: string;
}) {
  return <section className="mb-5 overflow-hidden rounded-xl border border-[var(--erp-border)] bg-[var(--erp-surface-muted)]" aria-label="Referencia de compra y venta">
    <dl className="m-0 grid grid-cols-2 gap-px bg-[var(--erp-border)] sm:grid-cols-3">
      <div className="bg-[var(--erp-surface-muted)] px-4 py-3"><dt className="text-sm">Último costo de compra</dt><dd className="m-0 font-semibold tabular-nums">{ultimo == null ? "Sin compras" : monedaInventario(ultimo)}</dd>{fecha && <dd className="m-0 text-xs">{fechaInventario(fecha)}</dd>}</div>
      <div className="bg-[var(--erp-surface-muted)] px-4 py-3"><dt className="text-sm">Costo promedio de compra</dt><dd className="m-0 font-semibold tabular-nums">{promedio == null ? "Sin compras" : monedaInventario(promedio)}</dd><dd className="m-0 text-xs">Ponderado por cantidad</dd></div>
      <div className="col-span-2 bg-[var(--erp-surface)] px-4 py-3 sm:col-span-1"><dt className="text-sm">Precio general vigente</dt><dd className="m-0 font-semibold tabular-nums">{vigente == null ? "Sin precio" : monedaInventario(vigente)}</dd></div>
    </dl>
    <p className="m-0 border-t border-[var(--erp-border)] px-4 py-2 text-xs">Importes por {base}.</p>
  </section>;
}

type Props = {
  titulo: string;
  articulo: string;
  codigo: string;
  alCerrar: () => void;
  guardando?: boolean;
  pantallaCompletaMovil?: boolean;
  acciones?: ReactNode;
  children: ReactNode;
};

export function DialogoCatalogo({ titulo, articulo, codigo, alCerrar, guardando, pantallaCompletaMovil, acciones, children }: Props) {
  return (
    <Dialogo
      titulo={titulo}
      ancho="lg"
      pantallaCompletaMovil={pantallaCompletaMovil}
      cerrable={!guardando}
      onCerrar={alCerrar}
      icono={<img src="/logo.webp" alt="" className="size-11 shrink-0 rounded-lg bg-white object-contain p-1" />}
      subtitulo={<><span className="block text-xl font-bold text-[#0b2545] break-words">{articulo}</span>{codigo && <span className="mt-1 block font-mono text-xs">{codigo}</span>}</>}
      pie={acciones}
    >
      {children}
    </Dialogo>
  );
}
