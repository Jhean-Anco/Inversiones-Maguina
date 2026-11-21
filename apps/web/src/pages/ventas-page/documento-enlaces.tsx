import { FileCheck, FileCode, Printer } from "lucide-react";
import { IconoWhatsApp } from "../../components/ui/icono-whatsapp";
import { urlApi } from "../../services/api-cliente";
import { ventasClasses } from "./ventas-classes";

type DocumentoEnlacesProps = {
  pdf: string | null;
  xml: string | null;
  cdr: string | null;
  codigo: string;
  whatsapp?: boolean;
  pdfComoDocumento?: boolean;
  mostrarPdf?: boolean;
};

const enlaceDocumento = (ruta: string) => (ruta.startsWith("/") ? urlApi(ruta) : ruta);

export function DocumentoEnlaces({
  pdf,
  xml,
  cdr,
  codigo,
  whatsapp = true,
  pdfComoDocumento = true,
  mostrarPdf = true,
}: DocumentoEnlacesProps) {
  return (
    <span className={ventasClasses.iconActions}>
      {pdf && mostrarPdf && (
        <a
          href={enlaceDocumento(pdf)}
          target="_blank"
          rel="noreferrer"
          title={pdfComoDocumento ? `Abrir o imprimir documento ${codigo}` : `Abrir PDF fiscal ${codigo}`}
          aria-label={pdfComoDocumento ? `Abrir o imprimir documento ${codigo}` : `Abrir PDF fiscal ${codigo}`}
        >
          {pdfComoDocumento ? <Printer aria-hidden="true" size={16} /> : <FileCheck aria-hidden="true" size={16} />}
        </a>
      )}
      {xml && (
        <a href={enlaceDocumento(xml)} target="_blank" rel="noreferrer" title={`Descargar XML ${codigo}`} aria-label={`Descargar XML ${codigo}`}>
          <FileCode aria-hidden="true" size={16} />
        </a>
      )}
      {cdr && (
        <a href={enlaceDocumento(cdr)} target="_blank" rel="noreferrer" title={`Ver CDR de SUNAT ${codigo}`} aria-label={`Ver constancia de recepción SUNAT ${codigo}`}>
          <FileCheck aria-hidden="true" size={16} />
        </a>
      )}
      {pdf && whatsapp && !pdf.startsWith("/") && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Te comparto el comprobante ${codigo}: ${enlaceDocumento(pdf)}`)}`}
          target="_blank"
          rel="noreferrer"
          title={`Compartir ${codigo} por WhatsApp`}
          aria-label={`Compartir ${codigo} por WhatsApp`}
        >
          <IconoWhatsApp size={16} />
        </a>
      )}
    </span>
  );
}
