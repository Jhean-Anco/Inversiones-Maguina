import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { lineaDeServicio, lineaDesdeMototaxi, lineaDesdeProducto } from "../../domain/ingresos/edicion-nota-venta";
import { useEditarNotaVenta } from "../../hooks/use-editar-nota-venta";
import { servicioIngresos, type ClienteRegistrado } from "../../services/ingresos.service";
import { BuscadorEdicionNota } from "./buscador-edicion-nota";
import { LineaEdicionNota } from "./linea-edicion-nota";
import { medioPago, soles } from "./ventas-formatters";

const ID_FORMULARIO = "ventas-edicion-nota-form";
const MEDIOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"];
const campo = "h-11 w-full min-w-0 rounded-xl border border-[#c5d1db] bg-white px-3 text-sm font-medium text-[#142b42]";
const rotulo = "grid min-w-0 gap-1.5 text-xs font-bold text-[#52697d]";
const nuevaClave = () => `nueva-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");

type Props = { ingresoId: string; codigo: string; esMototaxi: boolean; onCerrar: () => void; onGuardada: (mensaje: string) => void };

export function DialogoEditarNotaVenta({ ingresoId, codigo, esMototaxi, onCerrar, onGuardada }: Props) {
  const edicion = useEditarNotaVenta(ingresoId, onGuardada);
  const { nota, formulario } = edicion;
  const bloqueada = Boolean(nota && !nota.editable);

  return (
    <Dialogo
      kicker="EDITAR NOTA DE VENTA" titulo={codigo} ancho="lg" cerrable={!edicion.guardando} onCerrar={onCerrar} pantallaCompletaMovil
      pie={<>
        <strong className="mr-auto self-center text-base tabular-nums text-[var(--erp-ink)]" aria-live="polite">Total {soles(String(edicion.total))}</strong>
        <button type="button" className="erp-btn erp-btn--secondary erp-btn--lg max-sm:w-full" disabled={edicion.guardando} onClick={onCerrar}>Cancelar</button>
        <button form={ID_FORMULARIO} type="submit" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full"
          disabled={edicion.guardando || edicion.cargando || !formulario || bloqueada || (edicion.requiereDevolucion && !edicion.devolucionConfirmada)}>
          {edicion.guardando ? "Guardando..." : "Guardar cambios"}
        </button>
      </>}
    >
      {edicion.cargando && <p className="m-0 text-sm text-[#52697d]" role="status">Cargando la nota de venta...</p>}
      {bloqueada && <p className="m-0 rounded-xl border border-[#f0d9a6] bg-[#fff8e8] p-3 text-sm text-[#6b4a00]" role="alert">{nota!.motivoNoEditable}</p>}
      {formulario && !edicion.cargando && <form id={ID_FORMULARIO} noValidate onSubmit={(evento) => void edicion.guardar(evento)}>
        <fieldset className="m-0 grid min-w-0 gap-[18px] border-0 p-0" disabled={edicion.guardando || bloqueada}>
          <p className="m-0 text-sm text-[#27445f]">Cliente: <strong>{formulario.clienteNombre || "Clientes varios"}</strong></p>
          <BuscadorEdicionNota etiqueta="Cambiar cliente" buscar={(texto) => servicioIngresos.buscarClientes(texto)}
            describir={(cliente) => ({ id: cliente.id, titulo: nombreCliente(cliente), detalle: cliente.numeroDocumento })}
            onElegir={(cliente) => edicion.cambiar({ clienteId: cliente.id, clienteNombre: nombreCliente(cliente) })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={rotulo}>Fecha<input className={campo} type="date" max={edicion.hoy} value={formulario.fecha} onChange={(evento) => edicion.cambiar({ fecha: evento.target.value })} /></label>
            <label className={rotulo}>Medio de pago<select className={campo} value={formulario.medioPago} onChange={(evento) => edicion.cambiar({ medioPago: evento.target.value })}>
              {MEDIOS_PAGO.map((codigoMedio) => <option key={codigoMedio} value={codigoMedio}>{medioPago(codigoMedio)}</option>)}
            </select></label>
          </div>
          {formulario.lineas.map((linea, indice) => <LineaEdicionNota key={linea.clave} linea={linea} numero={indice + 1}
            onCambiar={(cambios) => edicion.cambiarLinea(linea.clave, cambios)} onQuitar={() => edicion.quitarLinea(linea.clave)} />)}
          {esMototaxi
            ? <BuscadorEdicionNota etiqueta="Agregar modelo de mototaxi" buscar={(texto) => servicioIngresos.buscarMototaxis(texto)}
                describir={(moto) => ({ id: moto.mototaxiModeloId, titulo: `${moto.marca} ${moto.modelo}`, detalle: `${moto.stockDisponible} disponibles` })}
                onElegir={(moto) => edicion.agregarLinea(lineaDesdeMototaxi(nuevaClave(), moto))} />
            : <>
                <BuscadorEdicionNota etiqueta="Agregar repuesto" buscar={(texto) => servicioIngresos.buscarProductos(texto, false, false, true)}
                  describir={(producto) => ({ id: producto.presentacionId, titulo: producto.nombre, detalle: `${producto.presentacion} - ${soles(producto.precio)}` })}
                  onElegir={(producto) => edicion.agregarLinea(lineaDesdeProducto(nuevaClave(), producto))} />
                <button type="button" className="erp-btn erp-btn--secondary justify-self-start" onClick={() => edicion.agregarLinea(lineaDeServicio(nuevaClave()))}>Agregar servicio</button>
              </>}
          <label className={rotulo}>Observación<textarea className="min-h-20 rounded-xl border border-[#c5d1db] p-3 text-sm font-medium text-[#142b42]" maxLength={1000} value={formulario.observacion} onChange={(evento) => edicion.cambiar({ observacion: evento.target.value })} /></label>
          {edicion.requiereDevolucion && <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[#27445f]">
            <input className="mt-1 h-4 w-4 accent-[#0b2545]" type="checkbox" checked={edicion.devolucionConfirmada} onChange={(evento) => edicion.setDevolucionConfirmada(evento.target.checked)} />
            Confirmo que devolveré al cliente el exceso cobrado; los pagos registrados se reducirán al nuevo total.
          </label>}
        </fieldset>
      </form>}
      {edicion.error && <>
        <NotificacionFlotante tipo="error" mensaje={edicion.error} />
        <button type="button" className="erp-btn erp-btn--secondary self-start" disabled={edicion.guardando} onClick={() => void edicion.recargar()}>Volver a cargar la nota</button>
      </>}
    </Dialogo>
  );
}
