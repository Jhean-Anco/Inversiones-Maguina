import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import "./inventario-mototaxis-page.css";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AccionIcono } from "../../components/ui/accion-icono";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type ModeloMototaxi } from "../../services/mototaxis.service";

type DatosModelo = {
  marcaId: string; nombre: string; version: string; precioVenta: string; categoriaVehicular: string;
  fabricante: string; paisFabricacion: string; marcaMotor: string; modeloMotor: string; cilindradaCc: string;
  combustible: string; transmision: string; carroceria: string; capacidadAsientos: string; capacidadCargaKg: string; especificacionesAdicionales: string;
};
const nuevoModelo = (): DatosModelo => ({ marcaId: "", nombre: "", version: "", precioVenta: "", categoriaVehicular: "L5", fabricante: "", paisFabricacion: "", marcaMotor: "", modeloMotor: "", cilindradaCc: "", combustible: "", transmision: "", carroceria: "", capacidadAsientos: "", capacidadCargaKg: "", especificacionesAdicionales: "" });
const datosDeModelo = (modelo: ModeloMototaxi): DatosModelo => ({ marcaId: modelo.marcaId, nombre: modelo.nombre, version: modelo.version ?? "", precioVenta: modelo.precioVenta ?? "", categoriaVehicular: modelo.categoriaVehicular, fabricante: modelo.fabricante ?? "", paisFabricacion: modelo.paisFabricacion ?? "", marcaMotor: modelo.marcaMotor ?? "", modeloMotor: modelo.modeloMotor ?? "", cilindradaCc: String(modelo.cilindradaCc ?? ""), combustible: modelo.combustible ?? "", transmision: modelo.transmision ?? "", carroceria: modelo.carroceria ?? "", capacidadAsientos: String(modelo.capacidadAsientos ?? ""), capacidadCargaKg: modelo.capacidadCargaKg ?? "", especificacionesAdicionales: modelo.especificacionesAdicionales ?? "" });
const soles = (valor: string | null) => valor === null ? "Precio pendiente" : `S/ ${Number(valor).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const paisesSugeridos = ["China", "Perú", "India", "Japón", "Tailandia", "Indonesia", "Brasil", "Colombia", "México", "Taiwán", "Estados Unidos"];
const combustiblesSugeridos = ["Gasolina", "Diésel", "GLP", "GNV", "Eléctrico", "Híbrido"];
const transmisionesSugeridas = ["Manual", "Automática", "Semiautomática", "CVT"];
const carroceriasSugeridas = ["Trimoto para pasajeros", "Trimoto de carga", "Mototaxi", "Motofurgón"];

export function InventarioMototaxisPage({ permisos }: { permisos: string[] }) {
  const navegar = useNavigate();
  const puedeCrear = permisos.includes("MOTOTAXIS.CREAR");
  const puedeEditar = permisos.includes("MOTOTAXIS.EDITAR");
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [marcas, setMarcas] = useState<Array<{ id: string; nombre: string; activo: boolean }>>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"TODOS" | "ACTIVOS" | "INACTIVOS">("ACTIVOS");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<ModeloMototaxi | null>(null);
  const [preciosEditados, setPreciosEditados] = useState<Record<string, string>>({});
  const [guardandoPrecioId, setGuardandoPrecioId] = useState<string | null>(null);
  const [datos, setDatos] = useState<DatosModelo>(nuevoModelo());
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const cargarModelos = useCallback(async () => {
    setCargando(true); setError("");
    try { setModelos(await servicioMototaxis.modelos(busqueda, true)); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; } setError(problema instanceof Error ? problema.message : "No se pudo cargar el catálogo de mototaxis."); }
    finally { setCargando(false); }
  }, [busqueda, navegar]);

  useEffect(() => { void servicioMototaxis.marcas().then(setMarcas).catch((problema: unknown) => setError(problema instanceof Error ? problema.message : "No se pudieron cargar las marcas.")); }, []);
  useEffect(() => { const temporizador = window.setTimeout(() => void cargarModelos(), busqueda.trim() ? 220 : 0); return () => window.clearTimeout(temporizador); }, [cargarModelos, busqueda]);
  useEffect(() => {
    if (!modal) return;
    const anterior = document.body.style.overflow; document.body.style.overflow = "hidden";
    const cerrar = (evento: KeyboardEvent) => { if (evento.key === "Escape" && !guardando) setModal(false); };
    window.addEventListener("keydown", cerrar);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", cerrar); };
  }, [modal, guardando]);

  function abrirNuevo() { setDatos(nuevoModelo()); setEditando(null); setError(""); setExito(""); setModal(true); }
  function abrirEdicion(modelo: ModeloMototaxi) {
    setDatos(datosDeModelo(modelo));
    setEditando(modelo); setError(""); setExito(""); setModal(true);
  }
  async function guardarPrecio(modelo: ModeloMototaxi) {
    const precioVenta = preciosEditados[modelo.id] ?? modelo.precioVenta ?? "";
    if (!Number.isFinite(Number(precioVenta)) || Number(precioVenta) <= 0) { setError("Ingresa un precio de venta mayor que cero."); return; }
    setError(""); setExito(""); setGuardandoPrecioId(modelo.id);
    try {
      const actualizado = await servicioMototaxis.actualizarModelo(modelo.id, { ...datosDeModelo(modelo), precioVenta });
      setModelos((actuales) => actuales.map((item) => item.id === actualizado.id ? actualizado : item));
      setPreciosEditados((actuales) => { const siguientes = { ...actuales }; delete siguientes[modelo.id]; return siguientes; });
      setExito(`Precio de ${actualizado.marca} ${actualizado.nombre} actualizado.`);
    } catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; } setError(problema instanceof Error ? problema.message : "No se pudo actualizar el precio."); }
    finally { setGuardandoPrecioId(null); }
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError(""); setExito(""); setGuardando(true);
    try {
      const guardado = editando ? await servicioMototaxis.actualizarModelo(editando.id, datos) : await servicioMototaxis.crearModelo(datos);
      setModal(false); setExito(`${guardado.marca} ${guardado.nombre} ${editando ? "actualizado" : "agregado"} al catálogo.`); await cargarModelos();
    } catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; } setError(problema instanceof Error ? problema.message : "No se pudo guardar el modelo."); }
    finally { setGuardando(false); }
  }

  const modelosVisibles = modelos.filter((modelo) => filtroEstado === "TODOS" || (filtroEstado === "ACTIVOS" ? modelo.activo : !modelo.activo));
  return <section className="inventory-moto-page">
    <div className="inventory-moto-catalog-view">
      {exito && <div className="inventory-moto-success" role="status">{exito}<button type="button" onClick={() => setExito("")} aria-label="Cerrar aviso">&#215;</button></div>}
      <ListadoMaestro
          variante="tabla"
          titulo="Modelos de mototaxi"
          etiqueta="Catálogo de modelos de mototaxi"
          registros={modelosVisibles}
          cargando={cargando}
          error={!modal ? error : ""}
          vacio={<div className="inventory-moto-empty"><strong>{busqueda || filtroEstado !== "ACTIVOS" ? "No hay modelos para mostrar" : "Aún no hay modelos registrados"}</strong><span>{busqueda ? "Prueba con otra marca o nombre." : "Agrega los modelos que ofrece la empresa, con sus características y precio."}</span></div>}
          controlesCabecera={<><label className="listado-maestro-busqueda">Buscar modelo<input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Marca o código" aria-label="Buscar modelo, marca o código" /></label>{puedeCrear && <RegistrarAccionPrincipal onClick={abrirNuevo} etiqueta="Crear modelo de mototaxi" />}<label className="listado-maestro-filtro">Estado<select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as typeof filtroEstado)}><option value="ACTIVOS">Activos</option><option value="TODOS">Todos</option><option value="INACTIVOS">Inactivos</option></select></label></>}
          paginacion={{ modo: "local" }}
          resetKey={`${busqueda}|${filtroEstado}`}
          encabezadoTabla={<tr><th>Modelo</th><th>Categoría</th><th>Motor</th><th>Combustible</th><th>Capacidad</th><th>Precio de venta S/</th><th>Estado</th><th>Acciones</th></tr>}
          renderizarFila={(modelo) => {
            const precio = preciosEditados[modelo.id] ?? modelo.precioVenta ?? "";
            const cambioPrecio = Number(precio) !== Number(modelo.precioVenta);
            return <tr key={modelo.id} className={modelo.activo ? "" : "is-inactive"}>
              <td><div className="inventory-moto-table-model"><span className="inventory-moto-table-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 16h1l2-5h8l3 5h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8 11l1-3h5l2 3M3 13h4M19 13h2"/></svg></span><span><strong>{modelo.marca} {modelo.nombre}{modelo.version ? ` ${modelo.version}` : ""}</strong><small>{modelo.codigo}{modelo.fabricante ? ` · ${modelo.fabricante}` : ""}</small></span></div></td>
              <td>{modelo.categoriaVehicular}</td><td>{modelo.cilindradaCc ? `${modelo.cilindradaCc} cc` : modelo.modeloMotor || "Sin dato"}</td><td>{modelo.combustible || "Sin dato"}</td><td>{modelo.capacidadAsientos ? `${modelo.capacidadAsientos} asientos` : modelo.capacidadCargaKg ? `${modelo.capacidadCargaKg} kg` : "Sin dato"}</td>
              <td>{puedeEditar ? <label className="inventory-moto-price-input"><span className="sr-only">Precio de venta de {modelo.marca} {modelo.nombre}</span><input type="number" min="0.01" step="0.01" inputMode="decimal" value={precio} onChange={(evento) => setPreciosEditados((actuales) => ({ ...actuales, [modelo.id]: evento.target.value }))} /></label> : <strong>{soles(modelo.precioVenta)}</strong>}</td>
              <td><span className={`inventory-moto-model-status${modelo.activo ? "" : " is-inactive"}`}>{modelo.activo ? "Activo" : "Inactivo"}</span></td>
              <td><div className="inventory-moto-row-actions">{puedeEditar && <><button type="button" disabled={!cambioPrecio || guardandoPrecioId !== null} onClick={() => void guardarPrecio(modelo)}>{guardandoPrecioId === modelo.id ? "Guardando…" : "Guardar"}</button><AccionIcono accion="editar" etiqueta={`Editar ficha ${modelo.marca} ${modelo.nombre}`} onClick={() => abrirEdicion(modelo)} /></>}</div></td>
            </tr>;
          }}
          claseTabla="inventory-moto-table"
          claseContenedor="inventory-moto-table-wrap"
      />
    </div>
    {modal && <div className="inventory-moto-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) setModal(false); }}><form className="inventory-moto-modal" role="dialog" aria-modal="true" aria-labelledby="inventory-moto-modal-title" onSubmit={(evento) => void guardar(evento)}>
      <header><div><span>FICHA COMERCIAL Y TÉCNICA</span><h2 id="inventory-moto-modal-title">{editando ? "Editar modelo" : "Nuevo modelo"}</h2></div><button type="button" aria-label="Cerrar ficha" onClick={() => { if (!guardando) setModal(false); }}>×</button></header>
      {error && <p className="inventory-moto-alert" role="alert">{error}</p>}
      <div className="inventory-moto-form-grid">
        <label>Marca<select required value={datos.marcaId} onChange={(e) => setDatos((actual) => ({ ...actual, marcaId: e.target.value }))}><option value="">Selecciona una marca</option>{marcas.filter((marca) => marca.activo || marca.id === datos.marcaId).map((marca) => <option value={marca.id} key={marca.id}>{marca.nombre}</option>)}</select></label>
        <label>Modelo<input required maxLength={120} value={datos.nombre} onChange={(e) => setDatos((actual) => ({ ...actual, nombre: e.target.value }))} placeholder="Ej. RA 150" /></label>
        <label>Versión<input maxLength={80} value={datos.version} onChange={(e) => setDatos((actual) => ({ ...actual, version: e.target.value }))} /></label>
        <label>Precio de venta (S/)<input type="number" required min="0.01" max="999999999999.99" step="0.01" inputMode="decimal" value={datos.precioVenta} onChange={(e) => setDatos((actual) => ({ ...actual, precioVenta: e.target.value }))} placeholder="0.00" /></label>
        <label>Categoría vehicular<select required value={datos.categoriaVehicular} onChange={(e) => setDatos((actual) => ({ ...actual, categoriaVehicular: e.target.value }))}><option value="L5">L5</option><option value="L4">L4</option><option value="L3">L3</option><option value="L2">L2</option><option value="L1">L1</option></select></label>
        <label>Fabricante<input list="inventory-moto-manufacturers" maxLength={160} value={datos.fabricante} onChange={(e) => setDatos((actual) => ({ ...actual, fabricante: e.target.value }))} /><datalist id="inventory-moto-manufacturers">{marcas.map((marca) => <option key={marca.id} value={marca.nombre} />)}</datalist></label>
        <label>País de fabricación<input list="inventory-moto-countries" maxLength={100} value={datos.paisFabricacion} onChange={(e) => setDatos((actual) => ({ ...actual, paisFabricacion: e.target.value }))} /><datalist id="inventory-moto-countries">{paisesSugeridos.map((pais) => <option key={pais} value={pais} />)}</datalist></label>
        <label>Marca del motor<input list="inventory-moto-engine-brands" maxLength={100} value={datos.marcaMotor} onChange={(e) => setDatos((actual) => ({ ...actual, marcaMotor: e.target.value }))} /><datalist id="inventory-moto-engine-brands">{marcas.map((marca) => <option key={marca.id} value={marca.nombre} />)}</datalist></label>
        <label>Modelo del motor<input maxLength={100} value={datos.modeloMotor} onChange={(e) => setDatos((actual) => ({ ...actual, modeloMotor: e.target.value }))} /></label>
        <label>Cilindrada (cc)<input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.cilindradaCc} onChange={(e) => setDatos((actual) => ({ ...actual, cilindradaCc: e.target.value }))} /></label>
        <label>Combustible<input list="inventory-moto-fuels" maxLength={40} value={datos.combustible} onChange={(e) => setDatos((actual) => ({ ...actual, combustible: e.target.value }))} /><datalist id="inventory-moto-fuels">{combustiblesSugeridos.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></label>
        <label>Transmisión<input list="inventory-moto-transmissions" maxLength={60} value={datos.transmision} onChange={(e) => setDatos((actual) => ({ ...actual, transmision: e.target.value }))} /><datalist id="inventory-moto-transmissions">{transmisionesSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></label>
        <label>Carrocería<input list="inventory-moto-bodyworks" maxLength={80} value={datos.carroceria} onChange={(e) => setDatos((actual) => ({ ...actual, carroceria: e.target.value }))} /><datalist id="inventory-moto-bodyworks">{carroceriasSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></label>
        <label>Capacidad de asientos<input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.capacidadAsientos} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadAsientos: e.target.value }))} /></label>
        <label>Carga máxima (kg)<input type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={datos.capacidadCargaKg} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadCargaKg: e.target.value }))} /></label>
        <label className="inventory-moto-wide">Notas técnicas<textarea maxLength={2000} value={datos.especificacionesAdicionales} onChange={(e) => setDatos((actual) => ({ ...actual, especificacionesAdicionales: e.target.value }))} /></label>
      </div>
      <footer><button type="button" disabled={guardando} onClick={() => setModal(false)}>Cancelar</button><button className="inventory-moto-save" type="submit" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar modelo"}</button></footer>
    </form></div>}
  </section>;
}
