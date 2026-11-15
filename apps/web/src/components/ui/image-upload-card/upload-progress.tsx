import "./upload-progress.css";

export type UploadProgressStatus = "ready" | "uploading" | "complete" | "error";
type Props = { status: UploadProgressStatus; title?: string; detail?: string; progress?: number | null };

export function UploadProgress({ status, title, detail, progress = null }: Props) {
  if (status === "ready") return null;
  const percent = progress == null ? null : Math.max(0, Math.min(100, progress));
  return <div className={`upload-progress is-${status}`} role={status === "error" ? "alert" : "status"} aria-live="polite">
    <span className="upload-progress-mark" aria-hidden="true">{status === "complete" ? "✓" : status === "error" ? "!" : <i />}</span>
    <span className="upload-progress-copy"><strong>{title ?? (status === "uploading" ? "Subiendo archivo…" : status === "complete" ? "Archivo cargado" : "No se pudo cargar el archivo")}</strong>{detail && <small>{detail}</small>}
      {status === "uploading" && <span className={`upload-progress-track${percent === null ? " is-indeterminate" : ""}`}><i style={percent === null ? undefined : { width: `${percent}%` }} /></span>}
    </span>
    {percent !== null && status === "uploading" && <small className="upload-progress-percent">{Math.round(percent)}%</small>}
  </div>;
}
