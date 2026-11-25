type DesgloseImportesProps = {
  subtotal?: number | string | null;
  igv?: number | string | null;
  total: number | string;
  tasaIgv?: number;
  destacado?: boolean;
};

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const filaImporte = "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1";
const etiqueta = "min-w-0 text-left";
const importe = "m-0 whitespace-nowrap text-right font-semibold tabular-nums";

export function DesgloseImportes({ subtotal, igv, total, tasaIgv, destacado = false }: DesgloseImportesProps) {
  return (
    <dl className={`m-0 grid w-full gap-1 text-left leading-[1.4] text-(--erp-ink-soft) ${destacado ? "text-xs" : "text-[11px]"}`} aria-label="Detalle del importe: subtotal, IGV y total">
      <div className={filaImporte}><dt className={etiqueta}>Subtotal</dt><dd className={importe}>{subtotal == null ? "—" : formatoSoles.format(Number(subtotal))}</dd></div>
      <div className={filaImporte}><dt className={etiqueta}>{tasaIgv ? `IGV (${tasaIgv}%)` : "IGV"}</dt><dd className={importe}>{igv == null ? "—" : formatoSoles.format(Number(igv))}</dd></div>
      <div className={`${filaImporte} border-t border-(--erp-border) pt-1 font-bold text-(--erp-ink)`}>
        <dt className={etiqueta}>Total</dt>
        <dd className={`m-0 whitespace-nowrap text-right tabular-nums ${destacado ? "text-[clamp(14px,1.3vw,20px)]" : ""}`}>{formatoSoles.format(Number(total))}</dd>
      </div>
    </dl>
  );
}
