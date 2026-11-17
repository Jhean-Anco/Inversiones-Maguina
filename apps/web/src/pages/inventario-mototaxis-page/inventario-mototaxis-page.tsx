import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import "./inventario-mototaxis-page.css";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, X } from "lucide-react";
import { createPortal } from "react-dom";
import { AccionIcono } from "../../components/ui/accion-icono";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { ErrorApi } from "../../services/api-cliente";
import { COLORES_ADICIONALES_MOTOTAXI, COLORES_RAPIDOS_MOTOTAXI, etiquetaColorMototaxi, hexColorMototaxi, servicioMototaxis, type AnalisisModeloMototaxi, type ModeloMototaxi } from "../../services/mototaxis.service";

const monedaMototaxi = (valor: string | number | null | undefined) => valor == null ? "Sin registros" : new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(Number(valor));
const fechaMototaxi = (valor: string | null | undefined) => valor ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`)) : "Sin registros";

function GraficoPreciosMototaxi({ titulo, datos, tono }: { titulo: string; datos: Array<{ mes: string; promedio: string; cantidad: string }>; tono: "compra" | "venta" }) {
  if (!datos.length) return <section className={`inventory-moto-chart is-${tono}`}><h3>{titulo}</h3><div className="inventory-moto-chart-empty">Aún no hay movimientos para mostrar.</div></section>;
  const valores = datos.map((dato) => Number(dato.promedio));
  const minimo = Math.min(...valores); const maximo = Math.max(...valores); const rango = Math.max(maximo - minimo, maximo * .08, 1);
  const puntos = valores.map((valor, indice) => `${datos.length === 1 ? 300 : 24 + indice * 552 / (datos.length - 1)},${148 - (valor - (minimo - rango * .15)) / (rango * 1.3) * 118}`).join(" ");
  return <section className={`inventory-moto-chart is-${tono}`}><header><h3>{titulo}</h3><span>{datos.length} {datos.length === 1 ? "mes" : "meses"}</span></header><svg viewBox="0 0 600 180" role="img" aria-label={`${titulo}, promedio por mes`}><line x1="20" y1="150" x2="580" y2="150" className="inventory-moto-chart-axis"/><polyline points={puntos} className="inventory-moto-chart-line" fill="none"/>{puntos.split(" ").map((punto, indice) => { const [x, y] = punto.split(","); return <g key={datos[indice].mes}><circle cx={x} cy={y} r="4"/><title>{datos[indice].mes}: {monedaMototaxi(datos[indice].promedio)} ({datos[indice].cantidad} unidades)</title></g>; })}</svg><div className="inventory-moto-chart-labels">{datos.map((dato) => <span key={dato.mes}>{new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${dato.mes}-01T00:00:00Z`))}</span>)}</div><footer>Promedio mensual ponderado · {monedaMototaxi(Math.min(...valores))} – {monedaMototaxi(Math.max(...valores))}</footer></section>;
}

type DatosModelo = {
  marcaId: string; nombre: string; version: string; categoriaVehicular: string;
  fabricante: string; paisFabricacion: string; marcaMotor: string; modeloMotor: string; tipoMototaxi: string; tipoMotor: string; tipoRefrigeracion: string; cilindradaCc: string;
  combustible: string; transmision: string; carroceria: string; capacidadAsientos: string; capacidadCargaKg: string; especificacionesAdicionales: string; coloresDisponibles: string[];
};
const nuevoModelo = (): DatosModelo => ({ marcaId: "", nombre: "", version: "", categoriaVehicular: "L5", fabricante: "", paisFabricacion: "", marcaMotor: "", modeloMotor: "", tipoMototaxi: "", tipoMotor: "", tipoRefrigeracion: "", cilindradaCc: "", combustible: "", transmision: "", carroceria: "", capacidadAsientos: "", capacidadCargaKg: "", especificacionesAdicionales: "", coloresDisponibles: [] });
const datosDeModelo = (modelo: ModeloMototaxi): DatosModelo => ({ marcaId: modelo.marcaId, nombre: modelo.nombre, version: modelo.version ?? "", categoriaVehicular: modelo.categoriaVehicular, fabricante: modelo.fabricante ?? "", paisFabricacion: modelo.paisFabricacion ?? "", marcaMotor: modelo.marcaMotor ?? "", modeloMotor: modelo.modeloMotor ?? "", tipoMototaxi: modelo.tipoMototaxi ?? "", tipoMotor: modelo.tipoMotor ?? "", tipoRefrigeracion: modelo.tipoRefrigeracion ?? "", cilindradaCc: String(modelo.cilindradaCc ?? ""), combustible: modelo.combustible ?? "", transmision: modelo.transmision ?? "", carroceria: modelo.carroceria ?? "", capacidadAsientos: String(modelo.capacidadAsientos ?? ""), capacidadCargaKg: modelo.capacidadCargaKg ?? "", especificacionesAdicionales: modelo.especificacionesAdicionales ?? "", coloresDisponibles: modelo.coloresDisponibles ?? [] });
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
  const [datos, setDatos] = useState<DatosModelo>(nuevoModelo());
  const [mostrarMasColores, setMostrarMasColores] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [vistaAnalisis, setVistaAnalisis] = useState<"PRECIOS" | "FICHA" | null>(null);
  const [analisisModelo, setAnalisisModelo] = useState<AnalisisModeloMototaxi | null>(null);
  const [cargandoAnalisis, setCargandoAnalisis] = useState(false);
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [precioLista, setPrecioLista] = useState("");
  const [errorAnalisis, setErrorAnalisis] = useState("");

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

  useEffect(() => {
    if (!vistaAnalisis) return;
    const anterior = document.body.style.overflow; document.body.style.overflow = "hidden";
    const cerrar = (evento: KeyboardEvent) => { if (evento.key === "Escape" && !guardandoPrecio) setVistaAnalisis(null); };
    window.addEventListener("keydown", cerrar);
    return () => { document.body.style.overflow = anterior; window.removeEventListener("keydown", cerrar); };
  }, [vistaAnalisis, guardandoPrecio]);

  async function abrirAnalisis(modelo: ModeloMototaxi, vista: "PRECIOS" | "FICHA") {
    setVistaAnalisis(vista); setAnalisisModelo(null); setErrorAnalisis(""); setPrecioLista(modelo.precioVenta ?? ""); setCargandoAnalisis(true);
    try { setAnalisisModelo(await servicioMototaxis.analisisModelo(modelo.id)); }
    catch (problema) { setErrorAnalisis(problema instanceof Error ? problema.message : "No se pudo cargar la información del modelo."); }
    finally { setCargandoAnalisis(false); }
  }

  async function guardarPrecioLista(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); if (!analisisModelo || !puedeEditar) return;
    setGuardandoPrecio(true); setErrorAnalisis("");
    try {
      const actualizado = await servicioMototaxis.actualizarPrecioVentaModelo(analisisModelo.modelo.id, precioLista.trim() || null);
      setAnalisisModelo((actual) => actual ? { ...actual, modelo: { ...actual.modelo, precioVenta: actualizado.precioVenta } } : actual);
      setModelos((actuales) => actuales.map((modelo) => modelo.id === actualizado.id ? { ...modelo, precioVenta: actualizado.precioVenta } : modelo));
      setExito("Se actualizó el precio de venta del modelo.");
    } catch (problema) { setErrorAnalisis(problema instanceof Error ? problema.message : "No se pudo guardar el precio de venta."); }
    finally { setGuardandoPrecio(false); }
  }

  function abrirNuevo() { setDatos(nuevoModelo()); setMostrarMasColores(false); setEditando(null); setError(""); setExito(""); setModal(true); }
  function abrirEdicion(modelo: ModeloMototaxi) {
    setDatos(datosDeModelo(modelo)); setMostrarMasColores(false);
    setEditando(modelo); setError(""); setExito(""); setModal(true);
  }
  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setError(""); setExito(""); setGuardando(true);
    try {
      const guardado = editando ? await servicioMototaxis.actualizarModelo(editando.id, datos) : await servicioMototaxis.crearModelo(datos);
      setModal(false); setExito(`${guardado.marca} ${guardado.nombre} ${editando ? "actualizado" : "agregado"} al catálogo.`); await cargarModelos();
    } catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; } setError(problema instanceof Error ? problema.message : "No se pudo guardar el modelo."); }
    finally { setGuardando(false); }
  }

  function alternarColor(color: string) {
    setDatos((actual) => {
      const yaSeleccionado = actual.coloresDisponibles.some((actualColor) => actualColor.toLocaleLowerCase("es-PE") === color.toLocaleLowerCase("es-PE"));
      if (yaSeleccionado) return { ...actual, coloresDisponibles: actual.coloresDisponibles.filter((actualColor) => actualColor.toLocaleLowerCase("es-PE") !== color.toLocaleLowerCase("es-PE")) };
      if (actual.coloresDisponibles.length >= 24) return actual;
      return { ...actual, coloresDisponibles: [...actual.coloresDisponibles, color] };
    });
  }
  const modelosVisibles = modelos.filter((modelo) => filtroEstado === "TODOS" || (filtroEstado === "ACTIVOS" ? modelo.activo : !modelo.activo));
  const esColorRapido = (color: string) => COLORES_RAPIDOS_MOTOTAXI.some((rapido) => rapido.toLocaleLowerCase("es-PE") === etiquetaColorMototaxi(color).toLocaleLowerCase("es-PE"));
  const coloresAdicionalesActivos = datos.coloresDisponibles.filter((color) => !esColorRapido(color)).length;
  const candidatosColorPaleta = mostrarMasColores
    ? [...datos.coloresDisponibles, ...COLORES_RAPIDOS_MOTOTAXI, ...COLORES_ADICIONALES_MOTOTAXI]
    : [...datos.coloresDisponibles.filter(esColorRapido), ...COLORES_RAPIDOS_MOTOTAXI];
  const coloresEnPaleta = candidatosColorPaleta.filter((color, indice, colores) => colores.findIndex((candidato) => etiquetaColorMototaxi(candidato).toLocaleLowerCase("es-PE") === etiquetaColorMototaxi(color).toLocaleLowerCase("es-PE")) === indice);
  return <section className="inventory-moto-page">
    <div className="inventory-moto-catalog-view">
      {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
      <ListadoMaestro
          variante="tabla"
          titulo="Modelos de mototaxi"
          etiqueta="Catálogo de modelos de mototaxi"
          registros={modelosVisibles}
          cargando={cargando}
          error={!modal ? error : ""}
          vacio={<div className="inventory-moto-empty"><strong>{busqueda || filtroEstado !== "ACTIVOS" ? "No hay modelos para mostrar" : "Aún no hay modelos registrados"}</strong><span>{busqueda ? "Prueba con otra marca o nombre." : "Registra las características técnicas del modelo."}</span></div>}
          controlesCabecera={<><label className="listado-maestro-busqueda">Buscar modelo<input type="search" value={busqueda} onChange={(evento) => setBusqueda(evento.target.value)} placeholder="Marca o código" aria-label="Buscar modelo, marca o código" /></label>{puedeCrear && <RegistrarAccionPrincipal onClick={abrirNuevo} etiqueta="Crear modelo de mototaxi" />}<label className="listado-maestro-filtro">Estado<select value={filtroEstado} onChange={(evento) => setFiltroEstado(evento.target.value as typeof filtroEstado)}><option value="ACTIVOS">Activos</option><option value="TODOS">Todos</option><option value="INACTIVOS">Inactivos</option></select></label></>}
          paginacion={{ modo: "local" }}
          resetKey={`${busqueda}|${filtroEstado}`}
          encabezadoTabla={<tr><th>Modelo</th><th>Categoría</th><th>Motor</th><th>Combustible</th><th>Capacidad</th><th>Estado</th><th>Acciones</th></tr>}
          renderizarFila={(modelo) => {
            return <tr key={modelo.id} className={modelo.activo ? "" : "is-inactive"}>
              <td><div className="inventory-moto-table-model"><span className="inventory-moto-table-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 16h1l2-5h8l3 5h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8 11l1-3h5l2 3M3 13h4M19 13h2"/></svg></span><span><strong>{modelo.marca} {modelo.nombre}{modelo.version ? ` ${modelo.version}` : ""}</strong><small>{modelo.codigo}{modelo.fabricante ? ` · ${modelo.fabricante}` : ""}</small></span></div></td>
              <td>{modelo.categoriaVehicular}</td><td>{modelo.cilindradaCc ? `${modelo.cilindradaCc} cc` : modelo.modeloMotor || "Sin dato"}</td><td>{modelo.combustible || "Sin dato"}</td><td>{modelo.capacidadAsientos ? `${modelo.capacidadAsientos} asientos` : modelo.capacidadCargaKg ? `${modelo.capacidadCargaKg} kg` : "Sin dato"}</td>
              <td><span className={`inventory-moto-model-status${modelo.activo ? "" : " is-inactive"}`}>{modelo.activo ? "Activo" : "Inactivo"}</span></td>
              <td><div className="inventory-moto-row-actions"><button type="button" className="erp-icon-action" title="Ver ficha completa de la mototaxi" aria-label={`Ver ficha completa de ${modelo.marca} ${modelo.nombre}`} onClick={() => void abrirAnalisis(modelo, "FICHA")}><Eye size={16} aria-hidden="true" /></button><button type="button" className="erp-icon-action inventory-moto-price-action" title="Ver precios y configurar la lista de venta" aria-label={`Ver precios de ${modelo.marca} ${modelo.nombre}`} onClick={() => void abrirAnalisis(modelo, "PRECIOS")}><span aria-hidden="true">S/</span></button>{puedeEditar && <AccionIcono accion="editar" etiqueta={`Editar ficha ${modelo.marca} ${modelo.nombre}`} onClick={() => abrirEdicion(modelo)} />}</div></td>
            </tr>;
          }}
          claseTabla="inventory-moto-table"
          claseContenedor="inventory-moto-table-wrap"
      />
    </div>
    {vistaAnalisis && createPortal(<div className="inventory-moto-modal-backdrop inventory-moto-analysis-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardandoPrecio) setVistaAnalisis(null); }}><section className="inventory-moto-modal inventory-moto-analysis" role="dialog" aria-modal="true" aria-labelledby="inventory-moto-analysis-title"><header className="inventory-moto-analysis-head"><div className="inventory-moto-analysis-brand"><img src="/logo.webp" alt="" /><div><span>{vistaAnalisis === "PRECIOS" ? "LISTA DE PRECIOS" : "FICHA DEL PRODUCTO"}</span><h2 id="inventory-moto-analysis-title">{analisisModelo ? `${analisisModelo.modelo.marca} ${analisisModelo.modelo.nombre}${analisisModelo.modelo.version ? ` ${analisisModelo.modelo.version}` : ""}` : "Información de mototaxi"}</h2><p>{analisisModelo?.modelo.codigo ?? "Consulta de precios, existencias e historial"}</p></div></div><button type="button" aria-label="Cerrar ficha" onClick={() => setVistaAnalisis(null)}><X size={20} /></button></header>
      <div className="inventory-moto-analysis-content">{cargandoAnalisis ? <div className="inventory-moto-analysis-loading">Cargando información registrada…</div> : errorAnalisis && !analisisModelo ? <p className="inventory-moto-alert" role="alert">{errorAnalisis}</p> : analisisModelo && <>
        {vistaAnalisis === "PRECIOS" ? <>
          <p className="inventory-moto-analysis-intro">Historial real de compra y precio de venta configurado para este modelo.</p>
          <div className="inventory-moto-price-summary"><article><span>Último precio de compra</span><strong>{monedaMototaxi(analisisModelo.compras.ultimoPrecio)}</strong><small>{analisisModelo.compras.ultima ? `${fechaMototaxi(analisisModelo.compras.ultima.fecha)} · ${analisisModelo.compras.ultima.proveedor}` : "Sin compras registradas"}</small></article><article><span>Precio promedio de compra</span><strong>{monedaMototaxi(analisisModelo.compras.promedioPonderado)}</strong><small>Promedio ponderado por unidades compradas · {analisisModelo.compras.unidades} unidades</small></article></div>
          <form className="inventory-moto-list-price-form" onSubmit={(evento) => void guardarPrecioLista(evento)}><label>Precio de venta para la lista<input type="number" min="0.01" max="999999999999.99" step="0.01" inputMode="decimal" value={precioLista} onChange={(evento) => setPrecioLista(evento.target.value)} placeholder="Ingresa el precio de venta" disabled={!puedeEditar || guardandoPrecio} /><small>{puedeEditar ? "Este precio se usará como referencia en las ventas de este modelo." : "No tienes permiso para editar el precio de venta."}</small></label><button type="submit" disabled={!puedeEditar || guardandoPrecio || !precioLista.trim()}>{guardandoPrecio ? "Guardando…" : "Guardar precio de venta"}</button></form>
          {errorAnalisis && <p className="inventory-moto-alert" role="alert">{errorAnalisis}</p>}
          <div className="inventory-moto-analysis-latest"><span>Última compra</span><strong>{analisisModelo.compras.ultima ? `${analisisModelo.compras.ultima.codigo} · ${analisisModelo.compras.ultima.documentoTipo}${analisisModelo.compras.ultima.documentoNumero ? ` ${analisisModelo.compras.ultima.documentoNumero}` : ""}` : "Sin compras registradas"}</strong></div>
          <GraficoPreciosMototaxi titulo="Evolución del precio de compra" datos={analisisModelo.compras.historialMensual} tono="compra" />
        </> : <>
          <div className="inventory-moto-product-hero"><span className="inventory-moto-table-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 16h1l2-5h8l3 5h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M8 11l1-3h5l2 3M3 13h4M19 13h2"/></svg></span><div><span>{analisisModelo.modelo.codigo} · {analisisModelo.modelo.activo ? "Activo" : "Inactivo"}</span><h3>{analisisModelo.modelo.tipoMototaxi === "CARGA" ? "Mototaxi de carga" : analisisModelo.modelo.tipoMototaxi === "PASAJERO" ? "Mototaxi para pasajeros" : "Modelo de mototaxi"}</h3><p>{analisisModelo.modelo.categoriaVehicular}{analisisModelo.modelo.fabricante ? ` · ${analisisModelo.modelo.fabricante}` : ""}{analisisModelo.modelo.paisFabricacion ? ` · ${analisisModelo.modelo.paisFabricacion}` : ""}</p></div></div>
          <div className="inventory-moto-kpi-grid"><article><span>Unidades en inventario</span><strong>{analisisModelo.existencias.total}</strong><small>{analisisModelo.existencias.disponibles} disponibles · {analisisModelo.existencias.reservadas} reservadas · {analisisModelo.existencias.vendidas} vendidas</small></article><article><span>Último precio de compra</span><strong>{monedaMototaxi(analisisModelo.compras.ultimoPrecio)}</strong><small>Promedio: {monedaMototaxi(analisisModelo.compras.promedioPonderado)}</small></article><article><span>Último precio de venta</span><strong>{monedaMototaxi(analisisModelo.ventas.ultimoPrecio)}</strong><small>Promedio: {monedaMototaxi(analisisModelo.ventas.promedioPonderado)}</small></article><article><span>Precio de lista actual</span><strong>{monedaMototaxi(analisisModelo.modelo.precioVenta)}</strong><small>Configurado en el catálogo del modelo</small></article></div>
          <div className="inventory-moto-analysis-charts"><GraficoPreciosMototaxi titulo="Precio promedio de compra" datos={analisisModelo.compras.historialMensual} tono="compra" /><GraficoPreciosMototaxi titulo="Precio promedio de venta" datos={analisisModelo.ventas.historialMensual} tono="venta" /></div>
          <div className="inventory-moto-analysis-sections"><section><h3>Identificación y características</h3><dl>{[["Marca", analisisModelo.modelo.marca], ["Modelo", analisisModelo.modelo.nombre], ["Versión", analisisModelo.modelo.version], ["Código", analisisModelo.modelo.codigo], ["Tipo", analisisModelo.modelo.tipoMototaxi], ["Categoría vehicular", analisisModelo.modelo.categoriaVehicular], ["Fabricante", analisisModelo.modelo.fabricante], ["País de fabricación", analisisModelo.modelo.paisFabricacion], ["Marca del motor", analisisModelo.modelo.marcaMotor], ["Modelo del motor", analisisModelo.modelo.modeloMotor], ["Tipo de motor", analisisModelo.modelo.tipoMotor?.replaceAll("_", " ")], ["Cilindrada", analisisModelo.modelo.cilindradaCc ? `${analisisModelo.modelo.cilindradaCc} cc` : null], ["Combustible", analisisModelo.modelo.combustible], ["Transmisión", analisisModelo.modelo.transmision], ["Refrigeración", analisisModelo.modelo.tipoRefrigeracion?.replaceAll("_", " ")], ["Carrocería", analisisModelo.modelo.carroceria], ["Capacidad de asientos", analisisModelo.modelo.capacidadAsientos], ["Capacidad de carga", analisisModelo.modelo.capacidadCargaKg ? `${analisisModelo.modelo.capacidadCargaKg} kg` : null], ["Colores disponibles", analisisModelo.modelo.coloresDisponibles?.join(", ")], ["Estado del catálogo", analisisModelo.modelo.activo ? "Activo" : "Inactivo"]].map(([etiqueta, valor]) => <div key={String(etiqueta)}><dt>{etiqueta}</dt><dd>{valor || "Sin dato"}</dd></div>)}</dl>{analisisModelo.modelo.especificacionesAdicionales && <p className="inventory-moto-additional-specs"><strong>Especificaciones adicionales</strong>{analisisModelo.modelo.especificacionesAdicionales}</p>}</section><section><h3>Existencias por estado</h3><dl>{[["Disponibles", analisisModelo.existencias.disponibles], ["Reservadas", analisisModelo.existencias.reservadas], ["Vendidas", analisisModelo.existencias.vendidas], ["En garantía", analisisModelo.existencias.garantia], ["Uso interno", analisisModelo.existencias.usoInterno], ["De baja", analisisModelo.existencias.baja], ["Faltantes", analisisModelo.existencias.faltantes], ["Compras registradas", analisisModelo.compras.operaciones], ["Unidades compradas", analisisModelo.compras.unidades], ["Ventas registradas", analisisModelo.ventas.operaciones], ["Unidades vendidas", analisisModelo.ventas.unidades]].map(([etiqueta, valor]) => <div key={String(etiqueta)}><dt>{etiqueta}</dt><dd>{valor}</dd></div>)}</dl><div className="inventory-moto-analysis-latest"><span>Última compra · {fechaMototaxi(analisisModelo.compras.ultima?.fecha)}</span><strong>{analisisModelo.compras.ultima ? `${monedaMototaxi(analisisModelo.compras.ultima.precio)} · ${analisisModelo.compras.ultima.proveedor}` : "Sin compras registradas"}</strong></div><div className="inventory-moto-analysis-latest"><span>Última venta · {fechaMototaxi(analisisModelo.ventas.ultima?.fecha)}</span><strong>{analisisModelo.ventas.ultima ? `${monedaMototaxi(analisisModelo.ventas.ultima.precio)} · ${analisisModelo.ventas.ultima.codigo}` : "Sin ventas registradas"}</strong></div></section></div>
        </>}
      </>}</div><footer className="inventory-moto-analysis-footer"><button type="button" onClick={() => setVistaAnalisis(null)}>Cerrar</button></footer></section></div>, document.body)}
    {modal && <div className="inventory-moto-modal-backdrop" role="presentation" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !guardando) setModal(false); }}><form className="inventory-moto-modal inventory-moto-modal-redesign" role="dialog" aria-modal="true" aria-labelledby="inventory-moto-modal-title" onSubmit={(evento) => void guardar(evento)}>
      <header className="inventory-moto-dialog-head"><div className="inventory-moto-brand-lockup"><img src="/logo.webp" alt="Inversiones Maguiña" /><div><span>INVENTARIO DE MOTOTAXIS</span><h2 id="inventory-moto-modal-title">{editando ? "Editar modelo" : "Nuevo modelo de mototaxi"}</h2><p>Registra el modelo y sus características técnicas.</p></div></div><button type="button" aria-label="Cerrar ficha" onClick={() => { if (!guardando) setModal(false); }}>×</button></header>
      {error && <p className="inventory-moto-alert" role="alert">{error}</p>}
      <div className="inventory-moto-dialog-content">
        <div className="inventory-moto-technical-fields">
          <section className="inventory-moto-field-group"><header><span>01</span><div><h3>Identificación</h3><p>Datos para reconocer el modelo.</p></div></header><div className="inventory-moto-form-grid">
            <label>Marca<select required value={datos.marcaId} onChange={(e) => setDatos((actual) => ({ ...actual, marcaId: e.target.value }))}><option value="">Selecciona una marca</option>{marcas.filter((marca) => marca.activo || marca.id === datos.marcaId).map((marca) => <option value={marca.id} key={marca.id}>{marca.nombre}</option>)}</select></label>
            <label>Nombre del modelo<input required maxLength={120} value={datos.nombre} onChange={(e) => setDatos((actual) => ({ ...actual, nombre: e.target.value }))} placeholder="Ej. RIK" /></label>
            <label>Tipo de mototaxi<select value={datos.tipoMototaxi} onChange={(e) => setDatos((actual) => ({ ...actual, tipoMototaxi: e.target.value }))}><option value="">Selecciona el tipo de mototaxi</option><option value="PASAJERO">Pasajero</option><option value="CARGA">Carga</option></select></label>
            <label>Categoría vehicular<select required value={datos.categoriaVehicular} onChange={(e) => setDatos((actual) => ({ ...actual, categoriaVehicular: e.target.value }))}><option value="L5">L5</option><option value="L4">L4</option><option value="L3">L3</option><option value="L2">L2</option><option value="L1">L1</option></select></label>
          </div></section>
          <section className="inventory-moto-field-group"><header><span>02</span><div><h3>Motor y configuración</h3><p>Especificaciones principales de fábrica.</p></div></header><div className="inventory-moto-form-grid">
            <label>Tipo de motor<select value={datos.tipoMotor} onChange={(e) => setDatos((actual) => ({ ...actual, tipoMotor: e.target.value }))}><option value="">Selecciona el tipo de motor</option><option value="2_TIEMPOS">2 tiempos</option><option value="4_TIEMPOS">4 tiempos</option></select></label>
            <label>Cilindrada<div className="inventory-moto-input-unit"><input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.cilindradaCc} onChange={(e) => setDatos((actual) => ({ ...actual, cilindradaCc: e.target.value }))} placeholder="150" /><span>cc</span></div></label>
            <label>Combustible<select value={datos.combustible} onChange={(e) => setDatos((actual) => ({ ...actual, combustible: e.target.value }))}><option value="">Selecciona el combustible</option>{combustiblesSugeridos.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select></label>
            <label>Carrocería<input list="inventory-moto-bodyworks" maxLength={80} value={datos.carroceria} onChange={(e) => setDatos((actual) => ({ ...actual, carroceria: e.target.value }))} placeholder="Ej. Trimoto pasajeros" /><datalist id="inventory-moto-bodyworks">{carroceriasSugeridas.map((opcion) => <option key={opcion} value={opcion} />)}</datalist></label>
            <label>{"Transmisi\u00f3n"}<select value={datos.transmision} onChange={(e) => setDatos((actual) => ({ ...actual, transmision: e.target.value }))}><option value="">{"Selecciona la transmisi\u00f3n"}</option>{transmisionesSugeridas.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}</select></label>
            <label>{"Tipo de refrigeraci\u00f3n"}<select value={datos.tipoRefrigeracion} onChange={(e) => setDatos((actual) => ({ ...actual, tipoRefrigeracion: e.target.value }))}><option value="">{"Selecciona la refrigeraci\u00f3n"}</option><option value="AIRE">Por aire</option><option value="LIQUIDO">{"Por l\u00edquido"}</option><option value="AIRE_ACEITE">Por aire y aceite</option></select></label>
            <label>Asientos<input type="number" min="1" max="2147483647" step="1" inputMode="numeric" value={datos.capacidadAsientos} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadAsientos: e.target.value }))} /></label>
            <label>Carga máxima<div className="inventory-moto-input-unit"><input type="number" min="0.01" max="99999999.99" step="0.01" inputMode="decimal" value={datos.capacidadCargaKg} onChange={(e) => setDatos((actual) => ({ ...actual, capacidadCargaKg: e.target.value }))} /><span>kg</span></div></label>
          </div></section>
          <section className="inventory-moto-field-group inventory-moto-colors-group"><header><span>03</span><div><h3>Colores disponibles</h3><p>Selecciona los tonos que manejas para este modelo.</p></div></header><div className="inventory-moto-color-grid">{coloresEnPaleta.map((color) => { const seleccionado = datos.coloresDisponibles.some((actual) => actual.toLocaleLowerCase("es-PE") === color.toLocaleLowerCase("es-PE")); const limiteAlcanzado = datos.coloresDisponibles.length >= 24 && !seleccionado; return <button key={color} type="button" disabled={limiteAlcanzado} className={`inventory-moto-color-option${seleccionado ? " is-selected" : ""}`} aria-pressed={seleccionado} onClick={() => alternarColor(color)}><span className="inventory-moto-color-dot" aria-hidden="true" style={{ backgroundColor: hexColorMototaxi(color) }} />{etiquetaColorMototaxi(color)}</button>; })}</div><button className="inventory-moto-color-more" type="button" aria-expanded={mostrarMasColores} onClick={() => setMostrarMasColores((actual) => !actual)}>{mostrarMasColores ? "Ver menos" : `Ver más${coloresAdicionalesActivos ? ` · ${coloresAdicionalesActivos} activos` : ""}`}</button><small>{datos.coloresDisponibles.length} de 24 tonos seleccionados. Pulsa un tono para activarlo o quitarlo.</small>{datos.coloresDisponibles.length >= 24 && <small className="inventory-moto-color-limit">Límite alcanzado. Desactiva un tono para elegir otro.</small>}</section>
        </div>
      </div>
      <footer className="inventory-moto-dialog-actions"><button type="button" disabled={guardando} onClick={() => setModal(false)}>Cancelar</button><button className="inventory-moto-save" type="submit" disabled={guardando}>{guardando ? "Guardando…" : editando ? "Guardar cambios" : "Crear modelo"}</button></footer>
    </form></div>}
  </section>;
}
