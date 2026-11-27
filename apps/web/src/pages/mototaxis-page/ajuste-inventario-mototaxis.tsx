import "../ordenes-servicio-page/orden-servicio-editor.css";
import "../movimientos-stock-page/formulario-ajuste-repuestos.css";
import { ChevronDown, MessageSquareText, Plus, Save, Search } from "lucide-react";
import { MAX_RESULTADOS_CATALOGO, useCatalogoRecientes } from "../../components/catalogo/use-catalogo-recientes";
import { MOTIVOS_AJUSTE } from "../../hooks/use-movimientos-stock";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { RegistrarAccionPrincipal } from "../../components/ui/accion-principal/accion-principal";
import { ListadoMaestro } from "../../components/ui/listado-maestro/listado-maestro";
import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import { ErrorApi } from "../../services/api-cliente";
import { servicioMototaxis, type AjusteInventarioMototaxi, type ModeloMototaxi, type ReconteoModeloMototaxi } from "../../services/mototaxis.service";
import { ventasClasses as c } from "../ventas-page/ventas-classes";

const LIMITE_OBSERVACION = 2000;
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });
const nombreModelo = (marca: string, modelo: string, version: string | null) => `${marca} ${modelo}${version ? ` ${version}` : ""}`;
const conSigno = (valor: number) => `${valor > 0 ? "+" : valor < 0 ? "−" : ""}${Math.abs(valor)}`;

// Ajustes ya registrados: sin chips de estado; la píldora indica si el stock subió, bajó o no cambió.
const tonos = {
  ALZA: { etiqueta: "Aumento", caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  BAJA: { etiqueta: "Disminución", caja: "border-[#efcfcd] bg-[#fff4f3] text-[#9b2c2c]", punto: "bg-[#9b2c2c]" },
  SIN_CAMBIO: { etiqueta: "Sin diferencia", caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
} as const;

const encabezado = <tr><th>Fecha y hora</th><th>Modelo</th><th>Anterior</th><th>Variación</th><th>Final</th><th>Motivo</th><th>Responsable</th></tr>;

function FilaAjuste({ ajuste }: { ajuste: AjusteInventarioMototaxi }) {
  const variacion = ajuste.cantidadContada - ajuste.cantidadSistema;
  const tono = !ajuste.aplicado ? tonos.SIN_CAMBIO : tonos[variacion > 0 ? "ALZA" : variacion < 0 ? "BAJA" : "SIN_CAMBIO"];
  return <tr>
    <td className="whitespace-nowrap [font-variant-numeric:tabular-nums] text-[#142b42]"><time dateTime={ajuste.creadoEn}>{fechaHora.format(new Date(ajuste.creadoEn))}</time></td>
    <td>
      <strong className={c.clientName}>{nombreModelo(ajuste.marca, ajuste.modelo, ajuste.version)}</strong>
      <small className={c.minorText}>{ajuste.codigo}</small>
    </td>
    <td className="[font-variant-numeric:tabular-nums]">{ajuste.cantidadSistema}</td>
    <td>
      <span className={`${c.status} ${tono.caja}`} title={ajuste.aplicado ? tono.etiqueta : "Registro histórico: no modificó existencias"}><i className={`h-[7px] w-[7px] rounded-full ${tono.punto}`} aria-hidden="true" />{ajuste.aplicado ? `${conSigno(variacion)} und.` : "Histórico"}</span>
    </td>
    <td><span className={c.total}>{ajuste.aplicado ? ajuste.cantidadContada : "—"}</span></td>
    <td>
      <span className="block">{ajuste.motivo}</span>
      {ajuste.observacion && <small className={c.itemDetail} title={ajuste.observacion}>{ajuste.observacion}</small>}
    </td>
    <td>{ajuste.usuario}</td>
  </tr>;
}

function Tarjeta({ paso, id, titulo, children }: { paso: number; id: string; titulo: string; children: ReactNode }) {
  return <section className="os-tarjeta" aria-labelledby={id}>
    <div className="os-tarjeta-cabecera"><div className="os-titulo"><span className="os-paso" aria-hidden="true">{paso}</span><h3 id={id}>{titulo}</h3></div></div>
    {children}
  </section>;
}

const tipos = { CONTEO: "Por conteo", INGRESO: "Aumentar stock", RETIRO: "Disminuir stock" } as const;
const iniciales = (texto: string) => texto.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();
const normalizar = (texto: string) => texto.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Ajuste de inventario de mototaxis con la misma estructura e información que el de repuestos. */
function FormularioAjusteMototaxis({ modelos, alCerrar, alGuardar }: { modelos: ModeloMototaxi[]; alCerrar: () => void; alGuardar: (mensaje: string) => void }) {
  const formulario = useRef<HTMLFormElement>(null);
  const recientes = useCatalogoRecientes("mototaxis-modelos");
  const [busqueda, setBusqueda] = useState("");
  const [modeloId, setModeloId] = useState("");
  const [reconteo, setReconteo] = useState<ReconteoModeloMototaxi | null>(null);
  const [sentido, setSentido] = useState<keyof typeof tipos>("CONTEO");
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState<string>(MOTIVOS_AJUSTE[0].nombre);
  const [observacion, setObservacion] = useState("");
  const [cargandoReconteo, setCargandoReconteo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const firma = JSON.stringify({ modeloId, sentido, cantidad, motivo, observacion });
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCerrar, "el ajuste de inventario", firma);
  const consulta = busqueda.trim();
  const encontrados = useMemo(() => {
    const termino = normalizar(consulta);
    if (!termino) return [];
    return modelos.filter((modelo) => normalizar([modelo.marca, modelo.nombre, modelo.version, modelo.codigo].filter(Boolean).join(" ")).includes(termino)).slice(0, MAX_RESULTADOS_CATALOGO);
  }, [consulta, modelos]);
  const elegido = modelos.find((modelo) => modelo.id === modeloId);

  useEffect(() => {
    setReconteo(null);
    if (!modeloId) return;
    let vigente = true;
    setCargandoReconteo(true); setError("");
    void servicioMototaxis.reconteoModelo(modeloId).then((resultado) => { if (vigente) setReconteo(resultado); })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo consultar el inventario del modelo."); })
      .finally(() => { if (vigente) setCargandoReconteo(false); });
    return () => { vigente = false; };
  }, [modeloId]);

  function elegir(modelo: ModeloMototaxi) {
    setModeloId(modelo.id); setCantidad(""); setBusqueda(""); setError("");
    recientes.registrar({ id: modelo.id, nombre: nombreModelo(modelo.marca, modelo.nombre, modelo.version), codigo: modelo.codigo, detalle: modelo.categoriaVehicular });
  }
  function limpiar() { setModeloId(""); setCantidad(""); }

  const actual = reconteo?.cantidadSistema ?? 0;
  const valor = Number(cantidad) || 0;
  const porConteo = sentido === "CONTEO";
  const proyectada = porConteo ? valor : sentido === "INGRESO" ? actual + valor : actual - valor;
  const variacion = proyectada - actual;

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const numero = Number(cantidad);
    if (!reconteo || reconteo.modelo.id !== modeloId) { setError("Elige el modelo que vas a ajustar."); return; }
    if (!cantidad.trim() || !Number.isInteger(numero) || numero < 0 || (!porConteo && numero === 0)) { setError(porConteo ? "Ingresa una cantidad entera igual o mayor que cero." : "Ingresa una cantidad entera mayor que cero."); return; }
    if (proyectada < 0) { setError("No se puede retirar más stock del disponible."); return; }
    if (proyectada > 2_147_483_647) { setError("La cantidad es demasiado grande."); return; }
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId, cantidadSistema: reconteo.cantidadSistema, cantidadContada: proyectada, motivo, observacion });
      alGuardar(`Ajuste ${resultado.codigo} aplicado. Saldo final: ${resultado.cantidadContada} mototaxis.`);
    } catch (problema) { setError(problema instanceof ErrorApi || problema instanceof Error ? problema.message : "No se pudo registrar el ajuste."); }
    finally { setGuardando(false); }
  }

  return <div className="os-editor ajuste-repuestos-editor">
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <form ref={formulario} className="os-formulario" onSubmit={(evento) => void guardar(evento)} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />Quedará en el historial</span>
        <div className="os-numero"><span>TIPO DE AJUSTE</span><strong>{tipos[sentido]}</strong></div>
      </div>

      <div className="os-disposicion">
        <fieldset className="os-columna ajuste-rep-columna" disabled={guardando}>
          <Tarjeta paso={1} id="ajuste-moto-titulo-modelo" titulo="Modelo de mototaxi *">
            {elegido ? <div className="os-cliente-fijo es-editable">
              <span className="os-avatar" aria-hidden="true">{iniciales(`${elegido.marca} ${elegido.nombre}`)}</span>
              <div className="os-cliente-datos">
                <strong>{nombreModelo(elegido.marca, elegido.nombre, elegido.version)}</strong>
                <span>{cargandoReconteo ? "Consultando existencias…" : `Stock actual: ${actual} und.`}</span>
              </div>
              <button className="os-cancelar" type="button" onClick={limpiar}>Cambiar</button>
            </div> : <div className="os-buscador">
              <label className="os-buscador-campo">
                <Search aria-hidden="true" size={18} strokeWidth={2} />
                <input type="search" autoFocus value={busqueda} autoComplete="off" placeholder="Buscar modelo por marca, nombre o código…" aria-label="Buscar modelo para ajustar"
                  onChange={(evento) => { setError(""); setBusqueda(evento.target.value); }} onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }} />
              </label>
              {consulta ? <div className="os-resultados" aria-live="polite">
                {encontrados.length ? encontrados.map((modelo) => <button className="os-resultado" key={modelo.id} type="button" onClick={() => elegir(modelo)}>
                  <span className="os-resultado-datos"><strong>{nombreModelo(modelo.marca, modelo.nombre, modelo.version)}</strong><small>{modelo.categoriaVehicular}</small></span>
                  <Plus aria-hidden="true" size={16} />
                </button>)
                  : <div className="os-resultados-estado"><strong>No hay modelos para mostrar</strong><span>No encontramos «{consulta}» en inventario.</span></div>}
              </div> : <div className="os-recientes" aria-live="polite">
                <span className="os-recientes-titulo">Últimos modelos seleccionados</span>
                {recientes.recientes.filter((item) => modelos.some((modelo) => modelo.id === item.id)).length
                  ? recientes.recientes.map((item) => { const modelo = modelos.find((m) => m.id === item.id); return modelo && <button className="os-reciente" key={item.id} type="button" aria-label={`Volver a elegir ${item.nombre}`}
                    onClick={() => elegir(modelo)}><Plus aria-hidden="true" size={13} strokeWidth={2.4} />{item.nombre}</button>; })
                  : <span className="os-recientes-vacio">Aún no has seleccionado modelos.</span>}
              </div>}
            </div>}
          </Tarjeta>

          <Tarjeta paso={2} id="ajuste-moto-titulo-detalle" titulo="Detalle del ajuste">
            <div className="os-campos ajuste-rep-datos">
              <label className="os-campo">Tipo de ajuste *
                <span className="os-select">
                  <select value={sentido} onChange={(evento) => setSentido(evento.target.value as keyof typeof tipos)}>
                    {Object.entries(tipos).map(([clave, etiqueta]) => <option key={clave} value={clave}>{etiqueta}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">{porConteo ? "Cantidad contada" : "Cantidad a ajustar"} *
                <input type="number" min={porConteo ? "0" : "1"} step="1" inputMode="numeric" value={cantidad} onChange={(evento) => setCantidad(evento.target.value)}
                  placeholder="En unidades" required />
              </label>
              <label className="os-campo">Motivo *
                <span className="os-select">
                  <select value={motivo} onChange={(evento) => setMotivo(evento.target.value)} required>
                    {MOTIVOS_AJUSTE.map((opcion) => <option key={opcion.codigo} value={opcion.nombre}>{opcion.nombre}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
            </div>
          </Tarjeta>

          <Tarjeta paso={3} id="ajuste-moto-titulo-observacion" titulo="Observación">
            <div className="os-revision">
              <label className="os-campo">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observación del ajuste <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACION} rows={3} value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
                  placeholder="Ej. En el conteo del viernes faltó 1 mototaxi; se entregó sin registrar la venta." />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </Tarjeta>
        </fieldset>

        <aside className="os-resumen" aria-label="Resumen del ajuste">
          <h3>Resumen del ajuste</h3>
          <dl className="os-importes">
            <div><dt>Modelo</dt><dd className="ajuste-resumen-texto">{elegido ? nombreModelo(elegido.marca, elegido.nombre, elegido.version) : "Pendiente"}</dd></div>
            <div><dt>Stock actual</dt><dd>{reconteo ? `${actual} und.` : "—"}</dd></div>
            <div><dt>Variación</dt><dd className={variacion < 0 ? "ajuste-baja" : variacion > 0 ? "ajuste-alza" : undefined}>{reconteo && cantidad.trim() ? conSigno(variacion) : "—"}</dd></div>
            <div className="es-total"><dt>Saldo final</dt><dd aria-live="polite" className={proyectada < 0 ? "ajuste-baja" : undefined}>{reconteo ? `${proyectada} und.` : "—"}</dd></div>
          </dl>
          <p className="ajuste-nota">Se registra con tu usuario, el motivo y la fecha. No se puede retirar más stock del disponible.</p>
          <div className="os-acciones">
            <button className="os-guardar" type="submit" disabled={guardando || cargandoReconteo || !reconteo}><Save aria-hidden="true" size={18} />{guardando ? "Registrando ajuste…" : "Registrar ajuste"}</button>
            <button className="os-cancelar" type="button" disabled={guardando} onClick={cancelar.solicitarCancelacion}>Cancelar</button>
          </div>
        </aside>
      </div>
    </form>
    {cancelar.dialogo}
  </div>;
}

export function AjusteInventarioMototaxis({ puedeAjustar }: { puedeAjustar: boolean }) {
  const [modelos, setModelos] = useState<ModeloMototaxi[]>([]);
  const [ajustes, setAjustes] = useState<AjusteInventarioMototaxi[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  async function cargar() {
    setCargando(true); setError("");
    try {
      const [catalogo, historial] = await Promise.all([servicioMototaxis.modelos("", true), servicioMototaxis.ajustesInventario()]);
      setModelos(catalogo); setAjustes(historial);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo cargar el inventario de mototaxis."); }
    finally { setCargando(false); }
  }
  useEffect(() => { void cargar(); }, []);

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase("es");
    if (!termino) return ajustes;
    return ajustes.filter((ajuste) => [ajuste.codigo, ajuste.marca, ajuste.modelo, ajuste.version, ajuste.motivo, ajuste.usuario, ajuste.observacion]
      .some((valor) => valor?.toLocaleLowerCase("es").includes(termino)));
  }, [ajustes, busqueda]);

  const notificacion = aviso && <NotificacionFlotante tipo="exito" mensaje={aviso} onCerrar={() => setAviso("")} />;

  // El formulario se devuelve sin contenedor: así toma los márgenes y el scroll propio de `.os-editor`.
  if (abierto) return <>{notificacion}<FormularioAjusteMototaxis modelos={modelos} alCerrar={() => setAbierto(false)}
    alGuardar={(mensaje) => { setAbierto(false); setAviso(mensaje); void cargar(); }} /></>;

  return <section className={c.page}>
    {puedeAjustar && <RegistrarAccionPrincipal etiqueta="Nuevo ajuste de mototaxis" onClick={() => { setAviso(""); setAbierto(true); }} />}
    {notificacion}
    {error && !cargando && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <div className={c.toolbar}>
      <label className={`${c.search} listado-maestro-busqueda-icono`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>
        <input type="search" value={busqueda} placeholder="Buscar modelo, código o motivo" aria-label="Buscar ajustes de inventario de mototaxis" onChange={(evento) => setBusqueda(evento.target.value)} />
      </label>
    </div>
    <ListadoMaestro<AjusteInventarioMototaxi>
      variante="tabla"
      titulo="Ajustes de inventario de mototaxis"
      registros={filtrados}
      cargando={cargando}
      claseCabecera={c.header}
      claseTabla={c.table}
      claseContenedor={c.tableScroll}
      paginacion={{ modo: "local" }}
      vacio={<div className={c.empty}><strong>No hay ajustes para mostrar</strong><span>{busqueda.trim() ? "Prueba con otra búsqueda." : "Los reconteos que registres aparecerán aquí."}</span></div>}
      encabezadoTabla={encabezado}
      renderizarFila={(ajuste) => <FilaAjuste key={ajuste.id} ajuste={ajuste} />}
    />
  </section>;
}
