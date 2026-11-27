import { BadgeDollarSign, ChevronDown, Eye, Pencil, Power, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { DialogoCatalogo, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { EtiquetaCodigoBarras } from "../../components/productos/etiqueta-codigo-barras";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useProductos } from "../../hooks/use-productos";
import { servicioProductos, type HistorialProducto, type Producto, type ProductoTarjeta } from "../../services/inventario/productos.service";
import { FichaRepuesto, PreciosRepuesto } from "./producto-detalle";
import { inventarioMototaxisClasses as c } from "../inventario-mototaxis-page/inventario-mototaxis-page-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";

// Colores fijos de estado (iguales en todos los submódulos).
const tonosEstado = {
  activo: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  inactivo: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
};

type Accion = "ficha" | "precios" | "editar" | "etiqueta";
type Dialogo =
  | { tipo: "nuevo" }
  | { tipo: "editar" | "etiqueta" | "precios"; producto: Producto }
  | { tipo: "ficha"; producto: Producto; historial: HistorialProducto }
  | { tipo: "cargando"; articulo: string; codigo: string };

export function ProductosPage({ permisos }: { permisos: readonly string[] }) {
  const modulo = useProductos();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [mensaje, setMensaje] = useState("");
  const solicitud = useRef(0);
  const puedeCrear = permisos.includes("INVENTARIO.CREAR");
  const puedeEditar = permisos.includes("INVENTARIO.EDITAR");

  function cerrar() {
    solicitud.current += 1;
    setDialogo(null);
    modulo.setError("");
  }

  async function abrir(tipo: Accion, articulo: Pick<ProductoTarjeta, "id" | "nombre" | "codigoInterno">) {
    modulo.setError("");
    const turno = ++solicitud.current;
    setDialogo({ tipo: "cargando", articulo: articulo.nombre, codigo: articulo.codigoInterno });
    try {
      const [producto, historial] = await Promise.all([
        servicioProductos.consultar(articulo.id),
        tipo === "ficha" ? servicioProductos.historial(articulo.id) : Promise.resolve(null),
      ]);
      if (turno !== solicitud.current) return;
      if (tipo === "ficha" && historial) setDialogo({ tipo, producto, historial });
      else if (tipo !== "ficha") setDialogo({ tipo, producto });
    } catch (error) {
      if (turno !== solicitud.current) return;
      setDialogo(null);
      modulo.setError(error instanceof Error ? error.message : "No se pudo abrir el repuesto.");
    }
  }

  async function guardarProducto(datos: Parameters<typeof modulo.guardar>[0]) {
    const editando = dialogo?.tipo === "editar" ? dialogo.producto.id : undefined;
    const guardado = await modulo.guardar(datos, editando);
    if (guardado) {
      cerrar();
      setMensaje(editando ? "Datos del repuesto actualizados." : "Repuesto creado. Puedes configurar sus precios desde Acciones.");
    }
    return guardado;
  }

  const formulario = dialogo?.tipo === "nuevo" || dialogo?.tipo === "editar";

  return <section className={c.page}>
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Nuevo repuesto" onClick={() => { modulo.setError(""); setDialogo({ tipo: "nuevo" }); }} />}
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={modulo.busqueda} onChange={(e) => modulo.setBusqueda(e.target.value)} placeholder="Buscar por nombre, código o marca" aria-label="Buscar repuesto" />
      </label>
      <label className={v.selectField}><select aria-label="Marca" value={modulo.marca} onChange={(e) => modulo.setMarca(e.target.value)}><option value="">Todas las marcas</option>{modulo.catalogos.marcas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><ChevronDown aria-hidden="true" /></label>
      <label className={v.selectField}><select aria-label="Precio" value={modulo.precio} onChange={(e) => modulo.setPrecio(e.target.value)}><option value="TODOS">Cualquier precio</option><option value="VIGENTE">Con precio vigente</option><option value="PENDIENTE">Precio pendiente</option></select><ChevronDown aria-hidden="true" /></label>
      <label className={v.selectField}><select aria-label="Existencias" value={modulo.existencia} onChange={(e) => modulo.setExistencia(e.target.value)}>
        <option value="TODOS">Todas las existencias ({modulo.conteosStock.todos})</option><option value="CON_STOCK">Con stock ({modulo.conteosStock.conStock})</option><option value="SIN_STOCK">Sin stock ({modulo.conteosStock.sinStock})</option>
      </select><ChevronDown aria-hidden="true" /></label>
      <div className={v.filters} role="group" aria-label="Estado">
        {([
          ["ACTIVOS", "Activos", modulo.conteosEstado.activos],
          ["INACTIVOS", "Inactivos", modulo.conteosEstado.inactivos],
          ["STOCK_BAJO", "Stock bajo", modulo.conteosEstado.stockBajo],
        ] as const).map(([valor, etiqueta, cantidad]) => <button key={valor} type="button" className={v.chip} aria-pressed={modulo.estado === valor} onClick={() => modulo.setEstado(valor)}>
          {etiqueta}<span className={v.chipCount}>{cantidad}</span>
        </button>)}
      </div>
    </div>
    <ListadoMaestro<ProductoTarjeta> variante="tabla" titulo="Repuestos"
      registros={modulo.productos} cargando={modulo.cargando} error={formulario ? undefined : modulo.error}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      vacio={<div className={v.empty}><strong>No hay repuestos para mostrar</strong><span>{modulo.busqueda.trim() || modulo.marca ? "Prueba con otra búsqueda o marca." : "Registra el primer repuesto del inventario."}</span></div>}
      paginacion={{ modo: "remota", pagina: modulo.pagina, tamanio: modulo.porPagina, total: modulo.total, totalPaginas: modulo.totalPaginas,
        desde: modulo.desde, hasta: modulo.hasta, alCambiarPagina: modulo.cambiarPagina, alCambiarTamanio: modulo.cambiarPorPagina }}
      encabezadoTabla={<tr><th>Repuesto</th><th>Marca y categoría</th><th>Existencias</th><th>Precio general</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(item) => {
        const tono = item.activo ? tonosEstado.activo : tonosEstado.inactivo;
        return <tr key={item.id}>
          <td><strong className={v.documentCode}>{item.nombre}</strong><small className={v.minorText}>{item.codigoInterno}</small></td>
          <td>{item.marca}<small className={v.minorText}>{item.categoria}</small></td>
          <td className="[font-variant-numeric:tabular-nums]">{Number(item.stockActual).toLocaleString("es-PE")} <small className="text-[11px] text-[#6d8093]">{item.unidadBase}</small></td>
          <td>{item.precioGeneral == null ? <span className="text-[11px] text-[#6d8093]">Sin precio</span> : <span className={v.total}>{monedaInventario(item.precioGeneral)}</span>}</td>
          <td><span className={`${v.status} ${tono.caja}`}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{item.activo ? "Activo" : "Inactivo"}</span></td>
          <td><div className={v.rowActions}>
            <BotonAccion etiqueta={`Ver ficha de ${item.nombre}`} tono="neutral" icono={<Eye aria-hidden="true" />} onClick={() => void abrir("ficha", item)} />
            <BotonAccion etiqueta={`${puedeEditar ? "Configurar precios de" : "Ver precios de"} ${item.nombre}`} tono="positiva" icono={<BadgeDollarSign aria-hidden="true" />} onClick={() => void abrir("precios", item)} />
            {puedeEditar && <BotonAccion etiqueta={`Editar datos de ${item.nombre}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => void abrir("editar", item)} />}
            <BotonAccion etiqueta={`Imprimir código de barras de ${item.nombre}`} tono="neutral" icono={<Printer aria-hidden="true" />} onClick={() => void abrir("etiqueta", item)} />
            {puedeEditar && <BotonAccion etiqueta={`${item.activo ? "Desactivar" : "Activar"} ${item.nombre}`} tono={item.activo ? "peligro" : "positiva"} icono={<Power aria-hidden="true" />} onClick={() => {
              if (window.confirm(item.activo ? "¿Desactivar este repuesto?" : "¿Activar este repuesto?")) void modulo.cambiarEstado(item);
            }} />}
          </div></td>
        </tr>;
      }}
    />
    {formulario && <ProductoFormulario catalogos={modulo.catalogos} producto={dialogo.tipo === "editar" ? dialogo.producto : null} error={modulo.error} alCerrar={cerrar} alGuardar={guardarProducto} alCrearMarca={modulo.crearMarca} alCrearCategoria={modulo.crearCategoria} />}
    {dialogo?.tipo === "cargando" && <DialogoCatalogo titulo="Repuesto" articulo={dialogo.articulo} codigo={dialogo.codigo} alCerrar={cerrar}><p role="status">Cargando información del repuesto…</p></DialogoCatalogo>}
    {dialogo?.tipo === "etiqueta" && <EtiquetaCodigoBarras producto={dialogo.producto} alCerrar={cerrar} />}
    {dialogo?.tipo === "ficha" && <FichaRepuesto producto={dialogo.producto} historial={dialogo.historial} alCerrar={cerrar}
      alEditar={puedeEditar ? () => setDialogo({ tipo: "editar", producto: dialogo.producto }) : undefined} />}
    {dialogo?.tipo === "precios" && <PreciosRepuesto producto={dialogo.producto} catalogos={modulo.catalogos} alCerrar={cerrar} puedeEditar={puedeEditar} alGuardar={async () => {
      void modulo.cargarPagina();
      return modulo.consultar(dialogo.producto.id);
    }} />}
    {mensaje && <NotificacionFlotante tipo="exito" mensaje={mensaje} onCerrar={() => setMensaje("")} />}
  </section>;
}
