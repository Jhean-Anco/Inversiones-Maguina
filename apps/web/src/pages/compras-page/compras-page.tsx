import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EntradaStockDetalle } from "../../components/inventario/entrada-stock-detalle/entrada-stock-detalle";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEntradasStock } from "../../hooks/use-entradas-stock";
import type { EntradaStock } from "../../services/inventario/entradas-stock.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";
import { FilaCompra } from "./fila-compra";
import { FormularioCompraRepuestos } from "./formulario-compra-repuestos";

const encabezado = <tr><th>Fecha</th><th>Compra</th><th>Proveedor</th><th>Repuestos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>;

export function ComprasPage({ esNuevaCompra = false, puedeAnular = false }: { esNuevaCompra?: boolean; puedeAnular?: boolean }) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const modulo = useEntradasStock();
  useEffect(() => { if (esNuevaCompra) modulo.abrirNuevo(); }, [esNuevaCompra, ubicacion.key]);

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (esNuevaCompra) return <FormularioCompraRepuestos key={ubicacion.key} modulo={modulo} alCerrar={() => { modulo.cerrarModal(); navegar("/egresos/compras"); }} />;

  return (
    <section className={c.page}>
      <RegistrarAccionPrincipal etiqueta="Crear compra de repuestos" onClick={() => navegar("/egresos/compras/nueva")} />
      {modulo.error && !modulo.cargando && <NotificacionFlotante mensaje={modulo.error} onCerrar={() => modulo.setError("")} />}
      <div className={c.toolbar}>
        <label className={`${c.search} listado-maestro-busqueda-icono`}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
          <input type="search" value={modulo.busqueda} placeholder="Buscar por código, proveedor o documento" aria-label="Buscar compras"
            onChange={(evento) => { modulo.setBusqueda(evento.target.value); modulo.cambiarPagina(1); }} />
        </label>
      </div>
      <ListadoMaestro<EntradaStock>
        variante="tabla"
        titulo="Compras de repuestos"
        registros={modulo.entradas}
        cargando={modulo.cargando || modulo.cargandoDetalle}
        claseCabecera={c.header}
        centrarCeldas={false}
        claseTabla={c.table}
        claseContenedor={c.tableScroll}
        paginacion={{
          modo: "remota", pagina: modulo.pagina, tamanio: modulo.porPagina, total: modulo.total, totalPaginas: modulo.totalPaginas,
          desde: modulo.desde, hasta: modulo.hasta,
          alCambiarPagina: modulo.cambiarPagina,
          alCambiarTamanio: modulo.cambiarPorPagina,
        }}
        vacio={<div className={c.empty}><strong>No hay compras para mostrar</strong><span>{modulo.busqueda.trim() ? "Prueba con otra búsqueda." : "Registra la primera compra de repuestos para empezar a controlar las existencias."}</span></div>}
        encabezadoTabla={encabezado}
        renderizarFila={(entrada) => <FilaCompra key={entrada.id} entrada={entrada} alAbrir={modulo.abrirProductoDetalle} />}
      />
      {modulo.entradaDetalle && <EntradaStockDetalle entrada={modulo.entradaDetalle} alCerrar={modulo.cerrarDetalle} alAnular={puedeAnular ? modulo.anularCompra : undefined} />}
    </section>
  );
}
