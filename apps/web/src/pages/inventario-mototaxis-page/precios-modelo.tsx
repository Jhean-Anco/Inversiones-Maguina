import { useId, useRef, useState, type FormEvent } from "react";
import { DialogoCatalogo, estadoPrecio, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { Pencil, Save } from "lucide-react";
import { BotonAccion } from "../../components/ui/boton-accion";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { servicioMototaxis, type AnalisisModeloMototaxi, type ModeloMototaxi, type PrecioModeloMototaxi } from "../../services/mototaxis.service";
import { dialogosModeloClasses as d, tonosPill } from "./dialogos-modelo-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

export function PreciosModelo({ modelo, historial, compras, puedeEditar, alCerrar, alGuardar }: {
  modelo: ModeloMototaxi;
  historial: PrecioModeloMototaxi[];
  compras: AnalisisModeloMototaxi["compras"];
  puedeEditar: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const idFormulario = useId();
  const importeRef = useRef<HTMLInputElement>(null);
  const [precios, setPrecios] = useState(historial);
  const [precioActual, setPrecioActual] = useState(modelo.precioVenta);
  const [edicion, setEdicion] = useState<PrecioModeloMototaxi | null>(null);
  const [precioVenta, setPrecioVenta] = useState("");
  const [vigenteDesde, setVigenteDesde] = useState("");
  const [vigenteHasta, setVigenteHasta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const ahora = Date.now();

  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando || !puedeEditar) return;
    setGuardando(true); setError(""); setMensaje("");
    try {
      const guardado = edicion
        ? await servicioMototaxis.corregirPrecioModelo(modelo.id, edicion.id, precioVenta, edicion.precio)
        : await servicioMototaxis.actualizarPrecioVentaModelo(modelo.id, { precioVenta, vigenteDesde, vigenteHasta });
      setEdicion(null);
      setPrecioActual(guardado.precioVenta);
      setPrecioVenta(""); setVigenteDesde(""); setVigenteHasta("");
      setMensaje("Precio guardado.");
      alGuardar();
      try { setPrecios(await servicioMototaxis.preciosModelo(modelo.id)); }
      catch { setMensaje("Precio guardado. Vuelve a abrir el modelo para actualizar el historial."); }
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el precio.");
    } finally { setGuardando(false); }
  }

  const tonoEstado = (estado: string) => estado === "Vigente" ? tonosPill.verde : estado === "Programado" ? tonosPill.azul : tonosPill.gris;

  return <DialogoCatalogo titulo={puedeEditar ? "Configurar precios" : "Precios del modelo"} articulo={[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} codigo={modelo.codigo} alCerrar={alCerrar} guardando={guardando} acciones={<>
    <button type="button" className={d.botonSecundario} onClick={alCerrar} disabled={guardando}>Cerrar</button>
    {puedeEditar && <button type="submit" form={idFormulario} className={d.botonPrincipal} disabled={guardando}><Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : edicion ? "Guardar corrección" : "Guardar precio"}</button>}
  </>}>
    {mensaje && <NotificacionFlotante tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />}
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <div className={d.contenido}>
      <section aria-label="Referencia de compra y venta" className="grid gap-1.5">
        <dl className={`${d.bloqueDatos} ${d.bloqueTres}`}>
          <div><dt>Último costo de compra</dt><dd>{compras.ultimoPrecio == null ? "Sin compras" : monedaInventario(compras.ultimoPrecio)}</dd>{compras.ultima?.fecha && <dd>{fechaInventario(compras.ultima.fecha)}</dd>}</div>
          <div><dt>Costo promedio de compra</dt><dd>{compras.promedioPonderado == null ? "Sin compras" : monedaInventario(compras.promedioPonderado)}</dd><dd>Ponderado por cantidad</dd></div>
          <div><dt>Precio general vigente</dt><dd className="!text-[#0b2545]">{precioActual == null ? "Sin precio" : monedaInventario(precioActual)}</dd></div>
        </dl>
        <p className={d.nota}>Importes por mototaxi.</p>
      </section>
      {puedeEditar && <form id={idFormulario} onSubmit={(e) => void guardar(e)} className={d.formulario}>
        <div className={d.tituloFila}>
          <h3 className={d.titulo}>{edicion ? "Editar precio general" : "Registrar precio"}</h3>
          {edicion && <button type="button" className={d.botonSecundario} disabled={guardando} onClick={() => { setEdicion(null); setPrecioVenta(""); }}>Cancelar edición</button>}
        </div>
        <fieldset disabled={guardando} className={d.campos}>
          <label className={edicion ? "col-span-full" : undefined}>Precio de venta (S/) *<input ref={importeRef} type="number" min="0.01" max="999999999999.99" step="0.01" required placeholder="Ej. 12500.00" value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} /></label>
          {!edicion && <label>Vigente desde <span className={d.opcional}>Opcional</span><input type="date" value={vigenteDesde} onChange={(e) => setVigenteDesde(e.target.value)} /><small>Vacío: se aplica desde ahora.</small></label>}
          {!edicion && <label>Fin de vigencia <span className={d.opcional}>Opcional</span><input type="date" value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} /><small>El precio deja de aplicar en esta fecha.</small></label>}
        </fieldset>
      </form>}
      <section className="grid gap-2.5">
        <h3 className={d.titulo}>Vigencias e historial</h3>
        {precios.length ? <div className={d.tablaScroll}><table className={d.tabla}>
          <thead><tr><th>Precio</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Registrado por</th>{puedeEditar && <th>Acciones</th>}</tr></thead>
          <tbody>{precios.map((item) => {
            const estado = estadoPrecio(item, ahora);
            const tono = tonoEstado(estado);
            return <tr key={item.id}>
              <td className="font-bold text-[#0b2545]">{monedaInventario(item.precio)}</td><td>{fechaInventario(item.vigenteDesde)}</td>
              <td>{fechaInventario(item.vigenteHasta)}</td>
              <td><span className={`${d.pill} ${tono.caja}`}><i className={`${d.punto} ${tono.punto}`} aria-hidden="true" />{estado}</span></td>
              <td>{item.usuario ?? "—"}</td>
              {puedeEditar && <td>{(estado === "Vigente" || estado === "Programado") ? <div className={v.rowActions}><BotonEditarConfirmacion titulo="¿Editar este precio general?" descripcion="Vas a modificar el precio de venta del modelo. Los cambios solo se aplicarán al guardar la corrección." etiquetaCancelar="Volver a los precios" etiquetaConfirmar="Sí, editar precio" onConfirmar={() => {
                setEdicion(item); setPrecioVenta(item.precio); setError(""); setMensaje("");
                requestAnimationFrame(() => importeRef.current?.focus());
              }}><BotonAccion etiqueta={`Editar precio ${monedaInventario(item.precio)}`} tono="informativa" icono={<Pencil aria-hidden="true" />} disabled={guardando} /></BotonEditarConfirmacion></div> : <span className={d.nota}>—</span>}</td>}
            </tr>;
          })}</tbody>
        </table></div> : <p className={d.vacio}>Todavía no hay precios para este modelo.</p>}
      </section>
    </div>
  </DialogoCatalogo>;
}
