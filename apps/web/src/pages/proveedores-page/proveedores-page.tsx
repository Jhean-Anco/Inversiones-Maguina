import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import { useDialogoFlotante } from "../../hooks/use-dialogo-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIdentidad } from "../../services/identidad.service";
import { servicioProveedores, type DatosProveedorNuevo, type FichaProveedor, type ProveedorRegistrado } from "../../services/proveedores.service";
import { tamanioListadoSegunPantalla } from "../../components/ui/listado-maestro/paginacion-responsive";
import { BotonAccion } from "../../components/ui/boton-accion";
import { Eye } from "lucide-react";
import { BuscadorDirectorio, directorioClasses, Opcional, precargaBusqueda, SelectDirectorio, VacioDirectorio } from "../../components/ui/directorio/directorio";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { DialogoCatalogo } from "../../components/inventario/dialogo-catalogo";
import { dialogosModeloClasses as d, tonosPill } from "../inventario-mototaxis-page/dialogos-modelo-classes";

const nombreDe = (proveedor: ProveedorRegistrado) => proveedor.nombre || proveedor.razonSocial || [proveedor.nombres, proveedor.apellidoPaterno, proveedor.apellidoMaterno].filter(Boolean).join(" ");


export function ProveedoresPage({ puedeCrear }: { puedeCrear: boolean }) {
  const navegar = useNavigate();
  const [proveedores, setProveedores] = useState<ProveedorRegistrado[]>([]);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(() => tamanioListadoSegunPantalla(window.innerWidth, "tabla"));
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [proveedorEnDetalle, setProveedorEnDetalle] = useState<ProveedorRegistrado | null>(null);
  const cargar = useCallback(async () => {
    setCargando(true);
    try { const resultado = await servicioProveedores.listarPaginado(pagina, porPagina, busqueda); setProveedores(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError(""); }
    catch (problema) { if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true }); else setError(problema instanceof Error ? problema.message : "No se pudo cargar el directorio."); }
    finally { setCargando(false); }
  }, [busqueda, navegar, pagina, porPagina]);
  useEffect(() => { const timer = window.setTimeout(() => void cargar(), busqueda ? 180 : 0); return () => window.clearTimeout(timer); }, [cargar]);

  async function guardar(datos: DatosProveedorNuevo) {
    try { await servicioProveedores.crear(datos); setAbierto(false); setExito("Proveedor registrado y disponible para las compras."); await cargar(); return null; }
    catch (problema) { return problema instanceof Error ? problema.message : "No se pudo registrar el proveedor."; }
  }

  return <section className={v.page}>
    {exito && <NotificacionFlotante tipo="exito" mensaje={exito} onCerrar={() => setExito("")} />}
    {puedeCrear && <RegistrarAccionPrincipal etiqueta="Crear proveedor" onClick={() => { setError(""); setAbierto(true); }} />}
    <div className={v.toolbar}>
      <BuscadorDirectorio id="proveedores-search" valor={busqueda} alCambiar={(valor) => { setBusqueda(valor); setPagina(1); }} placeholder="Buscar por nombre, DNI o RUC" etiqueta="Buscar proveedor" />
    </div>
    <ListadoMaestro<ProveedorRegistrado> variante="tabla" titulo="Directorio de proveedores"
      claseCabecera={v.header} centrarCeldas={false} claseTabla={v.table} claseContenedor={v.tableScroll}
      registros={proveedores} cargando={cargando} error={error || undefined} resetKey={busqueda}
      paginacion={{ modo: "remota", pagina, tamanio: porPagina, total, totalPaginas, desde: total ? (pagina - 1) * porPagina + 1 : 0, hasta: Math.min(pagina * porPagina, total), alCambiarPagina: setPagina, alCambiarTamanio: (tamanio) => { setPorPagina(tamanio); setPagina(1); } }}
      vacio={<VacioDirectorio busqueda={busqueda} entidad="proveedor" ayuda="Revisa el nombre o documento, o regístralo ahora." alCrear={puedeCrear ? () => { setError(""); setAbierto(true); } : undefined} sinRegistros={<><strong>Aún no hay proveedores registrados</strong><span>Los proveedores registrados aquí también estarán disponibles al registrar compras.</span></>} />}
      encabezadoTabla={<tr><th>Proveedor</th><th>Documento</th><th>Tipo</th><th>Acciones</th></tr>}
      renderizarFila={(proveedor) => {
        const nombre = nombreDe(proveedor);
        const esEmpresa = proveedor.tipoDocumento === "RUC" && proveedor.numeroDocumento.startsWith("20");
        return <tr key={proveedor.id}>
          <td><strong className={v.clientName}>{nombre}</strong><small className={v.minorText}>{proveedor.nombreComercial || "Sin nombre comercial"}</small></td>
          <td><strong className={`${v.documentCode} [font-variant-numeric:tabular-nums]`}>{proveedor.numeroDocumento}</strong><small className={v.minorText}>{proveedor.tipoDocumento}</small></td>
          <td><span className={`${v.status} border-[#dbe3e9] bg-[#f3f6f9] text-[#3d566e]`}>{esEmpresa ? "Empresa" : "Persona"}</span></td>
          <td><div className={v.rowActions}><BotonAccion etiqueta={`Ver ficha de ${nombre}`} tono="neutral" icono={<Eye aria-hidden="true" />} onClick={() => setProveedorEnDetalle(proveedor)} /></div></td>
        </tr>;
      }} />
    {abierto && createPortal(<FormularioProveedor inicial={precargaBusqueda(busqueda)} onGuardar={guardar} onCerrar={() => setAbierto(false)} />, document.body)}
    {proveedorEnDetalle && createPortal(<ProveedorFichaDialog proveedor={proveedorEnDetalle} onCerrar={() => setProveedorEnDetalle(null)} />, document.body)}
  </section>;
}

function ProveedorFichaDialog({ proveedor, onCerrar }: { proveedor: ProveedorRegistrado; onCerrar: () => void }) {
  const navegar = useNavigate();
  const [ficha, setFicha] = useState<FichaProveedor | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(true);
  const [errorFicha, setErrorFicha] = useState("");
  const [revisionFicha, setRevisionFicha] = useState(0);
  useEffect(() => {
    let vigente = true;
    setCargandoFicha(true);
    setErrorFicha("");
    void servicioProveedores.ficha(proveedor.id).then((resultado) => {
      if (vigente) setFicha(resultado);
    }).catch((problema: unknown) => {
      if (!vigente) return;
      if (problema instanceof ErrorApi && problema.estado === 401) navegar("/login", { replace: true });
      else setErrorFicha(problema instanceof Error ? problema.message : "No se pudo cargar la ficha del proveedor.");
    }).finally(() => { if (vigente) setCargandoFicha(false); });
    return () => { vigente = false; };
  }, [navegar, proveedor.id, revisionFicha]);
  const datosProveedor = ficha?.proveedor ?? proveedor;
  const esEmpresa = datosProveedor.tipoDocumento === "RUC" && datosProveedor.numeroDocumento.startsWith("20");
  const nombre = nombreDe(datosProveedor);
  const resumen = ficha?.resumenCompras ?? [];
  const formatMoney = (importe: string, moneda: string) => new Intl.NumberFormat("es-PE", { style: "currency", currency: moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(importe));
  const totalCompras = resumen.reduce((acumulado, item) => acumulado + item.compras, 0);

  const fecha = (valor: string) => new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeZone: "UTC" }).format(new Date(`${valor.slice(0, 10)}T00:00:00Z`));
  const tonoPago = (estado: string) => estado === "PAGADA" ? { ...tonosPill.verde, texto: "Pagada" } : estado === "SIN_PAGO" ? { ...tonosPill.gris, texto: "Sin pago" } : { ...tonosPill.azul, texto: "Con saldo" };
  return <DialogoCatalogo titulo="Ficha del proveedor" articulo={nombre} codigo={`${datosProveedor.tipoDocumento} ${datosProveedor.numeroDocumento}`} alCerrar={onCerrar} pantallaCompletaMovil
    acciones={<button type="button" className={d.botonSecundario} onClick={onCerrar}>Cerrar</button>}>
    <div className={d.contenido}>
      <dl className={d.bloqueDatos}>
        <div><dt>Documento</dt><dd>{datosProveedor.tipoDocumento} {datosProveedor.numeroDocumento}</dd></div>
        <div><dt>Tipo</dt><dd>{esEmpresa ? "Empresa / organización" : "Persona"}</dd></div>
        <div><dt>Razón social / nombre</dt><dd>{datosProveedor.razonSocial || [datosProveedor.nombres, datosProveedor.apellidoPaterno, datosProveedor.apellidoMaterno].filter(Boolean).join(" ") || "—"}</dd></div>
        <div><dt>Nombre comercial</dt><dd>{datosProveedor.nombreComercial || "Sin nombre comercial"}</dd></div>
      </dl>
      {cargandoFicha ? <p className={d.vacio} role="status">Cargando historial de compras…</p>
        : errorFicha ? <div className={`${d.vacio} gap-3`} role="alert"><span>{errorFicha}</span><button type="button" className={d.botonSecundario} onClick={() => setRevisionFicha((actual) => actual + 1)}>Reintentar</button></div>
        : ficha && !ficha.permisosCompras.repuestos && !ficha.permisosCompras.mototaxis ? <p className={d.vacio}>Tu usuario no tiene permisos para consultar el historial de compras.</p>
        : ficha && <>
          <dl className={`${d.bloqueDatos} ${d.bloqueTres}`} aria-label="Resumen de compras del proveedor">
            <div><dt>Compras</dt><dd>{totalCompras}</dd></div>
            <div><dt>Total comprado</dt><dd>{resumen.length ? resumen.map((item) => <span className="block" key={`total-${item.moneda}`}>{formatMoney(item.totalComprado, item.moneda)}</span>) : "—"}</dd></div>
            <div><dt>Saldo pendiente</dt><dd>{resumen.length ? resumen.map((item) => <span className="block" key={`saldo-${item.moneda}`}>{formatMoney(item.saldoPendiente, item.moneda)}</span>) : "—"}</dd></div>
          </dl>
          <section className="grid min-w-0 gap-2" aria-label="Historial de compras">
            <h3 className={d.titulo}>Compras recientes</h3>
            {ficha.compras.length ? <div className={d.tablaScroll}><table className={d.tabla}><thead><tr><th>Compra</th><th>Fecha</th><th>Total</th><th>Pago</th></tr></thead><tbody>{ficha.compras.map((compra) => {
              const tono = tonoPago(compra.estadoPago);
              return <tr key={`${compra.origen}-${compra.id}`}><td className="font-semibold text-[#0b2545]">{compra.codigo}</td><td>{fecha(compra.fecha)}</td><td className="font-bold text-[#0b2545] [font-variant-numeric:tabular-nums]">{formatMoney(compra.total, compra.moneda)}</td><td><span className={`${d.pill} ${tono.caja}`}><i className={`${d.punto} ${tono.punto}`} aria-hidden="true" />{tono.texto}</span></td></tr>;
            })}</tbody></table></div> : <p className={d.vacio}>No hay compras vinculadas a este proveedor.</p>}
          </section>
        </>}
    </div>
  </DialogoCatalogo>;
}

function FormularioProveedor({ onGuardar, onCerrar, inicial }: { onGuardar: (datos: DatosProveedorNuevo) => Promise<string | null>; onCerrar: () => void; inicial?: { documento: string; nombre: string } }) {
  const dialogoRef = useRef<HTMLFormElement>(null);
  const { solicitarCancelacion, dialogo } = useConfirmarCancelacionFormulario(dialogoRef, onCerrar, "el proveedor");
  useDialogoFlotante(dialogoRef, true, solicitarCancelacion);
  const [tipoDocumento, setTipoDocumento] = useState<"DNI" | "RUC">(inicial?.documento.length === 8 ? "DNI" : "RUC");
  const [numeroDocumento, setNumeroDocumento] = useState(inicial?.documento.length === 8 || inicial?.documento.length === 11 ? inicial.documento : ""); const [razonSocial, setRazonSocial] = useState(""); const [nombres, setNombres] = useState(inicial?.nombre ?? ""); const [apellidoPaterno, setApellidoPaterno] = useState(""); const [apellidoMaterno, setApellidoMaterno] = useState(""); const [nombreComercial, setNombreComercial] = useState("");
  const [buscando, setBuscando] = useState(false); const [guardando, setGuardando] = useState(false); const [error, setError] = useState("");
  const esJuridica = tipoDocumento === "RUC" && numeroDocumento.startsWith("20");
  async function buscarIdentidad() {
    setBuscando(true); setError("");
    try { const identidad = await servicioIdentidad.consultar(tipoDocumento, numeroDocumento); setRazonSocial(identidad.razonSocial ?? ""); setNombres(identidad.nombres ?? ""); setApellidoPaterno(identidad.apellidoPaterno ?? ""); setApellidoMaterno(identidad.apellidoMaterno ?? ""); if (identidad.razonSocial && !nombreComercial) setNombreComercial(identidad.razonSocial); }
    catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú."); }
    finally { setBuscando(false); }
  }
  async function submit(evento: FormEvent) {
    evento.preventDefault(); setGuardando(true); setError("");
    const datos: DatosProveedorNuevo = { tipoDocumento, numeroDocumento, ...(esJuridica ? { razonSocial } : { nombres, apellidoPaterno, apellidoMaterno }), nombreComercial };
    const resultado = await onGuardar(datos); if (resultado) setError(resultado); setGuardando(false);
  }
  return <>{dialogo}<Dialogo
      kicker="DIRECTORIO COMERCIAL"
      titulo="Registrar proveedor"
      ancho="md"
      pantallaCompletaMovil
      cerrable={!guardando}
      onCerrar={solicitarCancelacion}
      pie={<><button className="clientes-secondary-action" type="button" onClick={solicitarCancelacion}>Cancelar</button><button type="submit" form="proveedor-form" className="clientes-primary-action" disabled={guardando}>{guardando ? "Guardando…" : "Guardar proveedor"}</button></>}
    >
      <form id="proveedor-form" ref={dialogoRef} className="grid gap-4" onSubmit={(evento) => void submit(evento)}>
        <div className="directorio-form-grid">
      <label>Documento *<SelectDirectorio disabled={buscando} value={tipoDocumento} onChange={(evento) => { setTipoDocumento(evento.target.value as "DNI" | "RUC"); setNumeroDocumento(""); setRazonSocial(""); setNombres(""); setApellidoPaterno(""); setApellidoMaterno(""); }}><option value="RUC">RUC</option><option value="DNI">DNI</option></SelectDirectorio></label>
      <label>Número de documento *<span className="grid grid-cols-[minmax(0,1fr)_auto] gap-[7px]"><input required disabled={buscando} inputMode="numeric" maxLength={tipoDocumento === "DNI" ? 8 : 11} pattern={tipoDocumento === "DNI" ? "[0-9]{8}" : "[0-9]{11}"} value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value.replace(/D/g, ""))} /><button className={directorioClasses.boton} type="button" disabled={buscando || numeroDocumento.length !== (tipoDocumento === "DNI" ? 8 : 11)} onClick={() => void buscarIdentidad()}>{buscando ? "Buscando…" : tipoDocumento === "RUC" ? "Consultar en SUNAT" : "Buscar"}</button></span></label>
      {esJuridica ? <label className="directorio-form-wide">Razón social *<input required maxLength={180} value={razonSocial} onChange={(evento) => setRazonSocial(evento.target.value)} /></label> : <><label>Nombres *<input required maxLength={120} value={nombres} onChange={(evento) => setNombres(evento.target.value)} /></label><label>Apellido paterno *<input required maxLength={120} value={apellidoPaterno} onChange={(evento) => setApellidoPaterno(evento.target.value)} /></label><label>Apellido materno <Opcional /><input maxLength={120} value={apellidoMaterno} onChange={(evento) => setApellidoMaterno(evento.target.value)} /></label></>}
      <label className="directorio-form-wide">Nombre comercial <Opcional /><input maxLength={180} value={nombreComercial} onChange={(evento) => setNombreComercial(evento.target.value)} placeholder="Ej.: Repuestos El Sol" /></label>
    </div>{error && <NotificacionFlotante mensaje={error} />}
      </form>
    </Dialogo></>;
}
