import { useId, useState, type ReactNode } from "react";
import { Clock3, FileOutput, FilePlus2, FileText, ReceiptText } from "lucide-react";
import { BotonAccion } from "../../components/ui/boton-accion";
import { IconoWhatsApp } from "../../components/ui/icono-whatsapp";
import { clasesOpcionMenu, clasesOpcionesMenu, claseRetardoOpcionDos, claseRetardoOpcionUno } from "../../components/documentos/menu-accion-classes";
import { useMenuAccionExclusivo } from "../../components/documentos/menu-accion-exclusivo";
import type { OrdenServicio } from "../../services/ingresos.service";

export type TipoDocumentoOrden = "BOLETA" | "FACTURA" | "NOTA_VENTA";
const documentosDisponibles: Array<{ tipo: TipoDocumentoOrden; nombre: string; icono: ReactNode }> = [
  { tipo: "BOLETA", nombre: "Boleta de venta", icono: <ReceiptText aria-hidden="true" size={16} /> },
  { tipo: "FACTURA", nombre: "Factura", icono: <FileText aria-hidden="true" size={16} /> },
  { tipo: "NOTA_VENTA", nombre: "Nota de venta", icono: <FilePlus2 aria-hidden="true" size={16} /> },
];

export function SelectorDocumentoOrden({ onSeleccionar, tiposDisponibles }: { onSeleccionar: (tipo: TipoDocumentoOrden) => void; tiposDisponibles: TipoDocumentoOrden[] }) {
  const menu = useMenuAccionExclusivo(`emitir-${useId()}`);
  const elegir = (tipo: TipoDocumentoOrden) => {
    menu.cerrar();
    onSeleccionar(tipo);
  };
  return <span ref={menu.raizRef} className="relative inline-flex items-center">
    <BotonAccion etiqueta={tiposDisponibles.length ? "Emitir documento" : "No hay tipos de documento disponibles; configura una serie activa"} tono="positiva" icono={<FileOutput aria-hidden="true" />} disabled={!tiposDisponibles.length} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar} />
    {menu.presente && <span className={clasesOpcionesMenu} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label="Tipo de documento a emitir">
      {documentosDisponibles.filter((documento) => tiposDisponibles.includes(documento.tipo)).map((documento, indice) => <button key={documento.tipo} className={`${clasesOpcionMenu} ${indice === 0 ? claseRetardoOpcionUno : indice === 1 ? claseRetardoOpcionDos : "data-[menu-state=abriendo]:[animation-delay:70ms] data-[menu-state=cerrando]:[animation-delay:0ms]"} flex items-center gap-2`} data-menu-state={menu.fase} type="button" role="menuitem" disabled={!menu.abierto} onClick={() => elegir(documento.tipo)}>{documento.icono}{documento.nombre}</button>)}
    </span>}
  </span>;
}

export function AccionesWhatsAppOrden({ orden, formatearFecha }: { orden: OrdenServicio; formatearFecha: (fecha: string) => string }) {
  const [motivoProrroga, setMotivoProrroga] = useState("");
  const prorroga = useMenuAccionExclusivo(`prorroga-${useId()}`);
  const digitos = orden.clienteTelefono?.replace(/\D/g, "") ?? "";
  const numero = /^9\d{8}$/.test(digitos) ? `51${digitos}` : /^519\d{8}$/.test(digitos) ? digitos : null;
  if (!numero) return null;

  const nombre = orden.clienteNombre || "cliente";
  const fechaFinal = orden.fechaAcabado ? formatearFecha(orden.fechaAcabado) : "la fecha acordada";
  const servicioAnulado = orden.estado === "ANULADA";
  const servicioCompletado = ["COMPLETADA", "FACTURADA"].includes(orden.estado);
  const abrirWhatsApp = (mensaje: string) => window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  const enviarProrroga = () => {
    abrirWhatsApp(`Hola ${nombre}, esperamos que estés muy bien.

Te escribimos de *Inversiones Maguiña* por el servicio de tu vehículo. Necesitamos solicitar una *prórroga* para completar el trabajo.

*Vehículo:* ${orden.vehiculoPlaca}
*Orden de servicio:* ${orden.codigo}
*Fecha de acabado prevista:* ${fechaFinal}
*Motivo:* ${motivoProrroga.trim()}

Lamentamos el cambio y agradecemos tu comprensión. ¿Podrías confirmarnos si estás de acuerdo con la prórroga?`);
    prorroga.cerrar();
    setMotivoProrroga("");
  };

  return <>
    <BotonAccion etiqueta={servicioAnulado ? "No se puede contactar por una orden anulada" : "Avisar por WhatsApp que el vehículo está listo"} tono="positiva" icono={<IconoWhatsApp size={16} />} disabled={servicioAnulado} onClick={() => abrirWhatsApp(`Hola ${nombre}, esperamos que estés muy bien.

Te saludamos de *Inversiones Maguiña* para contarte que el servicio de tu vehículo fue *completado correctamente*.

*Motivo de ingreso:* ${orden.motivo}
*Vehículo:* ${orden.vehiculoPlaca}
*Orden de servicio:* ${orden.codigo}

Tu vehículo está listo. Quedamos atentos para coordinar su recojo. ¡Gracias por confiar en nosotros!`)} />
    <span ref={prorroga.raizRef} className="relative inline-flex items-center">
      <BotonAccion etiqueta={servicioCompletado ? "La orden ya está completada" : "Solicitar prórroga por WhatsApp"} tono="advertencia" icono={<Clock3 aria-hidden="true" />} disabled={servicioCompletado || servicioAnulado} aria-haspopup="dialog" aria-expanded={prorroga.abierto} onClick={() => { prorroga.alternar(); setMotivoProrroga(""); }} />
      {prorroga.presente && <div className={`${clasesOpcionesMenu} w-[min(280px,calc(100vw-32px))] whitespace-normal`} data-menu-state={prorroga.fase} role="dialog" aria-label="Solicitud de prórroga">
        <div className="ordenes-whatsapp-extension"><label>Motivo de la prórroga<textarea autoFocus value={motivoProrroga} maxLength={500} onChange={(evento) => setMotivoProrroga(evento.target.value)} placeholder="Explica por qué se requiere más tiempo" /></label><button className={`${clasesOpcionMenu} flex items-center justify-center gap-2 text-[12px]`} type="button" disabled={!motivoProrroga.trim()} onClick={enviarProrroga}><IconoWhatsApp size={16} />Abrir WhatsApp con solicitud</button></div>
      </div>}
    </span>
  </>;
}
