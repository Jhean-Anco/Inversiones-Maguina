import { NotificacionFlotante } from "../../ui/notificacion-flotante/notificacion-flotante";
import { useRef } from "react";
import { createPortal } from "react-dom";
import { type CatalogosProducto, type Producto } from "../../../services/inventario/productos.service";
import { useProductoFormulario } from "../../../hooks/use-producto-formulario";
import { ProductoCategoriaModal } from "../producto-categoria-modal/producto-categoria-modal";
import { AccionIcono } from "../../ui/accion-icono";
import { useConfirmarCancelacionFormulario } from "../../../hooks/use-confirmar-cancelacion-formulario";

type PropiedadesProductoFormulario = {
  catalogos: CatalogosProducto;
  producto?: Producto | null;
  error: string;
  alCerrar: () => void;
  alGuardar: Parameters<typeof useProductoFormulario>[0]["alGuardar"];
  alCrearMarca: Parameters<typeof useProductoFormulario>[0]["alCrearMarca"];
  alCrearCategoria: Parameters<typeof useProductoFormulario>[0]["alCrearCategoria"];
};

function generarCodigoEAN13Interno() {
  const aleatorios = new Uint32Array(10);
  globalThis.crypto.getRandomValues(aleatorios);
  const base = `20${[...aleatorios].map((valor) => String(valor % 10)).join("")}`;
  const suma = [...base].reduce((total, digito, indice) => total + Number(digito) * (indice % 2 === 0 ? 1 : 3), 0);
  return `${base}${(10 - suma % 10) % 10}`;
}

export function ProductoFormulario({ catalogos, producto, error, alCerrar, alGuardar, alCrearMarca, alCrearCategoria }: PropiedadesProductoFormulario) {
  const formulario = useProductoFormulario({ producto, catalogos, alGuardar, alCrearMarca, alCrearCategoria });
  const codigoBase = catalogos.unidadesMedida.find((unidad) => unidad.codigo === formulario.unidadBaseCodigo)?.nombre ?? formulario.unidadBaseCodigo;
  const formularioRef = useRef<HTMLFormElement>(null);
  const firmaDatos = JSON.stringify(Object.fromEntries(Object.entries(formulario).filter(([clave, valor]) => typeof valor !== "function" && !["guardando", "errorLocal"].includes(clave))));
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(formularioRef, alCerrar, formulario.modoEdicion ? "los cambios del repuesto" : "el repuesto", firmaDatos);

  return createPortal(<>{dialogo}<div className="catalog-modal-backdrop producto-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formulario.guardando) solicitarCancelacion(); }}>
    <section className="catalog-modal producto-modal" role="dialog" aria-modal="true" aria-labelledby="producto-form-title">
      {!formulario.categoriaModalAbierto && !formulario.marcaModalAbierto && <NotificacionFlotante titulo={formulario.errorLocal ? "Revisa los datos del formulario" : "No se guardó el repuesto"} mensaje={formulario.errorLocal || error} />}
      <form ref={formularioRef} className="catalog-form producto-form bg-[linear-gradient(180deg,#fff_0%,#fbfcfe_100%)]" onSubmit={formulario.guardar}>
        <div className="catalog-form-title inventario-dialogo-cabecera">
          <div><h2 id="producto-form-title">{formulario.modoEdicion ? "Editar repuesto" : "Nuevo repuesto"}</h2><p>Identifica el repuesto y define sus presentaciones.</p></div>
          <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario" onClick={solicitarCancelacion}>×</button>
        </div>
        <div className="producto-form-scroll mobile-portrait:gap-[14px] mobile-portrait:px-[18px] mobile-portrait:py-6 mobile-portrait:[.catalog-modal.producto-modal_&]:px-[18px]">
          <fieldset className="producto-form-section mobile-portrait:p-3">
            <legend>Identificación</legend>
            <div className="producto-form-grid mobile-portrait:grid-cols-1">
              <label className="producto-span-2 mobile-portrait:col-auto">Nombre del repuesto<input value={formulario.nombre} onChange={(event) => formulario.setNombre(event.target.value)} required minLength={2} maxLength={180} placeholder="Ej. Pastilla de freno delantero Honda Wave" /></label>
              <div className="producto-brand-field"><label>Categoría<select value={formulario.categoriaId} onChange={(event) => formulario.setCategoriaId(event.target.value)} required><option value="">Selecciona categoría</option>{catalogos.categorias.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select></label><button className="producto-brand-link" type="button" onClick={() => { formulario.setErrorLocal(""); formulario.setCategoriaModalAbierto(true); }}>+ Agregar categoría</button></div>
              <div className="producto-brand-field"><label>Marca<select value={formulario.marcaId} onChange={(event) => formulario.setMarcaId(event.target.value)} required><option value="">Selecciona marca</option>{catalogos.marcas.map((opcion) => <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>)}</select></label><button className="producto-brand-link" type="button" onClick={() => { formulario.setErrorLocal(""); formulario.setMarcaModalAbierto(true); }}>+ Agregar marca</button></div>
              <label className="producto-span-2 mobile-portrait:col-auto">Descripción para búsqueda<input value={formulario.descripcion} onChange={(event) => formulario.setDescripcion(event.target.value)} maxLength={3000} placeholder="Describe cómo es, para qué sirve o cómo identificarlo" /></label>
            </div>
          </fieldset>
          <fieldset className="producto-form-section producto-commerce-section">
            <legend>Unidad y comprobante</legend>
            <div className="producto-form-grid mobile-portrait:grid-cols-1">
              <label>Unidad base de inventario<select value={formulario.unidadBaseCodigo} onChange={(event) => formulario.setUnidadBaseCodigo(event.target.value)} required>{catalogos.unidadesMedida.map((unidad) => <option key={unidad.codigo} value={unidad.codigo}>{unidad.nombre}</option>)}</select><small>El stock se controlará en esta unidad.</small></label>
              {formulario.modoEdicion && <label>Stock mínimo para alertas<input type="number" min="0" step="0.001" value={formulario.stockMinimo} onChange={(event) => formulario.setStockMinimo(event.target.value)} inputMode="decimal" required /><small>Al llegar a este nivel o menos, aparecerá una notificación. Usa {codigoBase}; 0 desactiva la alerta.</small></label>}
              <label>Afectación del IGV<select value={formulario.afectacionIgv} onChange={(event) => formulario.setAfectacionIgv(event.target.value as "GRAVADO" | "EXONERADO" | "INAFECTO")}><option value="GRAVADO">Gravado con IGV</option><option value="EXONERADO">Exonerado</option><option value="INAFECTO">Inafecto</option></select><small>Esta afectación se envía con el comprobante electrónico emitido por NubeFact.</small></label>
            </div>
          </fieldset>
          <fieldset className="producto-form-section mobile-portrait:p-3">
            <legend>Presentaciones de compra y venta</legend>
            <p className="producto-section-help">Cada factor indica cuántas unidades base se suman o descuentan. Ejemplo: 1 caja = 12 unidades.</p>
            <div className="producto-table-wrap mobile-portrait:overflow-visible"><table className="producto-editor-table mobile-portrait:block mobile-portrait:w-full mobile-portrait:min-w-0 mobile-portrait:[&_thead]:sr-only mobile-portrait:[&_tbody]:grid mobile-portrait:[&_tbody]:gap-2 mobile-portrait:[&_tbody_tr]:grid mobile-portrait:[&_tbody_tr]:grid-cols-2 mobile-portrait:[&_tbody_tr]:gap-2 mobile-portrait:[&_tbody_tr]:rounded-[10px] mobile-portrait:[&_tbody_tr]:border mobile-portrait:[&_tbody_tr]:border-[#e6edf4] mobile-portrait:[&_tbody_tr]:bg-white mobile-portrait:[&_tbody_tr]:p-2.5 mobile-portrait:[&_tbody_td]:grid mobile-portrait:[&_tbody_td]:min-w-0 mobile-portrait:[&_tbody_td]:content-start mobile-portrait:[&_tbody_td]:gap-1 mobile-portrait:[&_tbody_td]:border-0 mobile-portrait:[&_tbody_td]:p-0 mobile-portrait:[&_tbody_td]:text-xs mobile-portrait:[&_tbody_td::before]:text-[9px] mobile-portrait:[&_tbody_td::before]:font-bold mobile-portrait:[&_tbody_td::before]:leading-tight mobile-portrait:[&_tbody_td::before]:text-[#71839a] mobile-portrait:[&_tbody_td::before]:content-[attr(data-label)] mobile-portrait:[&_tbody_td:nth-child(3)]:col-span-full mobile-portrait:[&_tbody_td:has(input[type=checkbox])]:grid-cols-[1fr_auto] mobile-portrait:[&_tbody_td:has(input[type=checkbox])]:items-center mobile-portrait:[&_tbody_td:has(input[type=checkbox])_input]:col-start-2 mobile-portrait:[&_tbody_td:has(input[type=checkbox])_input]:row-start-1 mobile-portrait:[&_tbody_td:last-child]:flex mobile-portrait:[&_tbody_td:last-child]:items-end mobile-portrait:[&_tbody_td:last-child]:justify-end mobile-portrait:[&_input:not([type=checkbox])]:box-border mobile-portrait:[&_input:not([type=checkbox])]:w-full mobile-portrait:[&_input:not([type=checkbox])]:min-w-0 mobile-portrait:[&_input:not([type=checkbox])]:max-w-full mobile-portrait:[&_input:not([type=checkbox])]:px-1.5 mobile-portrait:[&_input:not([type=checkbox])]:text-xs mobile-portrait:[&_select]:box-border mobile-portrait:[&_select]:w-full mobile-portrait:[&_select]:min-w-0 mobile-portrait:[&_select]:max-w-full mobile-portrait:[&_select]:px-1.5 mobile-portrait:[&_select]:text-xs mobile-portrait:[&.producto-editor-table_input:not([type=checkbox])]:min-w-0 mobile-portrait:[&.producto-editor-table_input:not([type=checkbox])]:max-w-full mobile-portrait:[&.producto-editor-table_input:not([type=checkbox])]:px-1.5 mobile-portrait:[&.producto-editor-table_input:not([type=checkbox])]:text-xs mobile-portrait:[&.producto-editor-table_select]:min-w-0 mobile-portrait:[&.producto-editor-table_select]:max-w-full mobile-portrait:[&.producto-editor-table_select]:px-1.5 mobile-portrait:[&.producto-editor-table_select]:text-xs"><thead><tr><th>Presentación</th><th>Unidad</th><th>Equivale a unidad base</th><th>Compra</th><th>Venta</th><th /></tr></thead><tbody>
              <tr className="producto-base-row mobile-portrait:text-[#29445f]"><td data-label="Presentación">Unidad base</td><td data-label="Unidad">{codigoBase} ({formulario.unidadBaseCodigo})</td><td data-label="Equivale a unidad base">1</td><td data-label="Compra">Sí</td><td data-label="Venta">Sí</td><td data-label="Tipo">Base</td></tr>
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
          <fieldset className="producto-form-section mobile-portrait:p-3">
            <legend>Códigos de identificación</legend>
            <p className="producto-section-help">El sistema asigna el código interno. Agrega códigos de fábrica o de barras para encontrarlos al buscarlos o escanearlos.</p>
            <div className="producto-code-list">
              {formulario.codigos.map((codigo, indice) => <div className="producto-row producto-code-row" key={codigo.clave}>
                <select aria-label="Tipo de código" value={codigo.tipo} onChange={(event) => formulario.setCodigos((actual) => actual.map((fila, i) => i === indice ? { ...fila, tipo: event.target.value as typeof fila.tipo } : fila))}><option value="FABRICANTE">Fabricante / OEM</option><option value="BARRAS">Código de barras</option><option value="GTIN">GTIN</option></select>
                <input id={codigo.tipo === "BARRAS" ? `codigo-barras-${codigo.clave}` : undefined} aria-label={codigo.tipo === "BARRAS" ? "Código de barras, listo para lector" : "Código"} value={codigo.codigo} onChange={(event) => formulario.setCodigos((actual) => actual.map((fila, i) => i === indice ? { ...fila, codigo: event.target.value } : fila))} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} autoComplete="off" maxLength={100} placeholder={codigo.tipo === "BARRAS" ? "Enfoca aquí el lector o escribe el código" : "Código"} />
                {codigo.tipo === "BARRAS" && <div className="flex flex-wrap gap-2"><button type="button" className="producto-scan-button" onClick={() => document.getElementById(`codigo-barras-${codigo.clave}`)?.focus()}>Leer con escáner</button><button type="button" className="producto-scan-button" onClick={() => formulario.setCodigos((actual) => actual.map((fila, i) => i === indice ? { ...fila, codigo: generarCodigoEAN13Interno() } : fila))}>Generar EAN-13</button></div>}
                <AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar código" onClick={() => formulario.setCodigos((actual) => actual.filter((_, i) => i !== indice))} />
              </div>)}
            </div>
            <div className="producto-code-actions"><button type="button" className="producto-add-row" onClick={() => formulario.setCodigos((actual) => [...actual, { clave: crypto.randomUUID(), tipo: "FABRICANTE", codigo: "" }])}>+ Agregar código</button><button type="button" className="producto-add-row" onClick={() => formulario.setCodigos((actual) => [...actual, { clave: crypto.randomUUID(), tipo: "BARRAS", codigo: "" }])}>+ Agregar código de barras</button></div>
          </fieldset>
          <fieldset className="producto-form-section mobile-portrait:p-3">
            <legend>Ficha técnica</legend>
            <p className="producto-section-help">Añade solo las características que correspondan al repuesto; por ejemplo, viscosidad, voltaje, medidas o aplicación.</p>
            <div className="producto-spec-list">{formulario.ficha.map((dato, indice) => <div className="producto-row" key={dato.id}>
              <input aria-label="Característica técnica" value={dato.clave} onChange={(event) => formulario.setFicha((actual) => actual.map((fila, i) => i === indice ? { ...fila, clave: event.target.value } : fila))} maxLength={60} placeholder="Característica" />
              <input aria-label="Valor de característica" value={dato.valor} onChange={(event) => formulario.setFicha((actual) => actual.map((fila, i) => i === indice ? { ...fila, valor: event.target.value } : fila))} maxLength={300} placeholder="Valor" />
              <AccionIcono accion="eliminar" className="producto-remove-row" etiqueta="Eliminar característica" onClick={() => formulario.setFicha((actual) => actual.filter((_, i) => i !== indice))} />
            </div>)}</div>
            <button type="button" className="producto-add-row" onClick={() => formulario.setFicha((actual) => [...actual, { id: globalThis.crypto?.randomUUID?.() ?? `ficha-${Date.now()}-${Math.random().toString(36).slice(2)}`, clave: "", valor: "" }])}>+ Agregar característica</button>
          </fieldset>
        </div>
        <div className="catalog-form-actions producto-wizard-actions">
          <button className="catalog-cancel" type="button" onClick={solicitarCancelacion} disabled={formulario.guardando}>Cancelar</button>
          <button className="catalog-submit" type="submit" disabled={formulario.guardando}>{formulario.guardando ? "Guardando…" : formulario.modoEdicion ? "Guardar repuesto" : "Crear repuesto"}</button>
        </div>
      </form>
      {formulario.marcaModalAbierto && <div className="producto-brand-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !formulario.creandoMarca) formulario.setMarcaModalAbierto(false); }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); formulario.setMarcaModalAbierto(false); } }}>
        <section className="producto-brand-modal" role="dialog" aria-modal="true" aria-labelledby="marca-rapida-titulo">
          <button className="catalog-modal-close" type="button" aria-label="Cerrar formulario de marca" onClick={() => formulario.setMarcaModalAbierto(false)}>×</button>
          <form onSubmit={(event) => { event.preventDefault(); void formulario.crearMarca(); }}>
            <div className="catalog-form-title"><span>✦</span><div><h2 id="marca-rapida-titulo">Agregar marca</h2><p>Guarda el nombre para asociarlo al producto.</p></div></div>
            {formulario.errorLocal && <NotificacionFlotante mensaje={formulario.errorLocal} />}
            <label>Nombre de la marca<input autoFocus value={formulario.marcaNueva} onChange={(event) => formulario.setMarcaNueva(event.target.value)} required minLength={2} maxLength={100} placeholder="Ej. Honda" /></label>
            <div className="catalog-form-actions"><button className="catalog-cancel" type="button" disabled={formulario.creandoMarca} onClick={() => formulario.setMarcaModalAbierto(false)}>Cancelar</button><button className="catalog-submit" type="submit" disabled={formulario.creandoMarca}>{formulario.creandoMarca ? "Guardando…" : "Guardar marca"}</button></div>
          </form>
        </section>
      </div>}
      {formulario.categoriaModalAbierto && <ProductoCategoriaModal nombre={formulario.categoriaNueva} error={formulario.errorLocal} guardando={formulario.creandoCategoria} alCambiarNombre={formulario.setCategoriaNueva} alCerrar={() => formulario.setCategoriaModalAbierto(false)} alCrear={() => { void formulario.crearCategoria(); }} />}
    </section>
  </div></>, document.getElementById("root") ?? document.body);
}
