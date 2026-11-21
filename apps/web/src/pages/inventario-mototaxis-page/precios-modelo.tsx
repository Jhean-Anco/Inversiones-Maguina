import { useId, useRef, useState, type FormEvent } from "react";
import { clasesCamposPrecio, clasesTablaDialogo, DialogoCatalogo, ReferenciasPrecio, estadoPrecio, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { Button } from "../../components/ui/button";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { servicioMototaxis, type AnalisisModeloMototaxi, type ModeloMototaxi, type PrecioModeloMototaxi } from "../../services/mototaxis.service";

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

  return <DialogoCatalogo titulo={puedeEditar ? "Configurar precios" : "Precios del modelo"} articulo={[modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ")} codigo={modelo.codigo} alCerrar={alCerrar} guardando={guardando} acciones={<>
    <Button variant="outline" onClick={alCerrar} disabled={guardando}>Cerrar</Button>
    {puedeEditar && <Button type="submit" form={idFormulario} disabled={guardando}>{guardando ? "Guardando…" : edicion ? "Guardar corrección" : "Guardar precio"}</Button>}
  </>}>
    <ReferenciasPrecio vigente={precioActual} promedio={compras.promedioPonderado} ultimo={compras.ultimoPrecio} fecha={compras.ultima?.fecha} base="mototaxi" />
    {puedeEditar && <form id={idFormulario} onSubmit={(e) => void guardar(e)} className="border-t border-[var(--erp-border)] pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold">{edicion ? "Editar precio general" : "Registrar precio"}</h3>
        {edicion && <Button type="button" variant="ghost" disabled={guardando} onClick={() => { setEdicion(null); setPrecioVenta(""); }}>Cancelar edición</Button>}
      </div>
      <fieldset disabled={guardando} className={`m-0 border-0 p-0 ${clasesCamposPrecio}`}>
        <label className="sm:col-span-2">Precio de venta en soles<input ref={importeRef} type="number" min="0.01" max="999999999999.99" step="0.01" required value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} /></label>
        {!edicion && <label>Vigente desde<input type="date" value={vigenteDesde} onChange={(e) => setVigenteDesde(e.target.value)} /><small>Deja vacío para aplicar desde ahora.</small></label>}
        {!edicion && <label>Fin de vigencia<input type="date" value={vigenteHasta} onChange={(e) => setVigenteHasta(e.target.value)} /><small>El precio deja de aplicar en esta fecha.</small></label>}
      </fieldset>
    </form>}
    {mensaje && <p role="status" className="mt-3 rounded-md bg-[var(--erp-surface-muted)] p-3 text-sm font-semibold">{mensaje}</p>}
    {error && <p role="alert" className="mt-3 rounded-md border border-[var(--erp-border)] p-3 text-sm text-[var(--erp-accent)]">{error}</p>}
    <section className="mt-5">
      <h3 className="mb-2 text-base font-semibold">Vigencias e historial</h3>
      {precios.length ? <div className="overflow-x-auto"><table className={`inventario-historial-precios ${clasesTablaDialogo}`}>
        <thead><tr><th>Precio</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Registrado por</th>{puedeEditar && <th>Acciones</th>}</tr></thead>
        <tbody>{precios.map((item) => {
          const estado = estadoPrecio(item, ahora);
          return <tr key={item.id}>
            <td data-label="Precio">{monedaInventario(item.precio)}</td><td data-label="Inicio">{fechaInventario(item.vigenteDesde)}</td>
            <td data-label="Fin">{fechaInventario(item.vigenteHasta)}</td><td data-label="Estado">{estado}</td><td data-label="Registrado por">{item.usuario ?? "—"}</td>
            {puedeEditar && <td data-label="Acciones">{(estado === "Vigente" || estado === "Programado") && <BotonEditarConfirmacion titulo="¿Editar este precio general?" descripcion="Vas a modificar el precio de venta del modelo. Los cambios solo se aplicarán al guardar la corrección." etiquetaCancelar="Volver a los precios" etiquetaConfirmar="Sí, editar precio" onConfirmar={() => {
              setEdicion(item); setPrecioVenta(item.precio); setError(""); setMensaje("");
              requestAnimationFrame(() => importeRef.current?.focus());
            }}><Button type="button" size="sm" variant="outline" disabled={guardando}>Editar</Button></BotonEditarConfirmacion>}</td>}
          </tr>;
        })}</tbody>
      </table></div> : <p className="text-sm">Todavía no hay precios para este modelo.</p>}
    </section>
  </DialogoCatalogo>;
}
