import "../ordenes-servicio-page/orden-servicio-editor.css";
import "../movimientos-stock-page/formulario-ajuste-repuestos.css";
import { ChevronDown, MessageSquareText, Save } from "lucide-react";
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

function FormularioAjusteMototaxis({ modelos, alCerrar, alGuardar }: { modelos: ModeloMototaxi[]; alCerrar: () => void; alGuardar: (mensaje: string) => void }) {
  const formulario = useRef<HTMLFormElement>(null);
  const [modeloId, setModeloId] = useState("");
  const [reconteo, setReconteo] = useState<ReconteoModeloMototaxi | null>(null);
  const [cantidadContada, setCantidadContada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacion, setObservacion] = useState("");
  const [cargandoReconteo, setCargandoReconteo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const firma = JSON.stringify({ modeloId, cantidadContada, motivo, observacion });
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCerrar, "el ajuste de inventario", firma);

  useEffect(() => {
    setReconteo(null); setCantidadContada("");
    if (!modeloId) return;
    let vigente = true;
    setCargandoReconteo(true); setError("");
    void servicioMototaxis.reconteoModelo(modeloId).then((resultado) => {
      if (vigente) { setReconteo(resultado); setCantidadContada(String(resultado.cantidadSistema)); }
    }).catch((problema: unknown) => { if (vigente) setError(problema instanceof Error ? problema.message : "No se pudo consultar el inventario del modelo."); })
      .finally(() => { if (vigente) setCargandoReconteo(false); });
    return () => { vigente = false; };
  }, [modeloId]);

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const cantidad = Number(cantidadContada);
    if (!reconteo || reconteo.modelo.id !== modeloId || !cantidadContada.trim() || !Number.isInteger(cantidad) || cantidad < 0 || cantidad > 2_147_483_647) { setError("Ingresa una cantidad entera igual o mayor que cero."); return; }
    setGuardando(true); setError("");
    try {
      const resultado = await servicioMototaxis.crearAjusteInventario({ modeloId, cantidadSistema: reconteo.cantidadSistema, cantidadContada: cantidad, motivo, observacion });
      alGuardar(`Ajuste ${resultado.codigo} aplicado. Saldo final: ${resultado.cantidadContada} mototaxis.`);
    } catch (problema) { setError(problema instanceof ErrorApi || problema instanceof Error ? problema.message : "No se pudo registrar el ajuste."); }
    finally { setGuardando(false); }
  }

  const sistema = reconteo?.cantidadSistema ?? 0;
  const contada = Number(cantidadContada) || 0;
  const variacion = contada - sistema;
  const elegido = modelos.find((modelo) => modelo.id === modeloId);

  return <div className="os-editor ajuste-repuestos-editor">
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <form ref={formulario} className="os-formulario" onSubmit={(evento) => void guardar(evento)} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />Quedará en el historial</span>
        <div className="os-numero"><span>TIPO DE AJUSTE</span><strong>Por conteo</strong></div>
      </div>

      <div className="os-disposicion">
        <fieldset className="os-columna ajuste-rep-columna" disabled={guardando}>
          <Tarjeta paso={1} id="ajuste-moto-titulo-detalle" titulo="Detalle del ajuste">
            <div className="os-campos ajuste-rep-datos">
              <label className="os-campo">Modelo *
                <span className="os-select">
                  <select required autoFocus value={modeloId} onChange={(evento) => setModeloId(evento.target.value)}>
                    <option value="">Selecciona un modelo</option>
                    {modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{nombreModelo(modelo.marca, modelo.nombre, modelo.version)}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">Cantidad contada *
                <input required type="number" min="0" max="2147483647" step="1" inputMode="numeric" value={cantidadContada} disabled={!reconteo}
                  onChange={(evento) => setCantidadContada(evento.target.value)} placeholder={cargandoReconteo ? "Consultando existencias…" : "En unidades"} />
              </label>
              <label className="os-campo">Motivo *
                <input required minLength={2} maxLength={120} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Ej. Inventario físico de almacén" />
              </label>
            </div>
          </Tarjeta>

          <Tarjeta paso={2} id="ajuste-moto-titulo-observacion" titulo="Observación">
            <div className="os-revision">
              <label className="os-campo">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observación del ajuste <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACION} rows={3} value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
                  placeholder="Ej. En el conteo del lunes faltó 1 unidad; se vendió sin registrar la salida." />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACION}</small>
              </label>
            </div>
          </Tarjeta>
        </fieldset>

        <aside className="os-resumen" aria-label="Resumen del ajuste">
          <h3>Resumen del ajuste</h3>
          <dl className="os-importes">
            <div><dt>Modelo</dt><dd className="ajuste-resumen-texto">{elegido ? nombreModelo(elegido.marca, elegido.nombre, elegido.version) : "Pendiente"}</dd></div>
            <div><dt>En sistema</dt><dd>{reconteo ? `${sistema} und.` : "—"}</dd></div>
            <div><dt>Variación</dt><dd className={variacion < 0 ? "ajuste-baja" : variacion > 0 ? "ajuste-alza" : undefined}>{reconteo && cantidadContada.trim() ? conSigno(variacion) : "—"}</dd></div>
            <div className="es-total"><dt>Saldo final</dt><dd aria-live="polite">{reconteo ? `${contada} und.` : "—"}</dd></div>
          </dl>
          <p className="ajuste-nota">Se registra con tu usuario, el motivo y la fecha. La diferencia se aplica a las existencias del modelo.</p>
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
