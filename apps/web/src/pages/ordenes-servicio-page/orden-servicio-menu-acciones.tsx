import { useId, useState, type ReactNode } from "react";
import { Clock3, FileOutput, FilePlus2, FileText, MoreVertical, ReceiptText } from "lucide-react";
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
  const [solicitandoProrroga, setSolicitandoProrroga] = useState(false);
  const [motivoProrroga, setMotivoProrroga] = useState("");
  const digitos = orden.clienteTelefono?.replace(/\D/g, "") ?? "";
  const numero = /^9\d{8}$/.test(digitos) ? `51${digitos}` : /^519\d{8}$/.test(digitos) ? digitos : null;
  if (!numero) return null;

  const nombre = orden.clienteNombre || "cliente";
  const fechaFinal = orden.fechaAcabado ? formatearFecha(orden.fechaAcabado) : "la fecha acordada";
  const servicioAnulado = orden.estado === "ANULADA";
  const servicioCompletado = ["COMPLETADA", "FACTURADA"].includes(orden.estado);
  const abrirWhatsApp = (mensaje: string) => window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  const claseOpcion = `${clasesOpcionMenu} flex items-center gap-2 !whitespace-normal text-[12px]`;

  return <>
    <button className={claseOpcion} type="button" role="menuitem" disabled={servicioAnulado} title={servicioAnulado ? "No se puede contactar por una orden anulada" : "Avisar al cliente que el servicio se completó y el vehículo está listo para recoger"} onClick={() => abrirWhatsApp(`Hola ${nombre}, esperamos que estés muy bien.\n\nTe saludamos de *Inversiones Maguiña* para contarte que el servicio de tu vehículo fue *completado correctamente*.\n\n*Motivo de ingreso:* ${orden.motivo}\n*Vehículo:* ${orden.vehiculoPlaca}\n*Orden de servicio:* ${orden.codigo}\n\nTu vehículo está listo. Quedamos atentos para coordinar su recojo. ¡Gracias por confiar en nosotros!`)}><IconoWhatsApp size={16} />Avisar que está listo por WhatsApp</button>
    <button className={claseOpcion} type="button" role="menuitem" data-menu-keep-open="true" disabled={servicioCompletado} title={servicioCompletado ? "La orden ya está completada" : "Preparar solicitud de prórroga indicando el motivo"} onClick={() => { setSolicitandoProrroga((valor) => !valor); setMotivoProrroga(""); }}><Clock3 aria-hidden="true" size={16} />Preparar solicitud de prórroga</button>
    {solicitandoProrroga && <div className="ordenes-whatsapp-extension" data-menu-keep-open="true"><label>Motivo de la prórroga<textarea autoFocus value={motivoProrroga} maxLength={500} onChange={(evento) => setMotivoProrroga(evento.target.value)} placeholder="Explica por qué se requiere más tiempo" /></label><button className={claseOpcion} type="button" role="menuitem" disabled={!motivoProrroga.trim()} onClick={() => abrirWhatsApp(`Hola ${nombre}, esperamos que estés muy bien.\n\nTe escribimos de *Inversiones Maguiña* por el servicio de tu vehículo. Necesitamos solicitar una *prórroga* para completar el trabajo.\n\n*Vehículo:* ${orden.vehiculoPlaca}\n*Orden de servicio:* ${orden.codigo}\n*Fecha de acabado prevista:* ${fechaFinal}\n*Motivo:* ${motivoProrroga.trim()}\n\nLamentamos el cambio y agradecemos tu comprensión. ¿Podrías confirmarnos si estás de acuerdo con la prórroga?`)}><IconoWhatsApp size={16} />Abrir WhatsApp con solicitud</button></div>}
  </>;
}

export function MenuMasAccionesOrden({ children }: { children: ReactNode }) {
  const menu = useMenuAccionExclusivo(`mas-orden-${useId()}`);
  return <span ref={menu.raizRef} className="relative inline-flex items-center">
    <BotonAccion etiqueta="Más acciones de la orden" tono="informativa" icono={<MoreVertical aria-hidden="true" />} aria-haspopup="menu" aria-expanded={menu.abierto} onClick={menu.alternar} />
    {menu.presente && <div className={`${clasesOpcionesMenu} w-[min(280px,calc(100vw-32px))]`} data-menu-state={menu.fase} role="menu" aria-hidden={!menu.abierto} aria-label="Más acciones de la orden" onClick={(evento) => {
      const destino = evento.target as HTMLElement;
      if (!destino.closest("[data-menu-keep-open]") && destino.closest('[role="menuitem"]')) menu.cerrar();
    }}>
      {children}
    </div>}
  </span>;
}
