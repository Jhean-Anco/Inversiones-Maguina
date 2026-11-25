import { Eye, Printer } from "lucide-react";
import { useRef, useState } from "react";
import { DialogoCatalogo, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { EtiquetaCodigoBarras } from "../../components/productos/etiqueta-codigo-barras";
import { ProductoFormulario } from "../../components/productos/producto-formulario/producto-formulario";
import { AccionIcono } from "../../components/ui/accion-icono";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Etiqueta } from "../../components/ui/etiqueta";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useProductos } from "../../hooks/use-productos";
import { servicioProductos, type HistorialProducto, type Producto, type ProductoTarjeta } from "../../services/inventario/productos.service";
import { FichaRepuesto, PreciosRepuesto } from "./producto-detalle";

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

  return <section className="flex min-h-0 w-full flex-1 flex-col gap-3">
    <ListadoMaestro<ProductoTarjeta> variante="tabla" titulo="Repuestos"
      registros={modulo.productos} cargando={modulo.cargando} error={formulario ? undefined : modulo.error}
      vacio="No hay repuestos para mostrar."
      claseCabecera="inventario-listado-cabecera"
      paginacion={{ modo: "remota", pagina: modulo.pagina, tamanio: modulo.porPagina, total: modulo.total, totalPaginas: modulo.totalPaginas,
        desde: modulo.desde, hasta: modulo.hasta, alCambiarPagina: modulo.cambiarPagina, alCambiarTamanio: modulo.cambiarPorPagina }}
      controlesCabecera={<>
        <label className="listado-maestro-busqueda">Buscar repuesto<input type="search" value={modulo.busqueda} onChange={(e) => modulo.setBusqueda(e.target.value)} placeholder="Nombre, código o marca" /></label>
        <label className="listado-maestro-filtro">Marca<select value={modulo.marca} onChange={(e) => modulo.setMarca(e.target.value)}><option value="">Todas</option>{modulo.catalogos.marcas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
        <label className="listado-maestro-filtro">Precio<select value={modulo.precio} onChange={(e) => modulo.setPrecio(e.target.value)}><option value="TODOS">Todos</option><option value="VIGENTE">Vigente</option><option value="PENDIENTE">Pendiente</option></select></label>
        <div className="producto-stock-filtros" role="group" aria-label="Filtrar repuestos por estado">
          {([
            ["TODOS", "Todos", modulo.conteosEstado.todos],
            ["ACTIVOS", "Activos", modulo.conteosEstado.activos],
            ["INACTIVOS", "Inactivos", modulo.conteosEstado.inactivos],
            ["STOCK_BAJO", "Stock bajo", modulo.conteosEstado.stockBajo],
          ] as const).map(([valor, etiqueta, cantidad]) => {
            const seleccionado = modulo.estado === valor;
            return <button key={valor} type="button" className={`producto-stock-filtro${seleccionado ? " is-active" : ""}`} aria-pressed={seleccionado} onClick={() => modulo.setEstado(valor)}>
              <span>{etiqueta}</span><strong>{cantidad}</strong>
            </button>;
          })}
        </div>
        <div className="producto-stock-filtros" role="group" aria-label="Filtrar repuestos por existencia">
          {([
            ["TODOS", "Todos", modulo.conteosStock.todos],
            ["CON_STOCK", "Con stock", modulo.conteosStock.conStock],
            ["SIN_STOCK", "Sin stock", modulo.conteosStock.sinStock],
          ] as const).map(([valor, etiqueta, cantidad]) => {
            const seleccionado = modulo.existencia === valor;
            return <button key={valor} type="button" className={`producto-stock-filtro${seleccionado ? " is-active" : ""}`} aria-pressed={seleccionado} onClick={() => modulo.setExistencia(valor)}>
              <span>{etiqueta}</span><strong>{cantidad}</strong>
            </button>;
          })}
        </div>
        {puedeCrear && <RegistrarAccionPrincipal etiqueta="Nuevo repuesto" onClick={() => { modulo.setError(""); setDialogo({ tipo: "nuevo" }); }} />}
      </>}
      encabezadoTabla={<tr><th>Repuesto</th><th>Marca y categoría</th><th>Existencias</th><th>Precio general</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(item) => <tr key={item.id}>
        <td><strong className="block text-[var(--erp-ink)]">{item.nombre}</strong><small>{item.codigoInterno}</small></td>
        <td>{item.marca}<small className="block">{item.categoria}</small></td>
        <td className="tabular-nums">{Number(item.stockActual).toLocaleString("es-PE")} <small>{item.unidadBase}</small></td>
        <td>{item.precioGeneral == null ? <Etiqueta compacta tono="neutral">Sin precio</Etiqueta> : <strong className="tabular-nums">{monedaInventario(item.precioGeneral)}</strong>}</td>
        <td><Etiqueta compacta tono={item.activo ? "positiva" : "neutral"}>{item.activo ? "Activo" : "Inactivo"}</Etiqueta></td>
        <td><div className="flex flex-wrap gap-1.5">
          <BotonAccion etiqueta={`Ver ficha de ${item.nombre}`} tono="informativa" icono={<Eye aria-hidden="true" />} onClick={() => void abrir("ficha", item)} />
          <BotonAccion etiqueta={`${puedeEditar ? "Configurar precios de" : "Ver precios de"} ${item.nombre}`} tono="positiva" icono={<span aria-hidden="true">S/</span>} onClick={() => void abrir("precios", item)} />
          {puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar datos de ${item.nombre}`} onClick={() => void abrir("editar", item)} />}
          <BotonAccion etiqueta={`Imprimir código de barras de ${item.nombre}`} tono="neutral" icono={<Printer aria-hidden="true" />} onClick={() => void abrir("etiqueta", item)} />
          {puedeEditar && <AccionIcono accion={item.activo ? "desactivar" : "activar"} etiqueta={`${item.activo ? "Desactivar" : "Activar"} ${item.nombre}`} onClick={() => {
            if (window.confirm(item.activo ? "¿Desactivar este repuesto?" : "¿Activar este repuesto?")) void modulo.cambiarEstado(item);
          }} />}
        </div></td>
      </tr>}
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
