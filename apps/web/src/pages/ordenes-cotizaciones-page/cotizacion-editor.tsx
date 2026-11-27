import "../ordenes-servicio-page/orden-servicio-editor.css";
import { CalendarClock, MessageSquareText, Plus, Printer, Search, UserPlus, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import type { ClienteRegistrado, ProductoParaIngreso } from "../../services/ingresos.service";
import { importeLineaCotizacion, type calcularTotalesCotizacion } from "./gestion-utils";
import { MAX_RESULTADOS_CATALOGO, MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { tonosEstadoCotizacion } from "./estados-cotizacion";

type LineaCotizacion = Record<string, unknown> & {
  tipo: "PRODUCTO" | "SERVICIO";
  nombreVisible: string;
  precioUnitario: string;
  cantidad: string;
  descuento: string;
  afectacionIgv: "GRAVADO" | "EXONERADO" | "INAFECTO";
};
type TipoDocumentoBusqueda = "DNI" | "RUC" | "NOMBRE";
type CotizacionEditorProps = {
  productos: ProductoParaIngreso[];
  buscandoProductos: boolean;
  productosRecientes: CatalogoReciente[];
  onAgregarProductoReciente: (reciente: CatalogoReciente) => void;
  busquedaProducto: string;
  onBusquedaProductoChange: (valor: string) => void;
  onAgregarProducto: (producto: ProductoParaIngreso) => void;
  onCrearRepuesto?: () => void;
  dinero: (valor: number) => string;
  fechaEmision: string;
  consultandoSerie: boolean;
  errorConsultaSerie: boolean;
  codigoPrevisualizado: string | null;
  cliente: ClienteRegistrado | null;
  clienteInicialId?: string | null;
  clienteInicialNombre?: string | null;
  nombreCliente: (cliente: ClienteRegistrado) => string;
  tipoDocumentoBusqueda: TipoDocumentoBusqueda;
  onTipoDocumentoBusquedaChange: (tipo: TipoDocumentoBusqueda) => void;
  clienteBusqueda: string;
  onClienteBusquedaChange: (valor: string) => void;
  clienteBusquedaConsultada: string;
  onBuscarCliente: () => void;
  onKeyDownBusquedaCliente: (evento: KeyboardEvent<HTMLInputElement>) => void;
  buscandoClientes: boolean;
  clientes: ClienteRegistrado[];
  onSeleccionarCliente: (cliente: ClienteRegistrado) => void;
  onLimpiarCliente: () => void;
  onAgregarCliente: () => void;
  vigenteHasta: string;
  onVigenteHastaChange: (fecha: string) => void;
  lineas: LineaCotizacion[];
  onAgregarServicio: () => void;
  onActualizarLinea: (indice: number, cambios: Partial<LineaCotizacion>) => void;
  onEliminarLinea: (indice: number) => void;
  observacion: string;
  onObservacionChange: (observacion: string) => void;
  totales: ReturnType<typeof calcularTotalesCotizacion>;
  onCerrar: () => void;
  onGuardar: () => void;
  guardando: boolean;
  editando: boolean;
};

const LIMITE_OBSERVACION = 2000;
const diasEntre = (desde: string, hasta: string) => Math.round((new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86_400_000);
const iniciales = (nombre: string | null | undefined) => (nombre ?? "").trim().split(/\s+/).slice(0, 2).map((parte) => parte[0] ?? "").join("").toLocaleUpperCase("es-PE") || "?";
const nombreDocumento = (tipo: string) => tipo === "RUC" ? "RUC" : tipo === "DNI" ? "DNI" : tipo;

export function CotizacionEditor({ productos, buscandoProductos, productosRecientes, onAgregarProductoReciente, busquedaProducto, onBusquedaProductoChange, onAgregarProducto, onCrearRepuesto, dinero, fechaEmision, consultandoSerie, errorConsultaSerie, codigoPrevisualizado, cliente, clienteInicialId = null, clienteInicialNombre = null, nombreCliente, tipoDocumentoBusqueda, onTipoDocumentoBusquedaChange, clienteBusqueda, onClienteBusquedaChange, clienteBusquedaConsultada, onBuscarCliente, onKeyDownBusquedaCliente, buscandoClientes, clientes, onSeleccionarCliente, onLimpiarCliente, onAgregarCliente, vigenteHasta, onVigenteHastaChange, lineas, onAgregarServicio, onActualizarLinea, onEliminarLinea, observacion, onObservacionChange, totales, onCerrar, onGuardar, guardando, editando }: CotizacionEditorProps) {
  const consulta = busquedaProducto.trim();
  const consultaCliente = clienteBusqueda.trim();
  const nombreElegido = cliente ? nombreCliente(cliente) : clienteInicialNombre;
  const dias = vigenteHasta ? diasEntre(fechaEmision, vigenteHasta) : null;
  const sinSerie = !codigoPrevisualizado || consultandoSerie || errorConsultaSerie;
  const tonoAbierta = tonosEstadoCotizacion.ABIERTA;
  const lineasIndexadas = lineas.map((linea, indice) => ({ linea, indice }));
  const grupos = (["PRODUCTO", "SERVICIO"] as const)
    .map((tipo) => ({ tipo, items: lineasIndexadas.filter(({ linea }) => linea.tipo === tipo) }))
    .filter((grupo) => grupo.items.length > 0);

  const renderizarLinea = ({ linea, indice }: { linea: LineaCotizacion; indice: number }) => {
    const esServicio = linea.tipo === "SERVICIO";
    const nombre = String(linea.nombreVisible ?? linea.descripcion ?? "");
    const etiqueta = nombre || (esServicio ? "servicio" : "repuesto");
    const precio = Number(linea.precioUnitario) || 0;
    const cantidad = Number(linea.cantidad) || 0;
    return <div className={`os-linea ${esServicio ? "es-servicio" : "es-producto"}`} key={`${linea.tipo}-${indice}`}>
      <div className="os-linea-descripcion">
        {esServicio
          ? <input id={`cotizacion-servicio-descripcion-${indice}`} aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={String(linea.descripcion ?? linea.nombreVisible ?? "").toLocaleUpperCase("es-PE")} onChange={(evento) => { const valor = evento.target.value.toLocaleUpperCase("es-PE"); onActualizarLinea(indice, { descripcion: valor, nombreVisible: valor }); }} />
          : <input aria-label="Descripción del repuesto" value={nombre} readOnly />}
      </div>
      <label className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
        <input aria-label={`Cantidad de ${etiqueta}`} type="number" min="1" step="1" inputMode="numeric" value={String(linea.cantidad)} onChange={(evento) => onActualizarLinea(indice, { cantidad: evento.target.value === "" ? "" : String(Math.max(1, Math.floor(Number(evento.target.value) || 1))) })} />
      </label>
      <label className="os-linea-campo os-linea-precio"><span>Precio</span>
        {esServicio
          ? <input aria-label="Precio unitario del servicio" type="number" min="0" step="0.01" placeholder="0.00" value={linea.precioUnitario} onChange={(evento) => onActualizarLinea(indice, { precioUnitario: evento.target.value })} />
          : <input aria-label="Precio unitario del repuesto (precio de catálogo)" type="text" value={dinero(precio)} readOnly />}
      </label>
      <label className="os-linea-campo os-linea-descuento"><span>Descuento</span>
        <input aria-label={`Descuento de ${etiqueta}`} title="Descuento en soles" type="number" min="0" max={(cantidad * precio).toFixed(2)} step="0.01" value={String(linea.descuento)} onChange={(evento) => onActualizarLinea(indice, { descuento: evento.target.value })} />
      </label>
      <div className="os-linea-total"><span>Total</span><strong>{dinero(importeLineaCotizacion(linea))}</strong></div>
      <button className="os-linea-quitar" type="button" aria-label={`Quitar ${etiqueta}`} onClick={() => onEliminarLinea(indice)}><X aria-hidden="true" size={16} /></button>
    </div>;
  };

  return <div className="os-editor" aria-label="Formulario de cotización">
    <div className="os-formulario">
      <div className="os-indicadores">
        <span className={`os-chip ${tonoAbierta.caja}`}><i className={tonoAbierta.punto} aria-hidden="true" />{editando ? "Editando cotización" : "Se creará como Abierta"}</span>
        <div className="os-numero"><span>N.° DE COTIZACIÓN</span><strong>{consultandoSerie ? "Consultando serie…" : errorConsultaSerie ? "Error de serie" : codigoPrevisualizado ?? "FALTA CONFIGURAR SERIE"}</strong></div>
      </div>

      <div className="os-disposicion">
        <div className="os-columna">
          <section className="os-tarjeta" aria-labelledby="cotizacion-titulo-datos">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">1</span><h3 id="cotizacion-titulo-datos">Datos de la cotización</h3></div>
            </div>
            <div className="os-campos grid-cols-2! max-[760px]:grid-cols-1!">
              <label className="os-campo">Fecha de emisión<input type="date" value={fechaEmision} disabled aria-readonly="true" /></label>
              <label className="os-campo">Válida hasta *<input type="date" min={fechaEmision} value={vigenteHasta} onChange={(evento) => onVigenteHastaChange(evento.target.value)} required /></label>
            </div>
            <div className="os-cliente">
              <label className="os-etiqueta" htmlFor="cotizacion-cliente-busqueda">Cliente *</label>
              {cliente ? <div className="os-cliente-fijo es-editable">
                <span className="os-avatar" aria-hidden="true">{iniciales(nombreElegido)}</span>
                <div className="os-cliente-datos">
                  <strong>{nombreElegido}</strong>
                  {(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((documento) => <span key={`${documento.tipoDocumento}-${documento.numeroDocumento}`}>{nombreDocumento(documento.tipoDocumento)} {documento.numeroDocumento}</span>)}
                  {cliente.direccion?.trim() && <span>{cliente.direccion}</span>}
                </div>
                <button className="os-cliente-cambiar" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={onLimpiarCliente}><X aria-hidden="true" size={18} /></button>
              </div> : clienteInicialId ? <div className="os-cliente-fijo es-editable">
                <span className="os-avatar" aria-hidden="true">{iniciales(nombreElegido)}</span>
                <div className="os-cliente-datos"><strong>{nombreElegido}</strong></div>
                <button className="os-cliente-cambiar" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={onLimpiarCliente}><X aria-hidden="true" size={18} /></button>
              </div> : <div className="os-cliente-buscador">
                <div className="os-cliente-fila">
                  <select aria-label="Tipo de documento para buscar" value={tipoDocumentoBusqueda} onChange={(evento) => onTipoDocumentoBusquedaChange(evento.target.value as TipoDocumentoBusqueda)}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="NOMBRE">Nombre</option></select>
                  <input id="cotizacion-cliente-busqueda" autoComplete="off" inputMode={tipoDocumentoBusqueda === "NOMBRE" ? "text" : "numeric"} maxLength={tipoDocumentoBusqueda === "DNI" ? 8 : tipoDocumentoBusqueda === "RUC" ? 11 : 120} value={clienteBusqueda} onChange={(evento) => onClienteBusquedaChange(evento.target.value)} onKeyDown={onKeyDownBusquedaCliente} placeholder={tipoDocumentoBusqueda === "NOMBRE" ? "Buscar por nombre" : `Ingresa ${tipoDocumentoBusqueda}`} aria-label={tipoDocumentoBusqueda === "NOMBRE" ? "Nombre del cliente" : `Número de ${tipoDocumentoBusqueda}`} required />
                  <button className="os-boton-oscuro" type="button" onClick={onBuscarCliente} disabled={buscandoClientes}><Search aria-hidden="true" size={16} strokeWidth={2} />{buscandoClientes ? "Buscando…" : "Buscar cliente"}</button>
                  <button className="os-boton-icono" type="button" aria-label="Agregar cliente" title="Agregar cliente" onClick={onAgregarCliente}><UserPlus aria-hidden="true" size={20} strokeWidth={1.9} /></button>
                </div>
                {clientes.length > 0 && <ul className="os-cliente-resultados" aria-label="Resultados de clientes">
                  {clientes.map((item) => <li key={item.id}><button type="button" onClick={() => onSeleccionarCliente(item)}><strong>{nombreCliente(item)}</strong><small>{nombreDocumento(item.tipoDocumento)} · {item.numeroDocumento}</small></button></li>)}
                </ul>}
                {clienteBusquedaConsultada === consultaCliente && consultaCliente.length >= 2 && clientes.length === 0 && <NotificacionFlotante tipo="informacion" mensaje="No encontramos coincidencias. Puedes agregar el cliente con el botón de persona +." />}
              </div>}
            </div>
          </section>

          <section className="os-tarjeta" aria-labelledby="cotizacion-titulo-detalle">
            <div className="os-tarjeta-cabecera is-dividida">
              <div className="os-titulo">
                <span className="os-paso" aria-hidden="true">2</span>
                <h3 id="cotizacion-titulo-detalle">Detalle de la cotización</h3>
                <span className="os-contador">{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
              </div>
              <button className="os-boton-servicio" type="button" onClick={onAgregarServicio}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Agregar servicio</button>
            </div>
            <div className="os-buscador">
              <label className="os-buscador-campo">
                <Search aria-hidden="true" size={18} strokeWidth={2} />
                <input value={busquedaProducto} onChange={(evento) => onBusquedaProductoChange(evento.target.value)} placeholder="Buscar repuesto por nombre o código…" aria-label="Buscar repuestos para la cotización" autoComplete="off" />
              </label>
              {consulta ? <div className="os-resultados" aria-live="polite">
                {consulta.length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <p className="os-resultados-estado">Escribe al menos cuatro caracteres para buscar en inventario.</p>
                  : buscandoProductos ? <p className="os-resultados-estado">Buscando en inventario…</p>
                  : productos.length ? productos.slice(0, MAX_RESULTADOS_CATALOGO).map((producto) => <button className="os-resultado" key={producto.presentacionId} type="button" onClick={() => onAgregarProducto(producto)}>
                    <span className="os-resultado-datos"><strong>{producto.nombre}</strong><small>{producto.codigo} · {producto.presentacion}</small></span>
                    <strong className="os-resultado-precio">{dinero(Number(producto.precio))}</strong>
                  </button>) : <div className="os-resultados-estado"><strong>No hay repuestos para mostrar</strong><span>No encontramos «{consulta}» en inventario.</span>{onCrearRepuesto && <button className="os-crear-repuesto" type="button" onClick={onCrearRepuesto}><Plus aria-hidden="true" size={16} strokeWidth={2.4} />Crear repuesto «{consulta}»</button>}</div>}
              </div> : <div className="os-recientes" aria-live="polite">
                <span className="os-recientes-titulo">Últimos repuestos seleccionados</span>
                {productosRecientes.length ? productosRecientes.map((item) => <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a agregar ${item.nombre}`} title={[item.codigo, item.detalle].filter(Boolean).join(" · ")} onClick={() => onAgregarProductoReciente(item)}>
                  <Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}
                </button>) : <span className="os-recientes-vacio">Aún no has seleccionado artículos.</span>}
              </div>}
            </div>
            {lineas.length === 0 ? <div className="os-vacio">
              <strong>Agrega el primer repuesto o servicio</strong>
              <span>Busca repuestos en el inventario o pulsa Agregar servicio para incluir mano de obra.</span>
            </div> : <div className="os-lineas">
              <div className="os-lineas-cabecera" aria-hidden="true"><span>DESCRIPCIÓN</span><span>CANT.</span><span>PRECIO</span><span>DESCUENTO</span><span>TOTAL</span><span /></div>
              {grupos.map((grupo) => <div key={grupo.tipo} role="group" aria-label={grupo.tipo === "PRODUCTO" ? "Repuestos de la cotización" : "Servicios de la cotización"}>
                <div className="os-lineas-grupo">{grupo.tipo === "PRODUCTO" ? "REPUESTOS" : "SERVICIOS"}</div>
                {grupo.items.map(renderizarLinea)}
              </div>)}
            </div>}
          </section>

          <section className="os-tarjeta" aria-labelledby="cotizacion-titulo-observaciones">
            <div className="os-tarjeta-cabecera">
              <div className="os-titulo"><span className="os-paso" aria-hidden="true">3</span><h3 id="cotizacion-titulo-observaciones">Observaciones</h3></div>
            </div>
            <div className="os-revision">
              <label className="os-campo os-revision-condicion">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Nota para el cliente <em className="os-opcional">Opcional</em></span>
                <textarea value={observacion} maxLength={LIMITE_OBSERVACION} rows={4} onChange={(evento) => onObservacionChange(evento.target.value)} placeholder="Ej. Precios válidos sujetos a stock; el servicio incluye mano de obra y revisión de frenos…" />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </section>
        </div>

        <aside className="os-resumen" aria-label="Resumen de la cotización">
          <h3>Resumen de la cotización</h3>
          <dl className="os-importes" aria-label="Importe total de la cotización">
            <div className="es-total"><dt>Total de la cotización</dt><dd>{dinero(totales.total)}</dd></div>
          </dl>
          {dias !== null && dias >= 0 && <div className="os-saldo"><span><CalendarClock aria-hidden="true" size={14} className="mr-1 inline align-[-2px]" />Vigencia</span><strong>{dias} {dias === 1 ? "día" : "días"}</strong></div>}
          <div className="os-acciones">
            <button className="os-guardar" type="button" disabled={guardando || sinSerie} onClick={onGuardar}><Printer aria-hidden="true" size={18} />{guardando ? "Guardando…" : "Imprimir cotización"}</button>
            <button className="os-cancelar" type="button" disabled={guardando} onClick={onCerrar}>Cancelar</button>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}
