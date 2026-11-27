import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ConfirmarAnulacion } from "../../components/ui/confirmar-anulacion";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useEntradasStock } from "../../hooks/use-entradas-stock";
import { servicioEntradasStock, type EntradaStock } from "../../services/inventario/entradas-stock.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";
import { FilaCompra } from "./fila-compra";
import { FormularioCompraRepuestos } from "./formulario-compra-repuestos";

const encabezado = <tr><th>Fecha</th><th>Compra</th><th>Proveedor</th><th>Repuestos</th><th>Total</th><th>Estado</th><th>Acciones</th></tr>;

type Props = { esNuevaCompra?: boolean; puedeEditar?: boolean; puedeAnular?: boolean };

export function ComprasPage({ esNuevaCompra = false, puedeEditar = false, puedeAnular = false }: Props) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const modulo = useEntradasStock();
  const alertas = useAlertas();
  const [editando, setEditando] = useState<EntradaStock | null>(null);
  const [abriendoId, setAbriendoId] = useState<string | null>(null);
  const [anulando, setAnulando] = useState<EntradaStock | null>(null);
  useEffect(() => { if (esNuevaCompra) modulo.abrirNuevo(); }, [esNuevaCompra, ubicacion.key]);

  async function editar(entrada: EntradaStock) {
    setAbriendoId(entrada.id);
    try {
      const completa = await servicioEntradasStock.consultar(entrada.id);
      modulo.abrirEdicion(completa);
      setEditando(completa);
    } catch (problema) {
      alertas.error(problema instanceof Error ? problema.message : "No se pudo abrir la compra.");
    } finally {
      setAbriendoId(null);
    }
  }

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (esNuevaCompra) return <FormularioCompraRepuestos key={ubicacion.key} modulo={modulo} alCerrar={() => { modulo.cerrarModal(); navegar("/egresos/compras"); }} />;
  if (editando) return <FormularioCompraRepuestos key={editando.id} modulo={modulo} compraEditada={editando} alCerrar={() => { modulo.cerrarModal(); setEditando(null); }} />;

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
        cargando={modulo.cargando}
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
        renderizarFila={(entrada) => <FilaCompra key={entrada.id} entrada={entrada} editando={abriendoId === entrada.id}
          alEditar={puedeEditar ? (fila) => void editar(fila) : undefined}
          alAnular={puedeAnular ? setAnulando : undefined} />}
      />
      {anulando && <ConfirmarAnulacion
        titulo={`¿Anular la compra ${anulando.codigo}?`}
        descripcion="Se retirará del inventario lo que ingresó con esta compra y su pago dejará de contar en las cuentas. No se puede deshacer."
        etiquetaConfirmar="Anular compra"
        onCancelar={() => setAnulando(null)}
        onConfirmar={async (motivo) => {
          await modulo.anularCompra(anulando.id, motivo);
          alertas.mostrar({ tipo: "exito", mensaje: `Compra ${anulando.codigo} anulada.` });
          setAnulando(null);
        }}
      />}
    </section>
  );
}
