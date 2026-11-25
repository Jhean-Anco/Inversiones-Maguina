import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useState } from "react";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import type { ClienteRegistrado, DatosClienteNuevo } from "../../services/ingresos.service";

type DatosEdicionCliente = Pick<DatosClienteNuevo, "nombreComercial" | "contactoNombre" | "correo" | "telefono" | "direccion" | "direccionEntrega" | "observacion">;

type ClienteDetalleDialogProps = {
  cliente: ClienteRegistrado;
  editable: boolean;
  onClose: () => void;
  onSave: (datos: DatosEdicionCliente) => Promise<void>;
};

const campoLectura = "grid gap-0.5";
const campoEdicion = "grid gap-1.5 text-xs font-bold text-[#52697d]";
const etiqueta = "block text-[11px] font-bold tracking-[0.06em] text-[#52697d]";
const valor = "block text-sm font-semibold text-[#0b2545]";
const entrada = "h-11 w-full rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42]";
const ancho = "col-span-2 max-sm:col-span-1";

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
  const nombre = cliente.nombreComercial || cliente.razonSocial || [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");

  function editarCampo(campo: keyof DatosEdicionCliente, valorNuevo: string) {
    setDatos((actual) => ({ ...actual, [campo]: valorNuevo }));
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

  const botonCerrar = (
    <button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" onClick={onClose}>Cerrar</button>
  );

  const pieEdicion = (
    <>
      <button type="button" className="min-h-11 rounded-xl border border-[#c5d1db] bg-white px-5 text-sm font-semibold text-[#27445f] max-sm:w-full" onClick={() => setEditando(false)}>Cancelar</button>
      <button type="submit" form="cliente-detalle-form" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
    </>
  );

  const pieLectura = (
    <>
      {botonCerrar}
      {editable && (
        <BotonEditarConfirmacion
          titulo="¿Editar los datos del cliente?"
          descripcion={`Vas a editar la información de ${nombre}. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`}
          etiquetaCancelar="Volver a la ficha"
          etiquetaConfirmar="Sí, editar cliente"
          onConfirmar={() => setEditando(true)}
        >
          <button type="button" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white max-sm:w-full">Editar cliente</button>
        </BotonEditarConfirmacion>
      )}
    </>
  );

  return (
    <Dialogo
      kicker="FICHA DE CLIENTE"
      titulo={nombre}
      ancho="md"
      cerrable={!guardando}
      onCerrar={onClose}
      pie={editando ? pieEdicion : pieLectura}
    >
      <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
        <div className={campoLectura}><span className={etiqueta}>Documento</span><strong className={valor}>{cliente.numeroDocumento}</strong></div>
        <div className={campoLectura}><span className={etiqueta}>Tipo de persona</span><strong className={valor}>{cliente.tipoPersona === "JURIDICA" ? "Empresa / organización" : "Persona natural"}</strong></div>
      </div>

      {editando ? (
        <form id="cliente-detalle-form" className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1" onSubmit={(evento) => { evento.preventDefault(); void guardarCambios(); }}>
          <label className={campoEdicion}>Nombre comercial<input className={entrada} value={datos.nombreComercial} maxLength={180} onChange={(evento) => editarCampo("nombreComercial", evento.target.value)} /></label>
          <label className={campoEdicion}>Persona de contacto<input className={entrada} value={datos.contactoNombre} maxLength={180} onChange={(evento) => editarCampo("contactoNombre", evento.target.value)} /></label>
          <label className={campoEdicion}>Correo<input className={entrada} type="email" value={datos.correo} maxLength={254} onChange={(evento) => editarCampo("correo", evento.target.value)} /></label>
          <label className={campoEdicion}>Teléfono<input className={entrada} type="tel" value={datos.telefono} maxLength={30} onChange={(evento) => editarCampo("telefono", evento.target.value)} /></label>
          <label className={`${campoEdicion} ${ancho}`}>Dirección fiscal<input className={entrada} value={datos.direccion} maxLength={240} onChange={(evento) => editarCampo("direccion", evento.target.value)} /></label>
          <label className={`${campoEdicion} ${ancho}`}>Dirección de entrega<input className={entrada} value={datos.direccionEntrega} maxLength={240} onChange={(evento) => editarCampo("direccionEntrega", evento.target.value)} /></label>
          <label className={`${campoEdicion} ${ancho}`}>Nota interna<textarea className="w-full rounded-xl border border-[#c5d1db] p-3 text-sm font-medium text-[#142b42]" rows={3} maxLength={1000} value={datos.observacion} onChange={(evento) => editarCampo("observacion", evento.target.value)} /></label>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
          <div className={campoLectura}><span className={etiqueta}>Nombre comercial</span><strong className={valor}>{cliente.nombreComercial || "—"}</strong></div>
          <div className={campoLectura}><span className={etiqueta}>Persona de contacto</span><strong className={valor}>{cliente.contactoNombre || "—"}</strong></div>
          <div className={campoLectura}><span className={etiqueta}>Correo</span><strong className={valor}>{cliente.correo || "—"}</strong></div>
          <div className={campoLectura}><span className={etiqueta}>Teléfono</span><strong className={valor}>{cliente.telefono || "—"}</strong></div>
          <div className={`${campoLectura} ${ancho}`}><span className={etiqueta}>Dirección fiscal</span><strong className={valor}>{cliente.direccion || "—"}</strong></div>
          <div className={`${campoLectura} ${ancho}`}><span className={etiqueta}>Dirección de entrega</span><strong className={valor}>{cliente.direccionEntrega || "—"}</strong></div>
          <div className={`${campoLectura} ${ancho}`}><span className={etiqueta}>Nota interna</span><strong className={valor}>{cliente.observacion || "—"}</strong></div>
        </div>
      )}

      {error && <NotificacionFlotante mensaje={error} />}
    </Dialogo>
  );
}
