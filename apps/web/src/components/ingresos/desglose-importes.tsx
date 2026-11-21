type DesgloseImportesProps = {
  subtotal?: number | string | null;
  igv?: number | string | null;
  total: number | string;
  tasaIgv?: number;
  destacado?: boolean;
};

const formatoSoles = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const filaImporte = "flex items-baseline justify-between gap-x-2.5 gap-y-1";
const importe = "m-0 whitespace-nowrap font-semibold tabular-nums";

export function DesgloseImportes({ subtotal, igv, total, tasaIgv, destacado = false }: DesgloseImportesProps) {
  return (
    <dl className={`m-0 grid w-full gap-1 text-left leading-[1.4] text-(--erp-ink-soft) ${destacado ? "text-xs" : "text-[11px]"}`} aria-label="Desglose de importes">
      <div className={filaImporte}><dt className="whitespace-normal">Subtotal sin IGV</dt><dd className={importe}>{subtotal == null ? "—" : formatoSoles.format(Number(subtotal))}</dd></div>
      <div className={filaImporte}><dt>{tasaIgv ? `IGV (${tasaIgv}%)` : "IGV"}</dt><dd className={importe}>{igv == null ? "—" : formatoSoles.format(Number(igv))}</dd></div>
      <div className={`${filaImporte} border-t border-(--erp-border) pt-1 font-bold text-(--erp-ink)`}>
        <dt className="whitespace-normal">Total a pagar</dt>
        <dd className={`m-0 whitespace-nowrap tabular-nums ${destacado ? "text-[clamp(14px,1.3vw,20px)]" : ""}`}>{formatoSoles.format(Number(total))}</dd>
      </div>
    </dl>
  );
}
