import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useState } from "react";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import type { ClienteRegistrado, DatosClienteNuevo } from "../../services/ingresos.service";

type DatosEdicionCliente = Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">;

type ClienteDetalleDialogProps = {
  cliente: ClienteRegistrado;
  editable: boolean;
  onClose: () => void;
  onSave: (datos: DatosEdicionCliente) => Promise<void>;
};

export function ClienteDetalleDialog({ cliente, editable, onClose, onSave }: ClienteDetalleDialogProps) {
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<DatosEdicionCliente>({
    nombreComercial: cliente.nombreComercial ?? "",
    contactoNombre: cliente.contactoNombre ?? "",
    correo: cliente.correo ?? "",
    telefono: cliente.telefono ?? "",
    direccion: cliente.direccion ?? "",
    direccionEntrega: cliente.direccionEntrega ?? "",
    observacion: cliente.observacion ?? "",
  });
  const nombre = cliente.tipoPersona === "JURIDICA"
    ? cliente.razonSocial || cliente.nombreComercial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ")
    : [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ") || cliente.nombreComercial || cliente.razonSocial || "Cliente";
  const nombreIdentidad = cliente.razonSocial || cliente.nombreComercial || nombre;
  const iniciales = nombreIdentidad.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toLocaleUpperCase("es-PE")).join("") || "CL";
  const documentos = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
  const nombreDocumento = (tipo: string) => ({ "01": "DNI", "04": "CE", "06": "RUC", "07": "Pasaporte" } as Record<string, string>)[tipo] ?? tipo;

  function editarCampo(campo: keyof DatosEdicionCliente, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }

  async function guardarCambios() {
    setGuardando(true);
    setError("");
    try {
      await onSave(datos);
      setEditando(false);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo actualizar el cliente.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="venta-client-detail-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onClose(); }}>
      <section className="venta-client-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="venta-client-detail-title">
        <header><div><small>{editando ? "FICHA DE CLIENTE · EDITANDO" : "FICHA DE CLIENTE"}</small><h2 id="venta-client-detail-title">{nombre}</h2>{editando && <p className="venta-client-edit-guidance">El documento y el tipo de persona no se pueden modificar. Los cambios se aplican al pulsar «Guardar cambios».</p>}</div><button type="button" aria-label="Cerrar detalle" onClick={onClose}>×</button></header>
        {!editando && <div className="venta-client-profile">
          <span className="venta-client-profile-avatar" aria-hidden="true">{iniciales}</span>
          <div className="venta-client-profile-identity">
            <strong>{cliente.nombreComercial || cliente.razonSocial || nombre}</strong>
            <div className="venta-client-profile-tags">
              <span>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Persona natural"}</span>
              {documentos.map((documento) => <span key={`${documento.tipoDocumento}:${documento.numeroDocumento}`}>{nombreDocumento(documento.tipoDocumento)} {documento.numeroDocumento}</span>)}
            </div>
          </div>
        </div>}
        <div className="venta-client-detail-grid mobile-portrait:grid-cols-1">
          <div><small>Documento</small><strong>{documentos.map((documento) => `${nombreDocumento(documento.tipoDocumento)} ${documento.numeroDocumento}`).join(" · ")}</strong></div>
          <div><small>Tipo de persona</small><strong>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Persona natural"}</strong></div>
          {editando ? <>
            <label>Nombre comercial<input value={datos.nombreComercial} maxLength={180} onChange={(evento) => editarCampo("nombreComercial", evento.target.value)} /></label>
            <label>Persona de contacto<input value={datos.contactoNombre} maxLength={180} onChange={(evento) => editarCampo("contactoNombre", evento.target.value)} /></label>
            <label>Correo<input type="email" value={datos.correo} maxLength={254} onChange={(evento) => editarCampo("correo", evento.target.value)} /></label>
            <label>Teléfono<input type="tel" value={datos.telefono} maxLength={30} onChange={(evento) => editarCampo("telefono", evento.target.value)} /></label>
            <label className="venta-client-detail-wide mobile-portrait:col-start-1">Dirección fiscal<input value={datos.direccion} maxLength={240} onChange={(evento) => editarCampo("direccion", evento.target.value)} /></label>
            <label className="venta-client-detail-wide mobile-portrait:col-start-1">Dirección de entrega<input value={datos.direccionEntrega} maxLength={240} onChange={(evento) => editarCampo("direccionEntrega", evento.target.value)} /></label>
            <label className="venta-client-detail-wide mobile-portrait:col-start-1">Nota interna<textarea rows={3} maxLength={1000} value={datos.observacion} onChange={(evento) => editarCampo("observacion", evento.target.value)} /></label>
          </> : <>
            <div><small>Nombre comercial</small><strong>{cliente.nombreComercial || "—"}</strong></div>
            <div><small>Persona de contacto</small><strong>{cliente.contactoNombre || "—"}</strong></div>
            <div><small>Correo</small><strong>{cliente.correo || "—"}</strong></div>
            <div><small>Teléfono</small><strong>{cliente.telefono || "—"}</strong></div>
          <div className="venta-client-detail-wide mobile-portrait:col-start-1"><small>Dirección fiscal</small><strong>{cliente.direccion || "—"}</strong></div>
          <div className="venta-client-detail-wide mobile-portrait:col-start-1"><small>Dirección de entrega</small><strong>{cliente.direccionEntrega || "—"}</strong></div>
          <div className="venta-client-detail-wide mobile-portrait:col-start-1"><small>Nota interna</small><strong>{cliente.observacion || "—"}</strong></div>
          </>}
        </div>
        {error && <NotificacionFlotante mensaje={error} />}
        <footer>{editando ? <><button type="button" className="venta-client-detail-secondary" onClick={() => setEditando(false)}>Cancelar</button><button type="button" className="venta-client-detail-primary" onClick={() => void guardarCambios()} disabled={guardando}>{guardando ? "Guardando…" : "Guardar cambios"}</button></> : <><button type="button" className="venta-client-detail-secondary" onClick={onClose}>Cerrar</button>{editable && <BotonEditarConfirmacion titulo="¿Editar los datos del cliente?" descripcion={`Vas a editar la información de ${nombre}. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver a la ficha" etiquetaConfirmar="Sí, editar cliente" onConfirmar={() => setEditando(true)}><button type="button" className="venta-client-detail-primary">Editar cliente</button></BotonEditarConfirmacion>}</>}</footer>
      </section>
    </div>
  );
}
