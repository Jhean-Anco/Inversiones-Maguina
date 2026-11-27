import { useState, useId, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Pencil, Save } from "lucide-react";
import { BotonAccion } from "../../components/ui/boton-accion";
import { BotonEditarConfirmacion } from "../../components/ui/confirmar-edicion";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { DialogoCatalogo, estadoPrecio, fechaInventario, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { servicioProductos, type CatalogosProducto, type ConfiguracionPrecio, type HistorialProducto, type PrecioProducto, type Producto } from "../../services/inventario/productos.service";
import { dialogosModeloClasses as d, tonosPill } from "../inventario-mototaxis-page/dialogos-modelo-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

type Identificacion = { producto: Producto; alCerrar: () => void };

const secciones = [["datos", "Datos técnicos"], ["movimientos", "Movimientos"], ["comercial", "Historial comercial"]] as const;
const claseSelect = "box-border h-[46px] w-full min-w-0 appearance-none rounded-[10px] border border-[#c5d1db] bg-white pl-3 pr-9 text-[14px] font-normal text-[#142b42] outline-none transition-[border-color,box-shadow] focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933]";

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return <span className="relative block">
    <select {...props} className={claseSelect}>{children}</select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#52697d]" aria-hidden="true" />
  </span>;
}

const tonoPrecio = (estado: string) => estado === "Vigente" ? tonosPill.verde : estado === "Programado" ? tonosPill.azul : tonosPill.gris;

export function FichaRepuesto({ producto, historial, alCerrar, alEditar }: Identificacion & {
  historial: HistorialProducto;
  alEditar?: () => void;
}) {
  const [seccion, setSeccion] = useState<"datos" | "movimientos" | "comercial">("datos");
  const estado = producto.activo ? tonosPill.verde : tonosPill.gris;
  const datos = [
    ["Marca", producto.marca], ["Categoría", producto.categoria], ["Unidad base", producto.unidadBase],
    ["Afectación del IGV", producto.afectacionIgv.toLowerCase()], ...Object.entries(producto.fichaTecnica),
  ];
  return <DialogoCatalogo titulo="Ficha del repuesto" articulo={producto.nombre} codigo={producto.codigoInterno} alCerrar={alCerrar} acciones={alEditar && <>
    <BotonEditarConfirmacion titulo="¿Editar este repuesto?" descripcion={`Vas a abrir ${producto.nombre} para revisar sus datos. Los cambios solo se aplicarán cuando pulses «Guardar cambios».`} etiquetaCancelar="Volver a la ficha" etiquetaConfirmar="Sí, editar repuesto" onConfirmar={alEditar}><button type="button" className={d.botonSecundario}><Pencil className="size-4" aria-hidden="true" />Editar datos</button></BotonEditarConfirmacion>
  </>}>
    <div className={d.contenido}>
      <dl className={`${d.bloqueDatos} ${d.bloqueTres}`}>
        <div><dt>Existencias</dt><dd>{Number(producto.stockActual).toLocaleString("es-PE")} {producto.unidadBase}</dd></div>
        <div><dt>Precio general</dt><dd>{producto.precioGeneral == null ? "Sin precio" : monedaInventario(producto.precioGeneral)}</dd></div>
        <div><dt>Estado</dt><dd><span className={`${d.pill} !mx-0 ${estado.caja}`}><i className={`${d.punto} ${estado.punto}`} aria-hidden="true" />{producto.activo ? "Activo" : "Inactivo"}</span></dd></div>
      </dl>
      <div className={v.filters} role="group" aria-label="Secciones de la ficha">
        {secciones.map(([clave, etiqueta]) => <button key={clave} type="button" className={v.chip} aria-pressed={seccion === clave} onClick={() => setSeccion(clave)}>{etiqueta}</button>)}
      </div>
      {seccion === "datos" && <>
        {producto.descripcion && <p className={d.texto}>{producto.descripcion}</p>}
        <dl className={d.bloqueDatos}>
          {datos.map(([etiqueta, valor]) => <div key={String(etiqueta)}><dt>{etiqueta}</dt><dd>{typeof valor === "boolean" ? valor ? "Sí" : "No" : valor ?? "—"}</dd></div>)}
        </dl>
        <section className="grid gap-2.5">
          <h3 className={d.titulo}>Presentaciones</h3>
          <div className={d.tablaScroll}><table className={d.tabla}>
            <thead><tr><th>Presentación</th><th>Equivale a</th><th>Uso</th></tr></thead>
            <tbody>{producto.presentaciones.map((item) => <tr key={item.id}>
              <td className="font-bold text-[#0b2545]">{item.nombre}</td>
              <td>{Number(item.factorAUnidadBase).toLocaleString("es-PE")} {producto.unidadBase}</td>
              <td>{[item.seCompra && "Compra", item.seVende && "Venta"].filter(Boolean).join(" / ") || "—"}</td>
            </tr>)}</tbody>
          </table></div>
        </section>
        {producto.codigos.length > 0 && <section className="grid gap-2.5">
          <h3 className={d.titulo}>Códigos</h3>
          <div className={d.tablaScroll}><table className={d.tabla}>
            <thead><tr><th>Tipo</th><th>Código</th></tr></thead>
            <tbody>{producto.codigos.map((item) => <tr key={item.id}>
              <td>{item.tipo === "BARRAS" ? "Código de barras" : item.tipo === "FABRICANTE" ? "Fabricante / OEM" : item.tipo}</td>
              <td className="font-bold text-[#0b2545]">{item.codigo}</td>
            </tr>)}</tbody>
          </table></div>
        </section>}
      </>}
      {seccion === "movimientos" && (historial.movimientos.length ? <div className={d.tablaScroll}><table className={d.tabla}>
        <thead><tr><th>Fecha</th><th>Movimiento</th><th>Cantidad base</th><th>Motivo</th></tr></thead>
        <tbody>{historial.movimientos.map((item) => <tr key={item.id}>
          <td>{fechaInventario(item.fecha)}</td>
          <td className="capitalize">{item.tipo.toLowerCase()}</td>
          <td>{item.sentido === "RETIRO" || item.tipo === "SALIDA" ? "−" : "+"}{Number(item.cantidad).toLocaleString("es-PE")}</td>
          <td className="first-letter:uppercase">{item.motivo?.replaceAll("_", " ").toLowerCase() || "—"}</td>
        </tr>)}</tbody>
      </table></div> : <p className={d.vacio}>Todavía no hay movimientos de este repuesto.</p>)}
      {seccion === "comercial" && <dl className={d.bloqueDatos}>
        <div><dt>Último costo de compra</dt><dd>{historial.compra?.importe == null ? "Sin compras" : monedaInventario(historial.compra.importe)}</dd>{historial.compra?.fecha && <dd>{fechaInventario(historial.compra.fecha)}</dd>}</div>
        <div><dt>Último precio vendido</dt><dd>{historial.venta?.importe == null ? "Sin ventas" : monedaInventario(historial.venta.importe)}</dd>{historial.venta?.fecha && <dd>{fechaInventario(historial.venta.fecha)}</dd>}</div>
      </dl>}
      {seccion === "comercial" && <p className={d.nota}>Importes por unidad base ({producto.unidadBase.toLocaleLowerCase("es-PE")}).</p>}
    </div>
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
      setMensaje(actualizado ? "Precio guardado." : "Precio guardado. Vuelve a abrir el repuesto para actualizar el historial.");
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo guardar el precio.");
    } finally { setGuardando(false); }
  }
  const base = articulo.unidadBase.toLocaleLowerCase("es-PE");
  return <DialogoCatalogo titulo={puedeEditar ? "Configurar precios" : "Precios del repuesto"} articulo={producto.nombre} codigo={producto.codigoInterno} alCerrar={alCerrar} guardando={guardando} acciones={<>
    <button type="button" className={d.botonSecundario} onClick={alCerrar} disabled={guardando}>Cerrar</button>
    {puedeEditar && <button type="submit" form={idFormulario} className={d.botonPrincipal} disabled={guardando || (!edicion && (!datos.presentacionId || !datos.tipoListaPrecioId))}><Save className="size-4" aria-hidden="true" />{guardando ? "Guardando…" : edicion ? "Guardar corrección" : "Guardar precio"}</button>}
  </>}>
    {mensaje && <NotificacionFlotante tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />}
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <div className={d.contenido}>
      <section aria-label="Referencia de compra y venta" className="grid gap-1.5">
        {costos ? <dl className={`${d.bloqueDatos} ${d.bloqueTres}`}>
          <div><dt>Último costo de compra</dt><dd>{costos.ultima?.importe == null ? "Sin compras" : monedaInventario(costos.ultima.importe)}</dd>{costos.ultima?.fecha && <dd>{fechaInventario(costos.ultima.fecha)}</dd>}</div>
          <div><dt>Costo promedio de compra</dt><dd>{costos.promedioPonderado == null ? "Sin compras" : monedaInventario(costos.promedioPonderado)}</dd><dd>Ponderado por cantidad</dd></div>
          <div><dt>Precio general vigente</dt><dd className="!text-[#0b2545]">{articulo.precioGeneral == null ? "Sin precio" : monedaInventario(articulo.precioGeneral)}</dd></div>
        </dl> : <p role="status" className={d.vacio}>{errorCostos ? "No se pudieron consultar los costos de compra." : "Consultando costos de compra…"}</p>}
        <p className={d.nota}>Importes por unidad base ({base}).</p>
      </section>
      {puedeEditar && <form id={idFormulario} onSubmit={(evento) => void guardar(evento)} className={d.formulario}>
        <div className={d.tituloFila}>
          <h3 className={d.titulo}>{edicion ? `Editar precio de ${edicion.tipoLista}` : "Registrar precio"}</h3>
          {edicion && <button type="button" className={d.botonSecundario} disabled={guardando} onClick={() => { setEdicion(null); cambiar("precio", ""); }}>Cancelar edición</button>}
        </div>
        {edicion && <p className={d.nota}>{presentaciones.find((opcion) => opcion.id === edicion.presentacionId)?.nombre} · Desde {Number(edicion.cantidadMinima).toLocaleString("es-PE")} · {estadoPrecio(edicion, ahora)}</p>}
        <fieldset disabled={guardando} className={d.campos}>
          {!edicion && <label>Presentación *<Select required value={datos.presentacionId} onChange={(e) => cambiar("presentacionId", e.target.value)}>{presentaciones.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</Select></label>}
          {!edicion && <label>Lista *<Select required value={datos.tipoListaPrecioId} onChange={(e) => cambiar("tipoListaPrecioId", e.target.value)}>{catalogos.tiposListasPrecio.map((item) => <option value={item.id} key={item.id}>{item.nombre}</option>)}</Select></label>}
          <label className={edicion ? "col-span-full" : undefined}>Precio de venta (S/) *<input ref={importeRef} type="number" min="0.10" max="9999999999.90" step="0.10" required placeholder="Ej. 35.50" value={datos.precio} onChange={(e) => cambiar("precio", e.target.value)} /></label>
          {!edicion && <label>Desde cantidad *<input type="number" min="0.001" step="0.001" required value={datos.cantidadMinima} onChange={(e) => cambiar("cantidadMinima", e.target.value)} /></label>}
          {!edicion && <label>Vigente desde <span className={d.opcional}>Opcional</span><input type="date" value={datos.vigenteDesde} onChange={(e) => cambiar("vigenteDesde", e.target.value)} /><small>Vacío: se aplica desde ahora.</small></label>}
          {!edicion && <label>Fin de vigencia <span className={d.opcional}>Opcional</span><input type="date" value={datos.vigenteHasta} onChange={(e) => cambiar("vigenteHasta", e.target.value)} /><small>El precio deja de aplicar en esta fecha.</small></label>}
        </fieldset>
      </form>}
      <section className="grid gap-2.5">
        <h3 className={d.titulo}>Vigencias e historial</h3>
        {articulo.precios.length ? <div className={d.tablaScroll}><table className={`${d.tabla} min-w-[760px]`}>
          <thead><tr><th>Presentación y lista</th><th>Desde cant.</th><th>Precio</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Registrado por</th>{puedeEditar && <th>Acciones</th>}</tr></thead>
          <tbody>{articulo.precios.map((item) => {
            const presentacion = presentaciones.find((opcion) => opcion.id === item.presentacionId);
            const estado = estadoPrecio(item, ahora);
            const tono = tonoPrecio(estado);
            const editable = item.id && presentacion && catalogos.tiposListasPrecio.some((lista) => lista.id === item.tipoListaPrecioId) && (estado === "Vigente" || estado === "Programado");
            return <tr key={item.id}>
              <td>{articulo.presentaciones.find((opcion) => opcion.id === item.presentacionId)?.nombre ?? "Presentación archivada"}<small className="block text-[11px] text-[#6d8093]">{item.tipoLista}</small></td>
              <td>{Number(item.cantidadMinima).toLocaleString("es-PE")}</td>
              <td className="font-bold text-[#0b2545]">{monedaInventario(item.precio)}</td>
              <td>{fechaInventario(item.vigenteDesde)}</td><td>{fechaInventario(item.vigenteHasta)}</td>
              <td><span className={`${d.pill} ${tono.caja}`}><i className={`${d.punto} ${tono.punto}`} aria-hidden="true" />{estado}</span></td>
              <td>{item.usuario ?? "—"}</td>
              {puedeEditar && <td>{editable ? <div className={v.rowActions}><BotonEditarConfirmacion titulo="¿Editar este precio?" descripcion={`Vas a modificar el precio ${item.tipoLista} de esta presentación. Los cambios solo se aplicarán al guardar la corrección.`} etiquetaCancelar="Volver a los precios" etiquetaConfirmar="Sí, editar precio" onConfirmar={() => {
                setEdicion(item); cambiar("precio", item.precio); setError(""); setMensaje("");
                requestAnimationFrame(() => importeRef.current?.focus());
              }}><BotonAccion etiqueta={`Editar precio ${monedaInventario(item.precio)}`} tono="informativa" icono={<Pencil aria-hidden="true" />} disabled={guardando} /></BotonEditarConfirmacion></div> : <span className={d.nota}>—</span>}</td>}
            </tr>;
          })}</tbody>
        </table></div> : <p className={d.vacio}>Todavía no hay precios para este repuesto.</p>}
      </section>
    </div>
  </DialogoCatalogo>;
}
