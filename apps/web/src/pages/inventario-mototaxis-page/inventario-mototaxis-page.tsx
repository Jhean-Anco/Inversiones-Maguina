import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { cn } from "../../lib/utils";
import { inventarioMototaxisClasses as c } from "./inventario-mototaxis-page-classes";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, PackageSearch } from "lucide-react";
import { AccionIcono } from "../../components/ui/accion-icono";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Etiqueta } from "../../components/ui/etiqueta";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AnalisisModeloMototaxi, type PrecioModeloMototaxi, type ModeloMototaxi } from "../../services/mototaxis.service";
import { DialogoCatalogo, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { FormularioModeloMototaxi } from "./formulario-modelo-mototaxi";
import { FichaModelo } from "./ficha-modelo";
import { PreciosModelo } from "./precios-modelo";
import { FormularioGarantiaModelo } from "./formulario-garantia-modelo";

type DetalleModelo =
  | { tipo: "cargando"; modelo: ModeloMototaxi }
  | { tipo: "ficha"; analisis: AnalisisModeloMototaxi }
  | { tipo: "precios"; modelo: ModeloMototaxi; historial: PrecioModeloMototaxi[]; compras: AnalisisModeloMototaxi["compras"] };

export function InventarioMototaxisPage({ permisos }: { permisos: string[] }) {
  const navegar = useNavigate();
  const puedeCrear = permisos.includes("MOTOTAXIS.CREAR");
  const puedeEditar = permisos.includes("MOTOTAXIS.EDITAR");
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [marcas, setMarcas] = useState<Array<{ id: string; nombre: string; activo: boolean }>>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVOS" | "INACTIVOS">("ACTIVOS");
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<ModeloMototaxi | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [detalle, setDetalle] = useState<DetalleModelo | null>(null);
  const [marcaFiltro, setMarcaFiltro] = useState("");
  const [garantiaModelo, setGarantiaModelo] = useState<ModeloMototaxi | null>(null);
  const solicitud = useRef(0);

  const cargarModelos = useCallback(async () => {
    setCargando(true); setError("");
    try { setModelos(await servicioMototaxis.modelos(busqueda, true)); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; } setError(problema instanceof Error ? problema.message : "No se pudo cargar el catálogo de mototaxis."); }
    finally { setCargando(false); }
  }, [busqueda, navegar]);

  useEffect(() => { void servicioMototaxis.marcas().then(setMarcas).catch((problema: unknown) => setError(problema instanceof Error ? problema.message : "No se pudieron cargar las marcas.")); }, []);
  useEffect(() => { const temporizador = window.setTimeout(() => void cargarModelos(), busqueda.trim() ? 220 : 0); return () => window.clearTimeout(temporizador); }, [cargarModelos, busqueda]);

  function cerrarDetalle() { solicitud.current += 1; setDetalle(null); }

  async function abrirDetalle(modelo: ModeloMototaxi, tipo: "ficha" | "precios") {
    const turno = ++solicitud.current;
    setError(""); setDetalle({ tipo: "cargando", modelo });
    try {
      if (tipo === "ficha") {
        const analisis = await servicioMototaxis.analisisModelo(modelo.id);
        if (turno === solicitud.current) setDetalle({ tipo, analisis });
      } else {
        const [historial, analisis] = await Promise.all([servicioMototaxis.preciosModelo(modelo.id), servicioMototaxis.analisisModelo(modelo.id)]);
        if (turno === solicitud.current) setDetalle({ tipo, modelo: analisis.modelo, historial, compras: analisis.compras });
      }
    } catch (problema) {
      if (turno !== solicitud.current) return;
      setDetalle(null);
      setError(problema instanceof Error ? problema.message : "No se pudo cargar la información del modelo.");
    }
  }

  function abrirNuevo() { setEditando(null); setExito(""); setModal(true); }
  function abrirEdicion(modelo: ModeloMototaxi) { setEditando(modelo); setExito(""); setModal(true); }
  function abrirGarantias(modelo: ModeloMototaxi) { setGarantiaModelo(modelo); }
  const modelosVisibles = modelos.filter((modelo) =>
    (filtroEstado === "TODOS" || (filtroEstado === "ACTIVOS" ? modelo.activo : !modelo.activo))
    && (!marcaFiltro || modelo.marcaId === marcaFiltro));
  return <section className={cn("inventory-moto-page", c.page)}>
    <div className={cn("inventory-moto-catalog-view", c.catalog)}>
      {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
      <ListadoMaestro<ModeloMototaxi>
        variante="tabla" titulo="Modelos de mototaxi"
        registros={modelosVisibles} cargando={cargando} error={!modal ? error : undefined}
        claseCabecera="inventario-listado-cabecera"
        vacio="No hay modelos que coincidan con estos filtros."
        controlesCabecera={<>
          <label className="listado-maestro-busqueda">Buscar modelo<input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, marca o código" /></label>
          <label className="listado-maestro-filtro">Marca<select value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}><option value="">Todas</option>{marcas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label>
          <label className="listado-maestro-filtro">Estado<select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value as typeof filtroEstado)}><option value="ACTIVOS">Activos</option><option value="INACTIVOS">Inactivos</option><option value="TODOS">Todos</option></select></label>
          <Link className="inline-flex h-[42px] shrink-0 items-center rounded-md border border-[var(--erp-border)] px-3 text-xs font-semibold text-[var(--erp-ink)] no-underline hover:bg-[var(--erp-surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2" to="/mototaxis/garantias">Garantías</Link>
          {puedeCrear && <RegistrarAccionPrincipal onClick={abrirNuevo} etiqueta="Nuevo modelo de mototaxi" />}
        </>}
        paginacion={{ modo: "local" }} resetKey={`${busqueda}|${filtroEstado}|${marcaFiltro}`}
        encabezadoTabla={<tr><th>Modelo</th><th>Categoría</th><th>Existencias</th><th>Precio general</th><th>Estado</th><th>Acciones</th></tr>}
        renderizarFila={(modelo) => {
          const nombre = [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ");
          return <tr key={modelo.id}>
            <td><strong className="block text-[var(--erp-ink)]">{nombre}</strong><small>{modelo.codigo}</small></td>
            <td>{modelo.categoriaVehicular}</td>
            <td className="tabular-nums">{modelo.stockDisponible} <small>disponibles</small></td>
            <td>{modelo.precioVenta == null ? <Etiqueta compacta tono="neutral">Sin precio</Etiqueta> : <strong className="tabular-nums">{monedaInventario(modelo.precioVenta)}</strong>}</td>
            <td><Etiqueta compacta tono={modelo.activo ? "positiva" : "neutral"}>{modelo.activo ? "Activo" : "Inactivo"}</Etiqueta></td>
            <td><div className="flex flex-wrap gap-1.5">
              <BotonAccion etiqueta={`Ver ficha de ${nombre}`} tono="informativa" icono={<Eye aria-hidden="true" />} onClick={() => void abrirDetalle(modelo, "ficha")} />
              <BotonAccion etiqueta={`${puedeEditar ? "Configurar precios de" : "Ver precios de"} ${nombre}`} tono="positiva" icono={<span aria-hidden="true">S/</span>} onClick={() => void abrirDetalle(modelo, "precios")} />
              <BotonAccion etiqueta={`Gestionar garantías de ${nombre}`} tono="informativa" icono={<PackageSearch aria-hidden="true" />} onClick={() => void abrirGarantias(modelo)} />
              {puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar datos de ${nombre}`} onClick={() => abrirEdicion(modelo)} />}
            </div></td>
          </tr>;
        }}
      />
    </div>
    {detalle?.tipo === "cargando" && <DialogoCatalogo titulo="Modelo de mototaxi" articulo={detalle.modelo.nombre} codigo={detalle.modelo.codigo} alCerrar={cerrarDetalle}><p role="status">Cargando el modelo…</p></DialogoCatalogo>}
    {detalle?.tipo === "ficha" && <FichaModelo analisis={detalle.analisis} alCerrar={cerrarDetalle}
      alEditar={puedeEditar ? () => { cerrarDetalle(); abrirEdicion(detalle.analisis.modelo); } : undefined} />}
    {garantiaModelo && <FormularioGarantiaModelo modelo={garantiaModelo} puedeEditar={puedeEditar} alCerrar={() => setGarantiaModelo(null)} alGuardar={() => { setGarantiaModelo(null); setExito("La garantía del modelo quedó guardada."); }} />}`r`n    {detalle?.tipo === "precios" && <PreciosModelo modelo={detalle.modelo} historial={detalle.historial} compras={detalle.compras} puedeEditar={puedeEditar} alCerrar={cerrarDetalle} alGuardar={() => void cargarModelos()} />}
    {modal && <FormularioModeloMototaxi modelo={editando ?? undefined} marcas={marcas} alCerrar={() => setModal(false)} alGuardar={(guardado) => {
      setModal(false);
      setExito(`${guardado.marca} ${guardado.nombre} ${editando ? "actualizado" : "agregado"} al catálogo.`);
      void cargarModelos();
    }} />}
  </section>;
}
