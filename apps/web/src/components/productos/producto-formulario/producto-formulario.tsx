import "./producto-formulario.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { redondearPrecioADecimos, type CatalogosProducto, type Producto } from "../../../services/inventario/productos.service";
import { useProductoFormulario } from "../../../hooks/use-producto-formulario";
import { ProductoCategoriaModal } from "../producto-categoria-modal/producto-categoria-modal";
import { srcImagen } from "../../../services/api-cliente";
import { AccionIcono } from "../../ui/accion-icono";

type PropiedadesProductoFormulario = {
  catalogos: CatalogosProducto;
  producto?: Producto | null;
  error: string;
  alCerrar: () => void;
  alGuardar: Parameters<typeof useProductoFormulario>[0]["alGuardar"];
  alCrearMarca: Parameters<typeof useProductoFormulario>[0]["alCrearMarca"];
  alCrearCategoria: Parameters<typeof useProductoFormulario>[0]["alCrearCategoria"];
};

export function ProductoFormulario({ catalogos, producto, error, alCerrar, alGuardar, alCrearMarca, alCrearCategoria }: PropiedadesProductoFormulario) {
  const formulario = useProductoFormulario({ producto, catalogos, alGuardar, alCrearMarca, alCrearCategoria });
  const codigoBase = catalogos.unidadesMedida.find((unidad) => unidad.codigo === formulario.unidadBaseCodigo)?.nombre ?? formulario.unidadBaseCodigo;
  const imagenesExistentes = (producto?.imagenes ?? []).filter((imagen) => !formulario.imagenesEliminadas.includes(imagen.id));
  const cantidadImagenes = imagenesExistentes.length + formulario.imagenesNuevas.length;

  const [paso, setPaso] = useState(1);
  const desplazamientoFormulario = useRef<HTMLDivElement>(null);

  useEffect(() => {
    desplazamientoFormulario.current?.scrollTo({ top: 0 });
  }, [paso]);
  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    if (paso === 2 && !formulario.tienePrecioGeneral) {
      evento.preventDefault();
      formulario.setErrorLocal("Agrega el precio general de la unidad base para continuar.");
      return;
    }
    if (paso < 3) {
      evento.preventDefault();
      formulario.setErrorLocal("");
      setPaso((actual) => actual + 1);
      return;
    }
    void formulario.guardar(evento);
  }

  return createPortal(<div className="catalog-modal-backdrop producto-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formulario.guardando) alCerrar(); }}>
    <section className="catalog-modal producto-modal" role="dialog" aria-modal="true" aria-labelledby="producto-form-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario" onClick={alCerrar}>×</button>
      {(error || formulario.errorLocal) && <div className="catalog-alert catalog-modal-alert" role="alert">{formulario.errorLocal || error}</div>}
      <form className="catalog-form producto-form" onSubmit={manejarEnvio}>
        <div className="producto-form-scroll" ref={desplazamientoFormulario}>
        <div className="catalog-form-title"><span>▧</span><div><h2 id="producto-form-title">{formulario.modoEdicion ? "Editar repuesto" : "Nuevo repuesto"}</h2><p>Registra los datos de catálogo, venta y presentaciones del repuesto.</p></div></div>
        <nav className="producto-wizard" aria-label="Pasos del producto">
          {["Datos básicos", "Inventario y venta", "Detalles opcionales"].map((titulo, indice) => {
            const numero = indice + 1;
            return <div className={`producto-wizard-step${paso === numero ? " is-current" : paso > numero ? " is-complete" : ""}`} aria-current={paso === numero ? "step" : undefined} key={titulo}>
              <span>{paso > numero ? "✓" : numero}</span><strong>{titulo}</strong>
            </div>;
          })}
        </nav>
        <p className="producto-wizard-hint">Paso {paso} de 3 · {paso === 1 ? "Comienza con lo esencial para reconocer el repuesto." : paso === 2 ? "Define cómo controlarás y venderás las existencias." : "Códigos, ficha técnica e imagen son opcionales; puedes completarlos después."}</p>
        {paso === 1 && (
          <fieldset className="producto-form-section">
            <legend>Identificación</legend>
            <div className="producto-form-grid">
              <label className="producto-span-2">Nombre del repuesto<input value={formulario.nombre} onChange={(event) => formulario.setNombre(event.target.value)} required minLength={2} maxLength={180} placeholder="Ej. Pastilla de freno delantero Honda Wave" /></label>
              <div className="producto-brand-field"><label>Categoría<select value={formulario.categoriaId} onChange={(event) => formulario.setCategoriaId(event.target.value)} required><option value="">Selecciona categoría</option>{catalogos.categorias.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select></label><button className="producto-brand-link" type="button" onClick={() => { formulario.setErrorLocal(""); formulario.setCategoriaModalAbierto(true); }}>+ Agregar categoría</button></div>
              <div className="producto-brand-field"><label>Marca<select value={formulario.marcaId} onChange={(event) => formulario.setMarcaId(event.target.value)} required><option value="">Selecciona marca</option>{catalogos.marcas.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select></label><button className="producto-brand-link" type="button" onClick={() => { formulario.setErrorLocal(""); formulario.setMarcaModalAbierto(true); }}>+ Agregar marca</button></div>
              <label className="producto-span-2">Descripción para búsqueda<input value={formulario.descripcion} onChange={(event) => formulario.setDescripcion(event.target.value)} maxLength={3000} placeholder="Describe cómo es, para qué sirve o cómo identificarlo" /></label>
            </div>
          </fieldset>
        )}
        {paso === 2 && <>
          <fieldset className="producto-form-section producto-commerce-section">
            <legend>Unidad y comprobante</legend>
            <div className="producto-form-grid">
              <label>Unidad base de inventario<select value={formulario.unidadBaseCodigo} onChange={(event) => formulario.setUnidadBaseCodigo(event.target.value)} required>{catalogos.unidadesMedida.map((unidad) => <option key={unidad.codigo} value={unidad.codigo}>{unidad.nombre}</option>)}</select><small>El stock se controlará en esta unidad.</small></label>
              <label>Stock mínimo para alertas<input type="number" min="0" step="0.001" value={formulario.stockMinimo} onChange={(event) => formulario.setStockMinimo(event.target.value)} inputMode="decimal" required /><small>Al llegar a este nivel o menos, aparecerá una notificación. Usa {codigoBase}; 0 desactiva la alerta.</small></label>
              <label>Afectación del IGV<select value={formulario.afectacionIgv} onChange={(event) => formulario.setAfectacionIgv(event.target.value as "GRAVADO" | "EXONERADO" | "INAFECTO")}><option value="GRAVADO">Gravado con IGV</option><option value="EXONERADO">Exonerado</option><option value="INAFECTO">Inafecto</option></select><small>Esta afectación se envía con el comprobante electrónico emitido por NubeFact.</small></label>
            </div>
          </fieldset>
          <fieldset className="producto-form-section">
            <legend>Presentaciones de compra y venta</legend>
            <p className="producto-section-help">Cada factor indica cuántas unidades base se suman o descuentan. Ejemplo: 1 caja = 12 unidades.</p>
            <div className="producto-table-wrap"><table className="producto-editor-table"><thead><tr><th>Presentación</th><th>Unidad</th><th>Equivale a unidad base</th><th>Compra</th><th>Venta</th><th /></tr></thead><tbody>
              <tr className="producto-base-row"><td data-label="Presentación">Unidad base</td><td data-label="Unidad">{codigoBase} ({formulario.unidadBaseCodigo})</td><td data-label="Equivale a unidad base">1</td><td data-label="Compra">Sí</td><td data-label="Venta">Sí</td><td data-label="Tipo">Base</td></tr>
              {formulario.presentaciones.map((presentacion, indice) => <tr key={presentacion.clave}>
                <td data-label="Presentación"><input aria-label="Nombre de presentación" value={presentacion.nombre} onChange={(event) => formulario.setPresentaciones((actual) => actual.map((fila, i) => i === indice ? { ...fila, nombre: event.target.value } : fila))} placeholder="Ej. Caja de 12" /></td>
                <td data-label="Unidad"><select aria-label="Unidad de presentación" value={presentacion.unidadMedidaCodigo} onChange={(event) => formulario.setPresentaciones((actual) => actual.map((fila, i) => i === indice ? { ...fila, unidadMedidaCodigo: event.target.value } : fila))}>{catalogos.unidadesMedida.map((unidad) => <option key={unidad.codigo} value={unidad.codigo}>{unidad.nombre} ({unidad.codigo})</option>)}</select></td>
                <td data-label="Equivale a unidad base"><input aria-label="Factor de conversión" type="number" min="0.000001" step="0.000001" value={presentacion.factorAUnidadBase} onChange={(event) => formulario.setPresentaciones((actual) => actual.map((fila, i) => i === indice ? { ...fila, factorAUnidadBase: event.target.value } : fila))} /></td>
                <td data-label="Compra"><input aria-label="Se compra en esta presentación" type="checkbox" checked={presentacion.seCompra} onChange={(event) => formulario.setPresentaciones((actual) => actual.map((fila, i) => i === indice ? { ...fila, seCompra: event.target.checked } : fila))} /></td>
                <td data-label="Venta"><input aria-label="Se vende en esta presentación" type="checkbox" checked={presentacion.seVende} onChange={(event) => formulario.setPresentaciones((actual) => actual.map((fila, i) => i === indice ? { ...fila, seVende: event.target.checked } : fila))} /></td>
                <td data-label="Acciones"><AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar presentación" onClick={() => formulario.setPresentaciones((actual) => actual.filter((_, i) => i !== indice))} /></td>
              </tr>)}
            </tbody></table></div>
            <button type="button" className="producto-add-row" onClick={formulario.agregarPresentacion}>+ Agregar presentación</button>
          </fieldset>
          <fieldset className="producto-form-section">
            <legend>Listas de precios</legend>
            <p className="producto-section-help">Cada precio se asocia a una lista y una presentación. La cantidad mínima permite aplicar precio mayorista por volumen.</p>
            <div className="producto-table-wrap"><table className="producto-editor-table"><thead><tr><th>Tipo de lista</th><th>Presentación</th><th>Precio S/</th><th>Desde cantidad</th><th /></tr></thead><tbody>
              {formulario.precios.map((precio, indice) => <tr key={precio.clave}>
                <td data-label="Tipo de lista"><select aria-label="Tipo de lista de precio" value={precio.tipoListaPrecioId} onChange={(event) => formulario.setPrecios((actual) => actual.map((fila, i) => i === indice ? { ...fila, tipoListaPrecioId: event.target.value } : fila))}><option value="">Selecciona lista</option>{catalogos.tiposListasPrecio.map((lista) => <option key={lista.id} value={lista.id}>{lista.nombre}</option>)}</select></td>
                <td data-label="Presentación"><select aria-label="Presentación con precio" value={precio.presentacionClave} onChange={(event) => formulario.setPrecios((actual) => actual.map((fila, i) => i === indice ? { ...fila, presentacionClave: event.target.value } : fila))}><option value="base">Unidad base ({formulario.unidadBaseCodigo})</option>{formulario.presentaciones.map((item) => <option key={item.clave} value={item.clave}>{item.nombre}</option>)}</select></td>
                <td data-label="Precio S/"><input aria-label="Precio en soles" type="number" min="0" step="0.10" value={precio.precio} onChange={(event) => formulario.setPrecios((actual) => actual.map((fila, i) => i === indice ? { ...fila, precio: event.target.value } : fila))} onBlur={(event) => { const precioRedondeado = redondearPrecioADecimos(event.currentTarget.value); formulario.setPrecios((actual) => actual.map((fila, i) => i === indice ? { ...fila, precio: precioRedondeado } : fila)); }} placeholder="0.00" /></td>
                <td data-label="Desde cantidad"><input aria-label="Cantidad mínima" type="number" min="0.001" step="0.001" value={precio.cantidadMinima} onChange={(event) => formulario.setPrecios((actual) => actual.map((fila, i) => i === indice ? { ...fila, cantidadMinima: event.target.value } : fila))} /></td>
                <td data-label="Acciones"><AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar precio" onClick={() => formulario.setPrecios((actual) => actual.filter((_, i) => i !== indice))} /></td>
              </tr>)}
            </tbody></table></div>
            <button type="button" className="producto-add-row" onClick={formulario.agregarPrecio}>+ Agregar precio</button>
          </fieldset>
        </>}
        {paso === 3 && <>
          <fieldset className="producto-form-section">
            <legend>Códigos de identificación</legend>
            <p className="producto-section-help">El sistema asigna el código interno. Agrega códigos de fábrica o de barras para encontrarlos al buscarlos o escanearlos.</p>
            <div className="producto-code-list">
              {formulario.codigos.map((codigo, indice) => <div className="producto-row producto-code-row" key={codigo.clave}>
                <select aria-label="Tipo de código" value={codigo.tipo} onChange={(event) => formulario.setCodigos((actual) => actual.map((fila, i) => i === indice ? { ...fila, tipo: event.target.value as typeof fila.tipo } : fila))}><option value="FABRICANTE">Fabricante / OEM</option><option value="BARRAS">Código de barras</option><option value="GTIN">GTIN</option></select>
                <input id={codigo.tipo === "BARRAS" ? `codigo-barras-${codigo.clave}` : undefined} aria-label={codigo.tipo === "BARRAS" ? "Código de barras, listo para lector" : "Código"} value={codigo.codigo} onChange={(event) => formulario.setCodigos((actual) => actual.map((fila, i) => i === indice ? { ...fila, codigo: event.target.value } : fila))} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} autoComplete="off" maxLength={100} placeholder={codigo.tipo === "BARRAS" ? "Enfoca aquí el lector o escribe el código" : "Código"} />
                {codigo.tipo === "BARRAS" && <button type="button" className="producto-scan-button" onClick={() => document.getElementById(`codigo-barras-${codigo.clave}`)?.focus()}>Enfocar lector</button>}
                <AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar código" onClick={() => formulario.setCodigos((actual) => actual.filter((_, i) => i !== indice))} />
              </div>)}
            </div>
            <div className="producto-code-actions"><button type="button" className="producto-add-row" onClick={() => formulario.setCodigos((actual) => [...actual, { clave: crypto.randomUUID(), tipo: "FABRICANTE", codigo: "" }])}>+ Agregar código</button><button type="button" className="producto-add-row" onClick={() => formulario.setCodigos((actual) => [...actual, { clave: crypto.randomUUID(), tipo: "BARRAS", codigo: "" }])}>+ Agregar código de barras</button></div>
          </fieldset>
          <fieldset className="producto-form-section">
            <legend>Ficha técnica</legend>
            <p className="producto-section-help">Añade solo las características que correspondan al repuesto; por ejemplo, viscosidad, voltaje, medidas o aplicación.</p>
            <div className="producto-spec-list">{formulario.ficha.map((dato, indice) => <div className="producto-row" key={`${dato.clave}-${indice}`}>
              <input aria-label="Característica técnica" value={dato.clave} onChange={(event) => formulario.setFicha((actual) => actual.map((fila, i) => i === indice ? { ...fila, clave: event.target.value } : fila))} maxLength={60} placeholder="Característica" />
              <input aria-label="Valor de característica" value={dato.valor} onChange={(event) => formulario.setFicha((actual) => actual.map((fila, i) => i === indice ? { ...fila, valor: event.target.value } : fila))} maxLength={300} placeholder="Valor" />
              <AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar característica" onClick={() => formulario.setFicha((actual) => actual.filter((_, i) => i !== indice))} />
            </div>)}</div>
            <button type="button" className="producto-add-row" onClick={() => formulario.setFicha((actual) => [...actual, { clave: "", valor: "" }])}>+ Agregar característica</button>
          </fieldset>
          <fieldset className="producto-form-section">
            <legend>Imágenes y estado</legend>
            <div className="producto-images-heading"><strong>Imágenes del repuesto</strong><span>{cantidadImagenes} de 5</span></div>
            {cantidadImagenes > 0 && <div className="producto-image-grid">
              {imagenesExistentes.map((imagen, indice) => <figure className="producto-image-item" key={imagen.id}>
                <img src={srcImagen(imagen.rutaImagen)} alt={`Imagen ${indice + 1} de ${producto?.nombre ?? "repuesto"}`} />
                <button type="button" aria-label={`Quitar imagen ${indice + 1}`} onClick={() => formulario.quitarImagenExistente(imagen.id)}>Quitar</button>
              </figure>)}
              {formulario.imagenesNuevas.map((imagen, indice) => <figure className="producto-image-item" key={`${imagen.name}-${indice}`}>
                <img src={formulario.vistasPreviasImagenes[indice]} alt={`Vista previa ${indice + 1} del producto`} />
                <button type="button" aria-label={`Quitar imagen nueva ${indice + 1}`} onClick={() => formulario.quitarImagenNueva(indice)}>Quitar</button>
              </figure>)}
            </div>}
            <div className="catalog-upload-field">
              <div className="catalog-upload-heading"><strong>JPG, PNG o WebP</strong><small>Máximo 5 MB por imagen · hasta 5 imágenes</small></div>
              {cantidadImagenes < 5 && <label className="catalog-upload-zone producto-images-upload" htmlFor="producto-imagenes">
                <input className="catalog-upload-input" id="producto-imagenes" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { formulario.seleccionarImagenes(event.currentTarget.files); event.currentTarget.value = ""; }} />
                <span className="catalog-upload-symbol" aria-hidden="true">↑</span><span className="catalog-upload-copy"><strong>Añadir imágenes</strong><small>Selecciona hasta {5 - cantidadImagenes} imágenes más</small></span><span className="catalog-upload-action">Elegir archivos</span>
              </label>}
            </div>
            {formulario.modoEdicion && <label className="producto-check-label"><input type="checkbox" checked={formulario.activo} onChange={(event) => formulario.setActivo(event.target.checked)} /> Producto activo</label>}
          </fieldset>
        </>}
        </div>
        <div className="catalog-form-actions producto-wizard-actions">
          <button className="catalog-cancel" type="button" onClick={paso === 1 ? alCerrar : () => { formulario.setErrorLocal(""); setPaso((actual) => actual - 1); }} disabled={formulario.guardando}>{paso === 1 ? "Cancelar" : "Atrás"}</button>
          <button className="catalog-submit" type="submit" disabled={formulario.guardando}>{formulario.guardando ? "Guardando…" : paso < 3 ? "Continuar" : formulario.modoEdicion ? "Guardar repuesto" : "Crear repuesto"}</button>
        </div>
      </form>
      {formulario.marcaModalAbierto && <div className="producto-brand-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formulario.creandoMarca) formulario.setMarcaModalAbierto(false); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); formulario.setMarcaModalAbierto(false); } }}>
        <section className="producto-brand-modal" role="dialog" aria-modal="true" aria-labelledby="marca-rapida-titulo">
          <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario de marca" onClick={() => formulario.setMarcaModalAbierto(false)}>×</button>
          <form onSubmit={(event) => { event.preventDefault(); void formulario.crearMarca(); }}>
            <div className="catalog-form-title"><span>✦</span><div><h2 id="marca-rapida-titulo">Agregar marca</h2><p>Guarda el nombre y una imagen para asociarla al producto.</p></div></div>
            {formulario.errorLocal && <div className="catalog-alert" role="alert">{formulario.errorLocal}</div>}
            <label>Nombre de la marca<input autoFocus value={formulario.marcaNueva} onChange={(event) => formulario.setMarcaNueva(event.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Honda" /></label>
            <div className="catalog-upload-field">
              <div className="catalog-upload-heading"><strong>Imagen de la marca</strong><small>JPG, PNG o WebP · máximo 5 MB</small></div>
              <label className={`catalog-upload-zone${formulario.vistaPreviaMarca ? " has-preview" : ""}`} htmlFor="producto-marca-imagen">
                <input className="catalog-upload-input" id="producto-marca-imagen" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const archivo = event.target.files?.[0]; if (!archivo) return; if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) { formulario.setErrorLocal("Usa una imagen JPG, PNG o WebP de máximo 5 MB."); event.currentTarget.value = ""; return; } formulario.setErrorLocal(""); formulario.setMarcaNuevaImagen(archivo); }} />
                {formulario.vistaPreviaMarca ? <><img className="catalog-upload-preview" src={formulario.vistaPreviaMarca} alt="Vista previa de la marca" /><span className="catalog-upload-copy"><strong>{formulario.marcaNuevaImagen?.name}</strong><small>Haz clic para reemplazarla</small></span><span className="catalog-upload-action">Cambiar</span></> : <><span className="catalog-upload-symbol" aria-hidden="true">↑</span><span className="catalog-upload-copy"><strong>Selecciona una imagen</strong><small>La imagen identificará la marca en el catálogo.</small></span><span className="catalog-upload-action">Elegir imagen</span></>}
              </label>
            </div>
            <div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={formulario.creandoMarca} onClick={() => formulario.setMarcaModalAbierto(false)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={formulario.creandoMarca || !formulario.marcaNuevaImagen}>{formulario.creandoMarca ? "Guardando…" : "Guardar marca"}</button></div>
          </form>
        </section>
      </div>}
      {formulario.categoriaModalAbierto && <ProductoCategoriaModal nombre={formulario.categoriaNueva} imagen={formulario.categoriaNuevaImagen} vistaPrevia={formulario.vistaPreviaCategoria} error={formulario.errorLocal} guardando={formulario.creandoCategoria} alCambiarNombre={formulario.setCategoriaNueva} alSeleccionarImagen={formulario.seleccionarCategoriaImagen} alCerrar={() => formulario.setCategoriaModalAbierto(false)} alCrear={() => { void formulario.crearCategoria(); }} />}
    </section>
  </div>, document.getElementById("root") ?? document.body);
}
