import "../ordenes-servicio-page/orden-servicio-editor.css";
import "./nota-ajuste.css";
import { useState, type FormEvent } from "react";
import { ChevronDown, MessageSquareText, Plus, Printer, X } from "lucide-react";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ConfirmarDescarteFormulario } from "../../components/ui/confirmar-descarte-formulario";
import { importeLineaEdicion, lineaDeServicio, lineaDesdeMototaxi, lineaDesdeProducto, validarEdicion } from "../../domain/ingresos/edicion-nota-venta";
import { useEditarNotaVenta } from "../../hooks/use-editar-nota-venta";
import { documentoDeIngreso, type ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { servicioIngresos, type ClienteRegistrado } from "../../services/ingresos.service";
import { tonosEstadoOrden } from "../ordenes-servicio-page/estados-orden";
import { BuscadorEdicionNota } from "./buscador-edicion-nota";
import { medioPago, soles } from "./ventas-formatters";

const MEDIOS_PAGO = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "BILLETERA_DIGITAL", "OTRO"];
const LIMITE_OBSERVACION = 1000;
const nuevaClave = () => `nueva-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const nombreCliente = (cliente: ClienteRegistrado) => cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((palabra) => palabra[0]).join("").toLocaleUpperCase("es-PE");

type Props = { ingresoId: string; codigo: string; esMototaxi: boolean; onCerrar: () => void; onGuardada: (mensaje: string) => void };

/** Edición de una nota de venta con la estructura `os-*` de Órdenes de servicio. Guardar también imprime el ticket. */
export function EditorNotaVenta({ ingresoId, codigo, esMototaxi, onCerrar, onGuardada }: Props) {
  const edicion = useEditarNotaVenta(ingresoId, onGuardada);
  const imprimirAlGuardar = useImprimirAlEmitir(useAlertas());
  const [cambiandoCliente, setCambiandoCliente] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [modificada, setModificada] = useState(false);
  const [errorImpresion, setErrorImpresion] = useState("");
  const { nota, formulario } = edicion;
  const bloqueada = Boolean(nota && !nota.editable);
  const tono = tonosEstadoOrden.ABIERTA;
  const cambiar: typeof edicion.cambiar = (cambios) => { setModificada(true); edicion.cambiar(cambios); };
  const cambiarLinea: typeof edicion.cambiarLinea = (clave, cambios) => { setModificada(true); edicion.cambiarLinea(clave, cambios); };

  function guardarEImprimir(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!formulario || bloqueada || edicion.guardando) return;
    if (validarEdicion(formulario, edicion.hoy)) { void edicion.guardar(); return; }
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    setErrorImpresion("");
    const preparacion = imprimirAlGuardar.preparar("TICKET");
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { setErrorImpresion(mensajeErrorImpresion(problema)); return; }
      await edicion.guardar(undefined, () => void imprimirAlGuardar.imprimir(documentoDeIngreso({ ingresoId }), preparada));
    })();
  }

  return <div className="os-editor nota-venta-editor">
    {edicion.error && <NotificacionFlotante tipo="error" mensaje={edicion.error} accion={!formulario ? { etiqueta: "Volver a cargar", ejecutar: () => void edicion.recargar() } : undefined} />}
    {errorImpresion && <NotificacionFlotante tipo="error" mensaje={errorImpresion} onCerrar={() => setErrorImpresion("")} />}
    <form className="os-formulario" noValidate onSubmit={guardarEImprimir}>
      <div className="os-indicadores">
        {modificada && <span className="os-chip es-aviso"><i aria-hidden="true" />Cambios sin guardar</span>}
        <span className={`os-chip ${tono.caja}`}><i className={tono.punto} aria-hidden="true" />Nota de venta · {esMototaxi ? "mototaxis" : "repuestos"}</span>
        <div className="os-numero"><span>N.° DE NOTA</span><strong>{codigo}</strong></div>
      </div>

      {edicion.cargando && <div className="os-tarjeta"><div className="os-vacio" role="status"><strong>Cargando la nota de venta…</strong></div></div>}
      {bloqueada && <div className="os-aviso" role="alert">{nota!.motivoNoEditable}</div>}

      {formulario && !edicion.cargando && <fieldset className="nota-venta-campos" disabled={edicion.guardando || bloqueada}>
        <div className="os-disposicion">
          <div className="os-columna">
            <section className="os-tarjeta" aria-labelledby="nv-titulo-datos">
              <div className="os-tarjeta-cabecera">
                <div className="os-titulo"><span className="os-paso" aria-hidden="true">1</span><h3 id="nv-titulo-datos">Datos de la nota</h3></div>
              </div>
              <div className="os-campos venta-campos">
                <label className="os-campo">Fecha *
                  <input type="date" max={edicion.hoy} value={formulario.fecha} onChange={(evento) => cambiar({ fecha: evento.target.value })} required />
                </label>
                <label className="os-campo">Medio de pago *
                  <span className="os-select">
                    <select value={formulario.medioPago} onChange={(evento) => cambiar({ medioPago: evento.target.value })}>
                      {MEDIOS_PAGO.map((codigoMedio) => <option key={codigoMedio} value={codigoMedio}>{medioPago(codigoMedio)}</option>)}
                    </select>
                    <ChevronDown aria-hidden="true" size={16} />
                  </span>
                </label>
              </div>
              <div className="os-cliente">
                <span className="os-etiqueta">Cliente *</span>
                {cambiandoCliente ? <BuscadorEdicionNota etiqueta="Buscar cliente" placeholder="Buscar por nombre o documento…" buscar={(texto) => servicioIngresos.buscarClientes(texto)}
                  describir={(cliente) => ({ id: cliente.id, titulo: nombreCliente(cliente), detalle: cliente.numeroDocumento })}
                  onElegir={(cliente) => { cambiar({ clienteId: cliente.id, clienteNombre: nombreCliente(cliente) }); setCambiandoCliente(false); }} />
                  : <div className="os-cliente-fijo es-editable">
                    <span className="os-avatar" aria-hidden="true">{iniciales(formulario.clienteNombre || "Clientes varios")}</span>
                    <div className="os-cliente-datos"><strong>{formulario.clienteNombre?.trim() || "Clientes varios"}</strong></div>
                    <button className="os-cliente-cambiar" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => setCambiandoCliente(true)}><X aria-hidden="true" size={18} /></button>
                  </div>}
              </div>
            </section>

            <section className="os-tarjeta" aria-labelledby="nv-titulo-detalle">
              <div className="os-tarjeta-cabecera is-dividida">
                <div className="os-titulo">
                  <span className="os-paso" aria-hidden="true">2</span>
                  <h3 id="nv-titulo-detalle">Detalle de la nota</h3>
                  <span className="os-contador">{formulario.lineas.length} {formulario.lineas.length === 1 ? "línea" : "líneas"}</span>
                </div>
                {!esMototaxi && <button className="os-boton-servicio" type="button" onClick={() => { setModificada(true); edicion.agregarLinea(lineaDeServicio(nuevaClave())); }}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Agregar servicio</button>}
              </div>
              {esMototaxi
                ? <BuscadorEdicionNota etiqueta="Agregar modelo de mototaxi" placeholder="Buscar mototaxi por modelo, marca o código…" buscar={(texto) => servicioIngresos.buscarMototaxis(texto)}
                    describir={(moto) => ({ id: moto.mototaxiModeloId, titulo: `${moto.marca} ${moto.modelo}`, detalle: "Mototaxi", precio: moto.precioVenta ? soles(moto.precioVenta) : undefined })}
                    onElegir={(moto) => { setModificada(true); edicion.agregarLinea(lineaDesdeMototaxi(nuevaClave(), moto)); }} />
                : <BuscadorEdicionNota etiqueta="Agregar repuesto" placeholder="Buscar repuesto por nombre o código…" buscar={(texto) => servicioIngresos.buscarProductos(texto, false, false, true)}
                    describir={(producto) => ({ id: producto.presentacionId, titulo: producto.nombre, detalle: producto.presentacion, precio: soles(producto.precio) })}
                    onElegir={(producto) => { setModificada(true); edicion.agregarLinea(lineaDesdeProducto(nuevaClave(), producto)); }} />}

              {formulario.lineas.length === 0 ? <div className="os-vacio"><strong>La nota no tiene líneas</strong><span>Busca un artículo o agrega un servicio.</span></div>
                : <div className="os-lineas">
                  <div className="os-lineas-cabecera" aria-hidden="true"><span>DESCRIPCIÓN</span><span>CANT.</span><span>PRECIO</span><span>DESCUENTO</span><span>TOTAL</span><span /></div>
                  {formulario.lineas.map((linea, indice) => {
                    const esServicio = linea.tipo === "SERVICIO";
                    const nombre = linea.descripcion || `línea ${indice + 1}`;
                    return <div key={linea.clave} className={`os-linea ${esServicio ? "es-servicio" : "es-producto"}`}>
                      <div className="os-linea-descripcion">
                        {esServicio ? <input aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={linea.descripcion.toLocaleUpperCase("es-PE")} onChange={(evento) => cambiarLinea(linea.clave, { descripcion: evento.target.value.toLocaleUpperCase("es-PE") })} />
                          : <input aria-label={`Descripción de ${nombre}`} title={nombre} value={linea.descripcion} readOnly />}
                        {linea.bloqueo && <small className="venta-linea-detalle es-aviso">{linea.bloqueo} No se puede cambiar su cantidad ni quitarla.</small>}
                      </div>
                      <label className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
                        <input aria-label={`Cantidad de ${nombre}`} type="number" inputMode="decimal" min={linea.tipo === "MOTOTAXI" ? 1 : 0.001} step={linea.tipo === "MOTOTAXI" ? 1 : 0.001} disabled={Boolean(linea.bloqueo)} value={linea.cantidad} onChange={(evento) => cambiarLinea(linea.clave, { cantidad: evento.target.value })} />
                      </label>
                      <label className="os-linea-campo os-linea-precio"><span>Precio</span>
                        <input aria-label={`Precio unitario de ${nombre}`} type="number" inputMode="decimal" min={0} step="any" readOnly={linea.tipo === "MOTOTAXI"} value={linea.precio} onChange={(evento) => cambiarLinea(linea.clave, { precio: evento.target.value })} />
                      </label>
                      <label className="os-linea-campo os-linea-descuento"><span>Descuento</span>
                        <input aria-label={`Descuento de ${nombre}`} type="number" inputMode="decimal" min={0} step={0.01} value={linea.descuento} onChange={(evento) => cambiarLinea(linea.clave, { descuento: evento.target.value })} />
                      </label>
                      <div className="os-linea-total"><span>Total</span><strong>{soles(String(importeLineaEdicion(linea)))}</strong></div>
                      {linea.bloqueo ? <span aria-hidden="true" /> : <button className="os-linea-quitar" type="button" aria-label={`Quitar ${nombre}`} onClick={() => { setModificada(true); edicion.quitarLinea(linea.clave); }}><X aria-hidden="true" size={16} /></button>}
                    </div>;
                  })}
                </div>}
            </section>

            <section className="os-tarjeta" aria-labelledby="nv-titulo-observacion">
              <div className="os-tarjeta-cabecera">
                <div className="os-titulo"><span className="os-paso" aria-hidden="true">3</span><h3 id="nv-titulo-observacion">Observaciones</h3></div>
              </div>
              <div className="os-revision">
                <label className="os-campo os-revision-condicion">
                  <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Nota para el documento <em className="os-opcional">Opcional</em></span>
                  <textarea maxLength={LIMITE_OBSERVACION} rows={3} value={formulario.observacion} onChange={(evento) => cambiar({ observacion: evento.target.value })} placeholder="Ej. El cliente recoge los repuestos restantes el lunes." />
                  <small className="os-ayuda os-contador">{formulario.observacion.length}/{LIMITE_OBSERVACION}</small>
                </label>
              </div>
            </section>
          </div>

          <aside className="os-resumen" aria-label="Resumen de la nota de venta">
            <h3>Resumen de la nota</h3>
            <dl className="os-importes">
              <div className="es-total"><dt>Total de la nota</dt><dd aria-live="polite">{soles(String(edicion.total))}</dd></div>
            </dl>
            {edicion.requiereDevolucion && <label className="nota-venta-devolucion">
              <input type="checkbox" checked={edicion.devolucionConfirmada} onChange={(evento) => edicion.setDevolucionConfirmada(evento.target.checked)} />
              Confirmo que devolveré al cliente el exceso cobrado; los pagos registrados se reducirán al nuevo total.
            </label>}
            <div className="os-acciones">
              <button className="os-guardar" type="submit" disabled={edicion.guardando || edicion.cargando || bloqueada || (edicion.requiereDevolucion && !edicion.devolucionConfirmada)}><Printer aria-hidden="true" size={18} />{edicion.guardando ? "Guardando…" : "Imprimir nota de venta"}</button>
              <button className="os-cancelar" type="button" disabled={edicion.guardando} onClick={() => modificada ? setConfirmarDescarte(true) : onCerrar()}>Cancelar</button>
            </div>
          </aside>
        </div>
      </fieldset>}
    </form>
    {confirmarDescarte && <ConfirmarDescarteFormulario elemento="los cambios de la nota" accion="Descartar y volver al listado" onSeguirEditando={() => setConfirmarDescarte(false)} onDescartar={onCerrar} />}
  </div>;
}
