import { useState, useId, useEffect, useRef, type FormEvent } from "react";
import { Button } from "../../components/ui/button";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { clasesCamposPrecio, clasesTablaDialogo, DialogoCatalogo, ReferenciasPrecio, estadoPrecio, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { servicioProductos, type CatalogosProducto, type ConfiguracionPrecio, type HistorialProducto, type PrecioProducto, type Producto } from "../../services/inventario/productos.service";

type Identificacion = { producto: Producto; alCerrar: () => void };

export function FichaRepuesto({ producto, historial, alCerrar, alEditar }: Identificacion & {
  historial: HistorialProducto;
  alEditar?: () => void;
}) {
  const [seccion, setSeccion] = useState<"datos" | "movimientos" | "comercial">("datos");
  const datos = [
    ["Marca", producto.marca], ["Categoría", producto.categoria], ["Unidad base", producto.unidadBase],
    ["Afectación del IGV", producto.afectacionIgv.toLowerCase()], ...Object.entries(producto.fichaTecnica),
  ];
  return <DialogoCatalogo titulo="Ficha del repuesto" articulo={producto.nombre} codigo={producto.codigoInterno} alCerrar={alCerrar} acciones={alEditar && <>
    {alEditar && <BotonEditarConfirmacion titulo="¿Editar este repuesto?" descripcion={`Vas a abrir ${producto.nombre} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver a la ficha" etiquetaConfirmar="Sí, editar repuesto" onConfirmar={alEditar}><Button type="button" variant="outline">Editar datos</Button></BotonEditarConfirmacion>}
  </>}>
    <dl className="m-0 grid grid-cols-3 gap-3 border-b border-[var(--erp-border)] pb-4 text-sm">
      <div><dt className="text-xs">Existencias</dt><dd className="m-0 font-semibold">{Number(producto.stockActual).toLocaleString("es-PE")} {producto.unidadBase}</dd></div>
      <div><dt className="text-xs">Precio general</dt><dd className="m-0 font-semibold">{producto.precioGeneral == null ? "Sin precio" : monedaInventario(producto.precioGeneral)}</dd></div>
      <div><dt className="text-xs">Estado</dt><dd className="m-0 font-semibold">{producto.activo ? "Activo" : "Inactivo"}</dd></div>
    </dl>
    <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Secciones de la ficha">
      <Button variant={seccion === "datos" ? "secondary" : "ghost"} aria-pressed={seccion === "datos"} onClick={() => setSeccion("datos")}>Datos técnicos</Button>
      <Button variant={seccion === "movimientos" ? "secondary" : "ghost"} aria-pressed={seccion === "movimientos"} onClick={() => setSeccion("movimientos")}>Movimientos</Button>
      <Button variant={seccion === "comercial" ? "secondary" : "ghost"} aria-pressed={seccion === "comercial"} onClick={() => setSeccion("comercial")}>Historial comercial</Button>
    </div>
    {seccion === "datos" && <div className="grid gap-4 text-sm">
      {producto.descripcion && <p className="m-0">{producto.descripcion}</p>}
      <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {datos.map(([etiqueta, valor]) => <div key={String(etiqueta)}><dt className="text-xs text-[var(--erp-ink-muted)]">{etiqueta}</dt><dd className="m-0 break-words font-medium">{typeof valor === "boolean" ? valor ? "Sí" : "No" : valor ?? "—"}</dd></div>)}
      </dl>
      <section><h3 className="my-1 font-semibold">Presentaciones</h3>
        <ul className="m-0 list-none p-0">{producto.presentaciones.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 border-t border-[var(--erp-border)] py-2"><strong>{item.nombre}</strong><span>{Number(item.factorAUnidadBase).toLocaleString("es-PE")} {producto.unidadBase} · {[item.seCompra && "Compra", item.seVende && "Venta"].filter(Boolean).join(" / ")}</span></li>)}</ul>
      </section>
      {producto.codigos.length > 0 && <section><h3 className="my-1 font-semibold">Códigos</h3>
        <ul className="m-0 list-none p-0">{producto.codigos.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 border-t border-[var(--erp-border)] py-2"><span>{item.tipo === "BARRAS" ? "Código de barras" : item.tipo === "FABRICANTE" ? "Fabricante / OEM" : item.tipo}</span><strong>{item.codigo}</strong></li>)}</ul>
      </section>}
    </div>}
    {seccion === "movimientos" && (historial.movimientos.length ? <div className="overflow-x-auto"><table className={clasesTablaDialogo}>
      <thead><tr><th>Fecha</th><th>Movimiento</th><th>Cantidad base</th><th>Motivo</th></tr></thead>
      <tbody>{historial.movimientos.map((item) => <tr key={item.id}><td>{fechaInventario(item.fecha)}</td><td>{item.tipo.toLowerCase()}</td><td>{item.sentido === "RETIRO" || item.tipo === "SALIDA" ? "−" : "+"}{Number(item.cantidad).toLocaleString("es-PE")}</td><td>{item.motivo?.replaceAll("_", " ").toLowerCase() || "—"}</td></tr>)}</tbody>
    </table></div> : <p>No hay movimientos registrados.</p>)}
    {seccion === "comercial" && <dl className="grid grid-cols-2 gap-3 text-sm">
      <div><dt>Último costo de compra por unidad base</dt><dd className="m-0 font-semibold">{monedaInventario(historial.compra?.importe)}</dd><dd className="m-0">{fechaInventario(historial.compra?.fecha)}</dd></div>
      <div><dt>Último precio vendido por unidad base</dt><dd className="m-0 font-semibold">{monedaInventario(historial.venta?.importe)}</dd><dd className="m-0">{fechaInventario(historial.venta?.fecha)}</dd></div>
    </dl>}
  </DialogoCatalogo>;
}

export function PreciosRepuesto({ producto, catalogos, alCerrar, alGuardar, puedeEditar }: Identificacion & {
  catalogos: CatalogosProducto;
  alGuardar: () => Promise<Producto | null>;
  puedeEditar: boolean;
}) {
  const idFormulario = useId();
  const importeRef = useRef<HTMLInputElement>(null);
  const presentaciones = producto.presentaciones.filter((item) => item.seVende);
  const [datos, setDatos] = useState<ConfiguracionPrecio>(() => ({
    presentacionId: presentaciones.find((item) => item.esBase)?.id ?? presentaciones[0]?.id ?? "",
    tipoListaPrecioId: catalogos.tiposListasPrecio.find((item) => item.codigo === "GENERAL")?.id ?? catalogos.tiposListasPrecio[0]?.id ?? "",
    cantidadMinima: "1", precio: "", vigenteDesde: "", vigenteHasta: "",
  }));
  const [articulo, setArticulo] = useState(producto);
  const [edicion, setEdicion] = useState<PrecioProducto | null>(null);
  const [costos, setCostos] = useState<Awaited<ReturnType<typeof servicioProductos.costosCompra>> | null>(null);
  const [errorCostos, setErrorCostos] = useState(false);
  useEffect(() => {
    let vigente = true;
    void servicioProductos.costosCompra(producto.id).then((datos) => { if (vigente) setCostos(datos); }).catch(() => { if (vigente) setErrorCostos(true); });
    return () => { vigente = false; };
  }, [producto.id]);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const ahora = Date.now();
  function cambiar(campo: keyof ConfiguracionPrecio, valor: string) {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true); setError(""); setMensaje("");
    try {
      if (edicion?.id) await servicioProductos.corregirPrecio(producto.id, edicion.id, datos.precio, edicion.precio);
      else await servicioProductos.configurarPrecio(producto.id, datos);
      setEdicion(null);
      const actualizado = await alGuardar();
      if (actualizado) setArticulo(actualizado);
      setDatos((actual) => ({ ...actual, precio: "", vigenteDesde: "", vigenteHasta: "" }));
      setMensaje(actualizado ? "Precio guardado." : "Precio guardado. Vuelve a abrir el artículo para actualizar el historial.");
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el precio.");
    } finally { setGuardando(false); }
  }
  return <DialogoCatalogo titulo={puedeEditar ? "Configurar precios" : "Precios del repuesto"} articulo={producto.nombre} codigo={producto.codigoInterno} alCerrar={alCerrar} guardando={guardando} acciones={<>
    <Button type="button" variant="outline" onClick={alCerrar} disabled={guardando}>Cerrar</Button>
    {puedeEditar && <Button type="submit" form={idFormulario} disabled={guardando || (!edicion && (!datos.presentacionId || !datos.tipoListaPrecioId))}>{guardando ? "Guardando…" : edicion ? "Guardar corrección" : "Guardar precio"}</Button>}
  </>}>
    {costos ? <ReferenciasPrecio vigente={articulo.precioGeneral} promedio={costos.promedioPonderado} ultimo={costos.ultima?.importe} fecha={costos.ultima?.fecha} base={articulo.unidadBase.toLocaleLowerCase("es-PE")} />
      : <p role="status" className="mb-4 text-sm">{errorCostos ? "No se pudieron consultar los costos de compra." : "Consultando costos de compra…"}</p>}
    {puedeEditar && <form id={idFormulario} onSubmit={(evento) => void guardar(evento)} className="border-t border-[var(--erp-border)] pt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-base font-semibold">{edicion ? `Editar precio de ${edicion.tipoLista}` : "Registrar precio"}</h3>
        {edicion && <Button type="button" variant="ghost" disabled={guardando} onClick={() => { setEdicion(null); cambiar("precio", ""); }}>Cancelar edición</Button>}
      </div>
      {edicion && <p className="mt-0 text-sm">{presentaciones.find((opcion) => opcion.id === edicion.presentacionId)?.nombre} · Desde {Number(edicion.cantidadMinima).toLocaleString("es-PE")} · {estadoPrecio(edicion, ahora)}</p>}
      <fieldset disabled={guardando} className={`m-0 border-0 p-0 ${clasesCamposPrecio}`}>
        {!edicion && <label>Presentación<select required value={datos.presentacionId} onChange={(e) => cambiar("presentacionId", e.target.value)}>{presentaciones.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label>}
        {!edicion && <label>Lista<select required value={datos.tipoListaPrecioId} onChange={(e) => cambiar("tipoListaPrecioId", e.target.value)}>{catalogos.tiposListasPrecio.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</select></label>}
        <label>Precio de venta en soles<input ref={importeRef} type="number" min="0.10" max="9999999999.90" step="0.10" required value={datos.precio} onChange={(e) => cambiar("precio", e.target.value)} /></label>
        {!edicion && <label>Desde cantidad<input type="number" min="0.001" step="0.001" required value={datos.cantidadMinima} onChange={(e) => cambiar("cantidadMinima", e.target.value)} /></label>}
        {!edicion && <label>Vigente desde<input type="date" value={datos.vigenteDesde} onChange={(e) => cambiar("vigenteDesde", e.target.value)} /><small>Deja vacío para aplicar desde ahora.</small></label>}
        {!edicion && <label>Fin de vigencia<input type="date" value={datos.vigenteHasta} onChange={(e) => cambiar("vigenteHasta", e.target.value)} /><small>El precio deja de aplicar en esta fecha.</small></label>}
      </fieldset>
    </form>}
    {mensaje && <p role="status" className="mt-3 rounded-md bg-[var(--erp-surface-muted)] p-3 text-sm font-semibold">{mensaje}</p>}
    {error && <p role="alert" className="mt-3 rounded-md border border-[var(--erp-border)] p-3 text-sm text-[var(--erp-accent)]">{error}</p>}
    <section className="mt-5">
      <h3 className="mb-2 text-base font-semibold">Vigencias e historial</h3>
      {articulo.precios.length ? <div className="overflow-x-auto"><table className={`inventario-historial-precios ${clasesTablaDialogo}`}>
        <thead><tr><th>Presentación y lista</th><th>Desde cantidad</th><th>Precio</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Registrado por</th>{puedeEditar && <th>Acciones</th>}</tr></thead>
        <tbody>{articulo.precios.map((item) => {
          const presentacion = presentaciones.find((opcion) => opcion.id === item.presentacionId);
          const estado = estadoPrecio(item, ahora);
          const editable = item.id && presentacion && catalogos.tiposListasPrecio.some((lista) => lista.id === item.tipoListaPrecioId) && (estado === "Vigente" || estado === "Programado");
          return <tr key={item.id}>
            <td data-label="Presentación y lista">{articulo.presentaciones.find((opcion) => opcion.id === item.presentacionId)?.nombre ?? "Presentación archivada"}<small className="block">{item.tipoLista}</small></td>
            <td data-label="Desde cantidad">{Number(item.cantidadMinima).toLocaleString("es-PE")}</td><td data-label="Precio">{monedaInventario(item.precio)}</td>
            <td data-label="Inicio">{fechaInventario(item.vigenteDesde)}</td><td data-label="Fin">{fechaInventario(item.vigenteHasta)}</td>
            <td data-label="Estado">{estado}</td><td data-label="Registrado por">{item.usuario ?? "—"}</td>
            {puedeEditar && <td data-label="Acciones">{editable && <BotonEditarConfirmacion titulo="¿Editar este precio?" descripcion={`Vas a modificar el precio ${item.tipoLista} de esta presentación. Los cambios solo se aplicarán al guardar la corrección.`} etiquetaCancelar="Volver a los precios" etiquetaConfirmar="Sí, editar precio" onConfirmar={() => {
              setEdicion(item); cambiar("precio", item.precio); setError(""); setMensaje("");
              requestAnimationFrame(() => importeRef.current?.focus());
            }}><Button type="button" size="sm" variant="outline" disabled={guardando}>Editar</Button></BotonEditarConfirmacion>}</td>}
          </tr>;
        })}</tbody>
      </table></div> : <p className="text-sm">Todavía no hay precios para este repuesto.</p>}
    </section>
  </DialogoCatalogo>;
}
