import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { inventarioMototaxisClasses as c } from "./inventario-mototaxis-page-classes";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BadgeDollarSign, ChevronDown, Eye, Pencil, ShieldCheck } from "lucide-react";
import { BotonAccion } from "../../components/ui/boton-accion";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AnalisisModeloMototaxi, type PrecioModeloMototaxi, type ModeloMototaxi } from "../../services/mototaxis.service";
import { DialogoCatalogo, monedaInventario } from "../../components/inventario/dialogo-catalogo";
import { FormularioModeloMototaxi } from "./formulario-modelo-mototaxi";
import { FichaModelo } from "./ficha-modelo";
import { PreciosModelo } from "./precios-modelo";
import { FormularioGarantiaModelo } from "./formulario-garantia-modelo";

// Colores fijos de estado (iguales en todos los submódulos).
const tonosEstado = {
  activo: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  inactivo: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
};

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
  const [filtroEstado, setFiltroEstado] = useState<"ACTIVOS" | "INACTIVOS">("ACTIVOS");
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
  const delaMarca = modelos.filter((modelo) => !marcaFiltro || modelo.marcaId === marcaFiltro);
  const conteo = { ACTIVOS: delaMarca.filter((modelo) => modelo.activo).length, INACTIVOS: delaMarca.filter((modelo) => !modelo.activo).length };
  const modelosVisibles = delaMarca.filter((modelo) => (filtroEstado === "ACTIVOS" ? modelo.activo : !modelo.activo));
  return <section className={c.page}>
    {puedeCrear && <RegistrarAccionPrincipal onClick={abrirNuevo} etiqueta="Nuevo modelo de mototaxi" />}
    {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
    <div className={v.toolbar}>
      <label className={`${v.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, marca o código" aria-label="Buscar modelo" />
      </label>
      <label className={v.selectField}><select aria-label="Marca" value={marcaFiltro} onChange={(e) => setMarcaFiltro(e.target.value)}><option value="">Todas las marcas</option>{marcas.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select><ChevronDown aria-hidden="true" /></label>
      <div className={v.filters} role="group" aria-label="Estado">
        {(["ACTIVOS", "INACTIVOS"] as const).map((estado) => <button key={estado} type="button" className={v.chip} aria-pressed={filtroEstado === estado} onClick={() => setFiltroEstado(estado)}>
          {estado === "ACTIVOS" ? "Activos" : "Inactivos"}<span className={v.chipCount}>{conteo[estado]}</span>
        </button>)}
      </div>
      <Link className={`${v.chip} no-underline`} to="/mototaxis/garantias"><ShieldCheck className="size-4" aria-hidden="true" />Garantías</Link>
    </div>
    <ListadoMaestro<ModeloMototaxi>
      variante="tabla" titulo="Modelos de mototaxi"
      registros={modelosVisibles} cargando={cargando} error={!modal ? error : undefined}
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      vacio={<div className={v.empty}><strong>No hay modelos para mostrar</strong><span>{busqueda.trim() || marcaFiltro ? "Prueba con otra búsqueda o marca." : "Registra el primer modelo de mototaxi del catálogo."}</span></div>}
      paginacion={{ modo: "local" }} resetKey={`${busqueda}|${filtroEstado}|${marcaFiltro}`}
      encabezadoTabla={<tr><th>Modelo</th><th>Categoría</th><th>Existencias</th><th>Precio general</th><th>Estado</th><th>Acciones</th></tr>}
      renderizarFila={(modelo) => {
        const nombre = [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ");
        const tono = modelo.activo ? tonosEstado.activo : tonosEstado.inactivo;
        return <tr key={modelo.id}>
          <td><strong className={v.documentCode}>{nombre}</strong><small className={v.minorText}>{modelo.codigo}</small></td>
          <td>{modelo.categoriaVehicular}</td>
          <td className="[font-variant-numeric:tabular-nums]">{modelo.stockDisponible} <small className="text-[11px] text-[#6d8093]">{modelo.stockDisponible === 1 ? "disponible" : "disponibles"}</small></td>
          <td>{modelo.precioVenta == null ? <span className="text-[11px] text-[#6d8093]">Sin precio</span> : <span className={v.total}>{monedaInventario(modelo.precioVenta)}</span>}</td>
          <td><span className={`${v.status} ${tono.caja}`}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{modelo.activo ? "Activo" : "Inactivo"}</span></td>
          <td><div className={v.rowActions}>
            <BotonAccion etiqueta={`Ver ficha de ${nombre}`} tono="neutral" icono={<Eye aria-hidden="true" />} onClick={() => void abrirDetalle(modelo, "ficha")} />
            <BotonAccion etiqueta={`${puedeEditar ? "Configurar precios de" : "Ver precios de"} ${nombre}`} tono="positiva" icono={<BadgeDollarSign aria-hidden="true" />} onClick={() => void abrirDetalle(modelo, "precios")} />
            <BotonAccion etiqueta={`Gestionar garantías de ${nombre}`} tono="advertencia" icono={<ShieldCheck aria-hidden="true" />} onClick={() => abrirGarantias(modelo)} />
            {puedeEditar && <BotonAccion etiqueta={`Editar datos de ${nombre}`} tono="informativa" icono={<Pencil aria-hidden="true" />} onClick={() => abrirEdicion(modelo)} />}
          </div></td>
        </tr>;
      }}
    />
    {detalle?.tipo === "cargando" && <DialogoCatalogo titulo="Modelo de mototaxi" articulo={detalle.modelo.nombre} codigo={detalle.modelo.codigo} alCerrar={cerrarDetalle}><p role="status">Cargando el modelo…</p></DialogoCatalogo>}
    {detalle?.tipo === "ficha" && <FichaModelo analisis={detalle.analisis} alCerrar={cerrarDetalle}
      alEditar={puedeEditar ? () => { cerrarDetalle(); abrirEdicion(detalle.analisis.modelo); } : undefined} />}
    {garantiaModelo && <FormularioGarantiaModelo modelo={garantiaModelo} puedeEditar={puedeEditar} alCerrar={() => setGarantiaModelo(null)} alGuardar={() => { setGarantiaModelo(null); setExito("La garantía del modelo quedó guardada."); }} />}
    {detalle?.tipo === "precios" && <PreciosModelo modelo={detalle.modelo} historial={detalle.historial} compras={detalle.compras} puedeEditar={puedeEditar} alCerrar={cerrarDetalle} alGuardar={() => void cargarModelos()} />}
    {modal && <FormularioModeloMototaxi modelo={editando ?? undefined} marcas={marcas} alCerrar={() => setModal(false)} alGuardar={(guardado) => {
      setModal(false);
      setExito(`${guardado.marca} ${guardado.nombre} ${editando ? "actualizado" : "agregado"} al catálogo.`);
      void cargarModelos();
    }} />}
  </section>;
}
