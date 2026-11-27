import "./orden-servicio-editor.css";
import { Lock, Search, UserPlus, X } from "lucide-react";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { FormEventHandler, KeyboardEventHandler } from "react";
import { SelectorCuentaFinanciera } from "../../components/finanzas/selector-cuenta-financiera/selector-cuenta-financiera";
import type { ClienteRegistrado, OrdenServicio, ProductoParaIngreso } from "../../services/ingresos.service";
import { OrdenServicioDetalle } from "./orden-servicio-detalle";
import type { LineaOrden } from "./types";
import type { CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { etiquetasEstadoOrden, tonosEstadoOrden } from "./estados-orden";

type Vehiculo = { placa: string; diagnostico: string };

type OrdenServicioEditorProps = {
  alert: { message: string; onClose: () => void };
  onSubmit: FormEventHandler<HTMLFormElement>;
  orden: {
    activa: OrdenServicio | null;
    codigo: string;
    /** Estado que tendrá la orden al guardarla (solo informativo en edición). */
    estado: OrdenServicio["estado"];
    /** Hay cambios sin guardar respecto de la orden abierta. */
    modificada: boolean;
    fechaRecepcion: string;
    fechaAcabado: string;
    fechaMaxima: string;
    onFechaRecepcion: (fecha: string) => void;
    onFechaAcabado: (fecha: string) => void;
  };
  catalogo: {
    busqueda: string;
    productos: ProductoParaIngreso[];
    recientes: CatalogoReciente[];
    buscando: boolean;
    onBusqueda: (valor: string) => void;
    onAgregar: (producto: ProductoParaIngreso) => void;
    onAgregarReciente: (item: CatalogoReciente) => void;
  };
  vehiculo: { datos: Vehiculo; onChange: (datos: Vehiculo) => void };
  recepcion: { trabajadorId: string; condicion: string; personal: { id: string; nombre: string }[]; onTrabajador: (id: string) => void; onCondicion: (texto: string) => void };
  cliente: {
    seleccionado: ClienteRegistrado | null;
    nombreSeleccionado: string;
    busqueda: string;
    busquedaConfirmada: string;
    tipoDocumento: "DNI" | "RUC" | "NOMBRE";
    clientes: ClienteRegistrado[];
    buscando: boolean;
    onBusqueda: (valor: string) => void;
    onTipoDocumento: (tipo: "DNI" | "RUC" | "NOMBRE") => void;
    onBuscar: () => void;
    onEnter: KeyboardEventHandler<HTMLInputElement>;
    onSeleccionar: (cliente: ClienteRegistrado | null) => void;
    onAgregar: () => void;
  };
  detalle: {
    lineas: LineaOrden[];
    error: string;
    recientes: CatalogoReciente[];
    buscando: boolean;
    onAgregarReciente: (item: CatalogoReciente) => void;
    onAgregarServicio: () => void;
    onAgregarProducto: (producto: ProductoParaIngreso) => void;
    onActualizarLinea: (indice: number, cambios: Partial<LineaOrden>) => void;
    onQuitarLinea: (indice: number) => void;
  };
  pago: {
    motivo: string;
    onMotivo: (valor: string) => void;
    adelanto: string;
    onAdelanto: (valor: string) => void;
    maximoAdelanto: number;
    cuentaId: string;
    medio: string;
    onCuenta: (id: string, medio: string) => void;
    guardando: boolean;
    guardarDeshabilitado: boolean;
    etiquetaGuardar: string;
    onCancelar: () => void;
  };
  formatearSoles: (monto: number) => string;
  importes: { subtotal: number; igv: number; total: number };
};

const MAX_MOTIVO = 2000;
const nombreDocumento = (tipo: string) => (tipo === "06" ? "RUC" : tipo === "01" ? "DNI" : tipo);
const nombreCompleto = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((palabra) => palabra[0]).join("").toLocaleUpperCase("es-PE");

export function OrdenServicioEditor({ alert, onSubmit, orden, catalogo, vehiculo, recepcion, cliente, detalle, pago, formatearSoles, importes }: OrdenServicioEditorProps) {
  const edicion = Boolean(orden.activa);
  const tonoEstado = tonosEstadoOrden[orden.estado];
  const adelanto = Number(pago.adelanto) || 0;
  const saldo = Math.max(0, Math.round((importes.total - adelanto) * 100) / 100);
  const consultaCliente = cliente.busqueda.trim();

  return <div className="os-editor">
    {alert.message && <NotificacionFlotante mensaje={alert.message} onCerrar={alert.onClose} />}
    <form className="os-formulario" onSubmit={onSubmit}>
      <div className="os-indicadores">
        {edicion ? <>
          {orden.modificada && <span className="os-chip es-aviso"><i aria-hidden="true" />Cambios sin guardar</span>}
          <span className={`os-chip ${tonoEstado.caja}`}><i className={tonoEstado.punto} aria-hidden="true" />{etiquetasEstadoOrden[orden.estado]}</span>
        </> : <span className={`os-chip ${tonosEstadoOrden.ABIERTA.caja}`}><i className={tonosEstadoOrden.ABIERTA.punto} aria-hidden="true" />Se creará como Abierta</span>}
        <div className="os-numero"><span>N.° DE ORDEN</span><strong>{orden.activa?.codigo ?? orden.codigo}</strong></div>
      </div>

      <div className="os-disposicion">
        <div className="os-columna">
          <section className="os-tarjeta" aria-labelledby="os-titulo-recepcion">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">1</span><h3 id="os-titulo-recepcion">Recepción del móvil</h3></div>
            </div>
            {edicion && <div className="os-aviso" role="note"><Lock aria-hidden="true" size={18} />La fecha de recepción, la placa y el cliente no se pueden cambiar en una orden existente.</div>}
            <div className="os-campos">
              <label className="os-campo">Fecha de recepción
                <input type="date" value={orden.fechaRecepcion} max={orden.fechaMaxima} disabled={edicion} onChange={(evento) => orden.onFechaRecepcion(evento.target.value)} required />
              </label>
              <label className="os-campo">Fecha estimada de acabado
                <input type="date" value={orden.fechaAcabado} min={orden.fechaRecepcion} onChange={(evento) => orden.onFechaAcabado(evento.target.value)} required />
              </label>
              <label className="os-campo">{edicion ? "Placa o identificador" : "Placa o identificador *"}
                <input className="os-placa" value={vehiculo.datos.placa} disabled={edicion} onChange={(evento) => vehiculo.onChange({ ...vehiculo.datos, placa: evento.target.value.toLocaleUpperCase("es-PE") })} placeholder="Ej. ABC-123" required />
              </label>
            </div>

            <div className="os-cliente">
              <div className="os-campos">
              <label className="os-campo">Encargado de revisar el móvil
                  <select value={recepcion.trabajadorId} onChange={(evento) => recepcion.onTrabajador(evento.target.value)} required><option value="">Selecciona personal</option>{recepcion.personal.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select>
                </label>
              </div>
              <label className="os-campo">Comentario de cómo llega el móvil<textarea value={recepcion.condicion} maxLength={2000} rows={3} required onChange={(evento) => recepcion.onCondicion(evento.target.value)} placeholder="Describe el estado en que se recibe el móvil" /></label>
            </div>
            <div className="os-cliente">
              <label className="os-etiqueta" htmlFor="orden-cliente-busqueda">{edicion ? "Cliente" : "Cliente *"}</label>
              {orden.activa ? (
                <div className="os-cliente-fijo">
                  <span className="os-avatar" aria-hidden="true">{iniciales(orden.activa.clienteNombre)}</span>
                  <strong>{orden.activa.clienteNombre}</strong>
                  <span className="os-cliente-asignado"><Lock aria-hidden="true" size={14} />Asignado a la orden</span>
                </div>
              ) : cliente.seleccionado ? (
                <div className="os-cliente-fijo es-editable">
                  <span className="os-avatar" aria-hidden="true">{iniciales(cliente.nombreSeleccionado)}</span>
                  <div className="os-cliente-datos">
                    <strong>{cliente.nombreSeleccionado}</strong>
                    {(cliente.seleccionado.documentos?.length ? cliente.seleccionado.documentos : [{ tipoDocumento: cliente.seleccionado.tipoDocumento, numeroDocumento: cliente.seleccionado.numeroDocumento }]).map((documento) => <span key={`${documento.tipoDocumento}-${documento.numeroDocumento}`}>{nombreDocumento(documento.tipoDocumento)} {documento.numeroDocumento}</span>)}
                    {cliente.seleccionado.direccion?.trim() && <span>{cliente.seleccionado.direccion}</span>}
                  </div>
                  <button className="os-cliente-cambiar" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => cliente.onSeleccionar(null)}><X aria-hidden="true" size={18} /></button>
                </div>
              ) : (
                <div className="os-cliente-buscador">
                  <div className="os-cliente-fila">
                    <select aria-label="Tipo de documento para buscar" value={cliente.tipoDocumento} onChange={(evento) => cliente.onTipoDocumento(evento.target.value as typeof cliente.tipoDocumento)}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option></select>
                    <input id="orden-cliente-busqueda" inputMode={cliente.tipoDocumento === "NOMBRE" ? "text" : "numeric"} maxLength={cliente.tipoDocumento === "DNI" ? 8 : cliente.tipoDocumento === "RUC" ? 11 : 120} value={cliente.busqueda} onChange={(evento) => cliente.onBusqueda(evento.target.value)} onKeyDown={cliente.onEnter} placeholder={cliente.tipoDocumento === "NOMBRE" ? "Buscar por nombre" : `Ingresa ${cliente.tipoDocumento}`} autoComplete="off" aria-label={cliente.tipoDocumento === "NOMBRE" ? "Nombre del cliente" : `Número de ${cliente.tipoDocumento}`} required />
                    <button className="os-boton-oscuro" type="button" onClick={cliente.onBuscar} disabled={cliente.buscando}><Search aria-hidden="true" size={16} strokeWidth={2} />{cliente.buscando ? "Buscando…" : "Buscar cliente"}</button>
                    <button className="os-boton-icono" type="button" aria-label="Agregar cliente" title="Agregar cliente" onClick={cliente.onAgregar}><UserPlus aria-hidden="true" size={20} strokeWidth={1.9} /></button>
                  </div>
                  {cliente.clientes.length > 0 && <ul className="os-cliente-resultados" aria-label="Resultados de clientes">
                    {cliente.clientes.map((item) => <li key={item.id}><button type="button" onClick={() => cliente.onSeleccionar(item)}><strong>{nombreCompleto(item)}</strong><small>{nombreDocumento(item.tipoDocumento)} · {item.numeroDocumento}</small></button></li>)}
                  </ul>}
                  {cliente.busquedaConfirmada === consultaCliente && consultaCliente.length >= 2 && cliente.clientes.length === 0 && <NotificacionFlotante tipo="informacion" mensaje="No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +." />}
                </div>
              )}
            </div>
          </section>

          <OrdenServicioDetalle
            lineas={detalle.lineas}
            productos={catalogo.productos}
            busqueda={catalogo.busqueda}
            recientes={catalogo.recientes}
            buscando={catalogo.buscando}
            onAgregarReciente={catalogo.onAgregarReciente}
            error={detalle.error}
            formatearSoles={formatearSoles}
            onBusqueda={catalogo.onBusqueda}
            onAgregarServicio={detalle.onAgregarServicio}
            onAgregarProducto={detalle.onAgregarProducto}
            onActualizarLinea={detalle.onActualizarLinea}
            onQuitarLinea={detalle.onQuitarLinea}
          />

          <section className="os-tarjeta">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">3</span><h3>Motivo de ingreso <small>(opcional)</small></h3></div>
            </div>
            <textarea className="os-motivo" aria-label="Motivo de ingreso (opcional)" value={pago.motivo} maxLength={MAX_MOTIVO} rows={3} onChange={(evento) => pago.onMotivo(evento.target.value)} placeholder="Describe por qué ingresa el vehículo al taller" />
            <span className="os-contador-motivo">{pago.motivo.length} / {MAX_MOTIVO}</span>
          </section>
        </div>

        <aside className="os-resumen" aria-label="Resumen de la orden">
          <h3>Resumen de la orden</h3>
          <dl className="os-importes" aria-label="Desglose de importes de la orden">
            <div><dt>Subtotal sin IGV</dt><dd>{formatearSoles(importes.subtotal)}</dd></div>
            <div><dt>IGV (18%)</dt><dd>{formatearSoles(importes.igv)}</dd></div>
            <div className="es-total"><dt>Total de la orden</dt><dd>{formatearSoles(importes.total)}</dd></div>
          </dl>
          <div className="os-adelanto">
            <label className="os-campo">Monto de adelanto recibido
              <span className="os-monto"><span aria-hidden="true">S/</span><input type="number" min="0" step="0.01" max={pago.maximoAdelanto} value={pago.adelanto} onChange={(evento) => pago.onAdelanto(evento.target.value)} /></span>
            </label>
            <SelectorCuentaFinanciera value={pago.cuentaId} medioActual={pago.medio} etiqueta="Cuenta donde se recibe el adelanto" required={adelanto > 0} onChange={pago.onCuenta} />
            <div className="os-saldo"><span>Saldo por cobrar</span><strong>{formatearSoles(saldo)}</strong></div>
          </div>
          <div className="os-acciones">
            <button className="os-guardar" type="submit" disabled={pago.guardarDeshabilitado}>{pago.etiquetaGuardar}<span aria-hidden="true">→</span></button>
            <button className="os-cancelar" type="button" disabled={pago.guardando} onClick={pago.onCancelar}>Cancelar</button>
          </div>
        </aside>
      </div>
    </form>
  </div>;
}
