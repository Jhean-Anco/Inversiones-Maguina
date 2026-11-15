import { useId, useState, type DragEvent } from "react";
import "./image-upload-card.css";
import { UploadProgress, type UploadProgressStatus } from "./upload-progress";

export type ImageUploadPreview = {
  key: string;
  src: string;
  alt: string;
  removeLabel?: string;
  onRemove?: () => void;
};

type Props = {
  title: string;
  description: string;
  hint?: string;
  previews?: ImageUploadPreview[];
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  buttonLabel?: string;
  onSelect: (files: File[]) => void;
  variant?: "image" | "file";
  fileKind?: "pdf" | "file";
  fileName?: string;
  uploadStatus?: UploadProgressStatus;
  uploadProgress?: number | null;
  uploadMessage?: string;
};

export function ImageUploadCard({ title, description, hint = "JPG, PNG o WebP", previews = [], accept = "image/jpeg,image/png,image/webp", multiple = false, disabled = false, buttonLabel, onSelect, variant = "image", fileKind = "file", fileName = "", uploadStatus = "ready", uploadProgress = null, uploadMessage }: Props) {
  const id = useId();
  const [arrastrando, setArrastrando] = useState(false);
  const tieneImagen = previews.length > 0;
  const textoBoton = buttonLabel ?? (variant === "file" ? fileName ? "Cambiar archivo" : "Seleccionar archivo" : tieneImagen ? "Cambiar imagen" : "Seleccionar imagen");
  const seleccionar = (archivos: FileList | File[] | null) => {
    if (archivos) onSelect(Array.from(archivos));
  };
  const soltar = (evento: DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    setArrastrando(false);
    if (!disabled) seleccionar(evento.dataTransfer.files);
  };

  return <section className={`image-upload-card${multiple ? " is-multiple" : ""}${variant === "file" ? " is-file" : ""}${arrastrando ? " is-dragging" : ""}`} aria-label={title}>
    <div className="image-upload-card-copy"><h3>{title}</h3><p>{description}</p></div>
    <div className="image-upload-card-preview" onDragOver={(evento) => { evento.preventDefault(); if (!disabled) setArrastrando(true); }} onDragLeave={(evento) => { if (evento.currentTarget === evento.target) setArrastrando(false); }} onDrop={soltar}>
      {variant === "file" ? <div className={`upload-file-preview${fileName ? " has-file" : ""}`} aria-live="polite"><svg className={`upload-file-icon is-${fileKind}`} viewBox="0 0 40 48" aria-hidden="true"><path d="M7 2h17l10 10v32a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M24 2v10h10"/><path className="upload-file-icon-detail" d="M10 27h20M10 33h20M10 39h14"/></svg><strong>{fileName || (fileKind === "pdf" ? "PDF" : "Archivo")}</strong><small>{fileName ? "Listo para adjuntar" : fileKind === "pdf" ? "Selecciona o arrastra un PDF aquí" : "Selecciona o arrastra un archivo aquí"}</small></div> : tieneImagen ? <div className="image-upload-card-grid">{previews.map((item) => <figure key={item.key} className="image-upload-card-item"><img src={item.src} alt={item.alt} />{item.onRemove && <button type="button" disabled={disabled} aria-label={item.removeLabel ?? "Quitar imagen"} onClick={item.onRemove}>×</button>}</figure>)}</div> : <div className="image-upload-card-empty" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m21 15-5-5L5 19"/></svg><span>Sin imagen</span></div>}
    </div>
    <label className="image-upload-card-button" htmlFor={id}>{textoBoton}<input id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} onChange={(evento) => { seleccionar(evento.currentTarget.files); evento.currentTarget.value = ""; }} /></label>
    <small className="image-upload-card-hint">{hint}</small>
    <UploadProgress status={uploadStatus} title={uploadMessage} detail={fileName || undefined} progress={uploadProgress} />
  </section>;
}
