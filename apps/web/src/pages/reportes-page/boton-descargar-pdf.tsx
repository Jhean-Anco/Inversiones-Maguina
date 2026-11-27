import { Download } from "lucide-react";
import { reportesClasses as r } from "./reportes-classes";

export function BotonDescargarPdf({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return <button type="button" className={r.exportar} onClick={onClick} disabled={disabled} title="Descargar el reporte en PDF">
    <Download aria-hidden="true" />Descargar PDF
  </button>;
}
