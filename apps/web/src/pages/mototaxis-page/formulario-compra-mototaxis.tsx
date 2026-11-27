import "../ordenes-servicio-page/orden-servicio-editor.css";
import "../nuevo-ingreso-page/nueva-venta-editor.css";
import "./formulario-compra-mototaxis.css";
import { CheckCircle2, ChevronDown, MessageSquareText, Printer } from "lucide-react";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { useCatalogoRecientes, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import type { ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { servicioMototaxis, type CompraMototaxi, type MarcaMototaxi, type ModeloMototaxi, type ProveedorMototaxi } from "../../services/mototaxis.service";
import { FormularioModeloMototaxi } from "../inventario-mototaxis-page/formulario-modelo-mototaxi";
import { CobroVenta, importesCobro, parteCobroVacia, validarCobro, type ParteCobro } from "../nuevo-ingreso-page/cobro-venta";
import { documentoDeCompraMototaxi } from "./documento-compra-mototaxi";
import { ModelosCompraMototaxi, type LineaCompraMototaxi } from "./modelos-compra-mototaxi";
import { ProveedorCompraMototaxi } from "./proveedor-compra-mototaxi";

const documentos = { FACTURA: "Factura", BOLETA: "Boleta", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento" };
const LIMITE_OBSERVACIONES = 2000;
const MAX_LINEAS = 30;
const soles = (valor: number) => `S/ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaHoy = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
const lineaValida = (linea: LineaCompraMototaxi) => Number.isInteger(Number(linea.cantidad)) && Number(linea.cantidad) > 0 && Number(linea.cantidad) <= 2_147_483_647
  && Number(linea.costoUnitario) > 0 && Number(Number(linea.costoUnitario).toFixed(2)) === Number(linea.costoUnitario)
  && Number.isInteger(Number(linea.mesesGarantia)) && Number(linea.mesesGarantia) >= 1 && Number(linea.mesesGarantia) <= 120;

type Registrada = { compra: CompraMototaxi; lineas: { descripcion: string; cantidad: number; costoUnitario: number }[] };

type Props = {
  marcas: MarcaMototaxi[];
  modelos: ModeloMototaxi[];
  proveedores: ProveedorMototaxi[];
  alAgregarProveedor: (proveedor: ProveedorMototaxi) => void;
  alCambiarCatalogo: () => void;
  alCerrar: () => void;
};

function Tarjeta({ paso, id, titulo, extra, children }: { paso: number; id: string; titulo: string; extra?: ReactNode; children: ReactNode }) {
  return <section className="os-tarjeta" aria-labelledby={id}>
    <div className="os-tarjeta-cabecera"><div className="os-titulo"><span className="os-paso" aria-hidden="true">{paso}</span><h3 id={id}>{titulo}</h3>{extra}</div></div>
    {children}
  </section>;
}

/** Compra de mototaxis con la estructura `os-*` de Órdenes de servicio; el botón principal registra e imprime. */
export function FormularioCompraMototaxis({ marcas, modelos, proveedores, alAgregarProveedor, alCambiarCatalogo, alCerrar }: Props) {
  const formulario = useRef<HTMLFormElement>(null);
  const claveIdempotencia = useRef(crypto.randomUUID());
  const alertas = useAlertas();
  const imprimirAlEmitir = useImprimirAlEmitir(alertas);
  const recientes = useCatalogoRecientes("mototaxis-modelos");
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [registrada, setRegistrada] = useState<Registrada | null>(null);
  const [fecha, setFecha] = useState(fechaHoy);
  const [documentoTipo, setDocumentoTipo] = useState("FACTURA");
  const [documentoNumero, setDocumentoNumero] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [observacion, setObservacion] = useState("");
  const [busquedaModelo, setBusquedaModelo] = useState("");
  const [creandoModelo, setCreandoModelo] = useState(false);
  const [lineas, setLineas] = useState<LineaCompraMototaxi[]>([]);
  const [partes, setPartes] = useState<ParteCobro[]>(() => [parteCobroVacia()]);
  const firma = JSON.stringify({ fecha, documentoTipo, documentoNumero, proveedorId, observacion, lineas, partes });
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCerrar, "la compra de mototaxis", firma);
  const sinDocumento = documentoTipo === "SIN_DOCUMENTO";
  const proveedor = proveedores.find((item) => item.id === proveedorId);
  const total = lineas.reduce((suma, linea) => suma + (Number(linea.cantidad) || 0) * (Number(linea.costoUnitario) || 0), 0);
  const unidades = lineas.reduce((suma, linea) => suma + (Number(linea.cantidad) || 0), 0);

  function nombreModelo(id: string) {
    const modelo = modelos.find((item) => item.id === id);
    return modelo ? [modelo.marca, modelo.nombre, modelo.version].filter(Boolean).join(" ") : "Modelo seleccionado";
  }

  function agregarModelo(modelo: ModeloMototaxi) {
    recientes.registrar({ id: modelo.id, nombre: nombreModelo(modelo.id), codigo: modelo.codigo, detalle: modelo.version || undefined });
    setBusquedaModelo("");
    setLineas((actuales) => {
      if (actuales.some((linea) => linea.modeloId === modelo.id)) return actuales.map((linea) => linea.modeloId === modelo.id ? { ...linea, cantidad: String((Number(linea.cantidad) || 0) + 1) } : linea);
      if (actuales.length >= MAX_LINEAS) { setError(`Una compra permite registrar hasta ${MAX_LINEAS} líneas.`); return actuales; }
      return [...actuales, { clave: crypto.randomUUID(), modeloId: modelo.id, cantidad: "1", costoUnitario: "", porcentajeGarantia: "80", mesesGarantia: "12" }];
    });
  }

  function agregarReciente(reciente: CatalogoReciente) {
    const modelo = modelos.find((item) => item.id === reciente.id);
    if (modelo) agregarModelo(modelo);
    else setError("Ese modelo ya no está disponible en el catálogo. Búscalo nuevamente.");
  }

  function imprimir(datos: Registrada) {
    void imprimirAlEmitir.preparar("TICKET").then((preparada) => imprimirAlEmitir.imprimir(() => documentoDeCompraMototaxi(datos.compra, datos.lineas), preparada))
      .catch((problema) => alertas.error(mensajeErrorImpresion(problema)));
  }

  function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (guardando) return;
    if (!sinDocumento && !proveedorId) { setError("Busca y selecciona un proveedor para continuar."); return; }
    if (!sinDocumento && !documentoNumero.trim()) { setError("Ingresa el número del documento de compra."); return; }
    if (!lineas.length) { setError("Agrega al menos un modelo a la compra."); return; }
    if (lineas.some((linea) => !lineaValida(linea))) { setError("Completa la cantidad, el costo unitario y los meses de garantía de cada modelo."); return; }
    const errorPago = validarCobro(partes, total);
    if (errorPago) { setError(errorPago.replaceAll("cobro", "pago").replaceAll("cobrar", "pagar")); return; }
    const importes = importesCobro(partes, total);
    const pagos = partes.map((parte, indice) => ({ cuentaFinancieraId: parte.cuentaId, medioPago: parte.medioPago, importePagado: importes[indice].toFixed(2) }));
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { alertas.error(mensajeErrorImpresion(problema)); return; }
      setGuardando(true);
      try {
        const respuesta = await servicioMototaxis.comprar({
          claveIdempotencia: claveIdempotencia.current, proveedorPersonaId: sinDocumento ? undefined : proveedorId, fecha, documentoTipo, documentoNumero: sinDocumento ? "" : documentoNumero,
          moneda: "PEN", importePagoInicial: total.toFixed(2), pagosIniciales: pagos,
          medioPago: pagos.length === 1 ? pagos[0].medioPago : undefined, cuentaFinancieraId: pagos.length === 1 ? pagos[0].cuentaFinancieraId : undefined, observacion,
          detalles: lineas.map(({ modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia }) => ({ modeloId, cantidad, costoUnitario, porcentajeGarantia, mesesGarantia })),
        });
        const datos: Registrada = {
          compra: {
            id: respuesta.id, codigo: respuesta.codigo, fecha: respuesta.fecha, documentoTipo, documentoNumero: sinDocumento ? null : documentoNumero || null, moneda: "PEN",
            total: respuesta.total, proveedor: sinDocumento ? "" : proveedor?.nombre ?? "", unidades: respuesta.unidades, pagado: respuesta.importePagado, saldo: respuesta.saldoPendiente, observacion: observacion || null,
          },
          lineas: lineas.map((linea) => ({ descripcion: nombreModelo(linea.modeloId), cantidad: Number(linea.cantidad), costoUnitario: Number(linea.costoUnitario) })),
        };
        setRegistrada(datos);
        alCambiarCatalogo();
        void imprimirAlEmitir.imprimir(() => documentoDeCompraMototaxi(datos.compra, datos.lineas), preparada);
      } catch (problema) {
        setError(problema instanceof Error ? problema.message : "No se pudo registrar la compra.");
      } finally { setGuardando(false); }
    })();
  }

  return <div className="os-editor compra-moto-editor">
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <form ref={formulario} className="os-formulario" onSubmit={registrar} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />{registrada ? "Compra registrada" : "Ingresará al inventario"}</span>
        <div className="os-numero" aria-live="polite"><span>N.° DE COMPRA</span><strong>{registrada?.compra.codigo ?? "Se asigna al guardar"}</strong></div>
      </div>

      <div className="os-disposicion">
        <fieldset className="os-columna compra-moto-columna" disabled={guardando || Boolean(registrada)}>
          <Tarjeta paso={1} id="compra-moto-titulo-datos" titulo="Datos de la compra">
            <div className="os-campos compra-moto-datos">
              <label className="os-campo">Tipo de documento *
                <span className="os-select">
                  <select value={documentoTipo} onChange={(evento) => { setDocumentoTipo(evento.target.value); if (evento.target.value === "SIN_DOCUMENTO") { setDocumentoNumero(""); setProveedorId(""); } }}>
                    {Object.entries(documentos).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">Fecha de compra *<input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required /></label>
              {!sinDocumento && <label className="os-campo">N.° del documento *
                <input value={documentoNumero} onChange={(evento) => setDocumentoNumero(evento.target.value)} maxLength={80} autoComplete="off" placeholder="Ej. F001-00001234" required />
              </label>}
            </div>
          </Tarjeta>

          {!sinDocumento && <Tarjeta paso={2} id="compra-moto-titulo-proveedor" titulo="Proveedor *">
            <ProveedorCompraMototaxi proveedores={proveedores} proveedorId={proveedorId} alElegir={setProveedorId} alError={setError}
              alCrear={(nuevo) => { alAgregarProveedor(nuevo); setProveedorId(nuevo.id); alertas.mostrar({ tipo: "exito", mensaje: "Proveedor registrado para esta compra." }); }} />
          </Tarjeta>}

          <Tarjeta paso={sinDocumento ? 2 : 3} id="compra-moto-titulo-modelos" titulo="Mototaxis de la compra"
            extra={<span className="os-contador">{unidades} {unidades === 1 ? "unidad" : "unidades"}</span>}>
            <ModelosCompraMototaxi modelos={modelos} busqueda={busquedaModelo} alBuscar={setBusquedaModelo} alElegir={agregarModelo}
              recientes={recientes.recientes} alElegirReciente={agregarReciente} alCrearModelo={() => setCreandoModelo(true)} nombreModelo={nombreModelo}
              conGarantia={!sinDocumento} lineas={lineas} alCambiar={(clave, cambios) => setLineas((actuales) => actuales.map((linea) => linea.clave === clave ? { ...linea, ...cambios } : linea))}
              alQuitar={(clave) => setLineas((actuales) => actuales.filter((linea) => linea.clave !== clave))} />
          </Tarjeta>

          <Tarjeta paso={sinDocumento ? 3 : 4} id="compra-moto-titulo-observaciones" titulo="Observaciones">
            <div className="os-revision">
              <label className="os-campo">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observaciones de la compra <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACIONES} rows={3} value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
                  placeholder="Ej. El proveedor entregará las 2 unidades rojas el lunes junto con sus tarjetas de propiedad." />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACIONES}</small>
              </label>
            </div>
          </Tarjeta>
        </fieldset>

        <aside className="os-resumen" aria-label="Resumen de la compra">
          <h3>Resumen de la compra</h3>
          <dl className="os-importes">
            <div><dt>Documento</dt><dd>{documentos[documentoTipo as keyof typeof documentos]}{documentoNumero && !sinDocumento ? ` ${documentoNumero}` : ""}</dd></div>
            {!sinDocumento && <div><dt>Proveedor</dt><dd className="compra-moto-resumen-texto">{proveedor?.nombre ?? "Pendiente"}</dd></div>}
            <div><dt>Unidades</dt><dd>{unidades}</dd></div>
            <div className="es-total"><dt>Total</dt><dd aria-live="polite">{soles(total)}</dd></div>
          </dl>
          {!registrada && total > 0 && <CobroVenta titulo="Pago" partes={partes} total={total} onChange={setPartes} />}
          {registrada && <div className="compra-moto-confirmacion" role="status">
            <strong><CheckCircle2 aria-hidden="true" size={18} />Compra {registrada.compra.codigo} registrada</strong>
            <span>Se agregaron {registrada.compra.unidades} {registrada.compra.unidades === 1 ? "unidad" : "unidades"} al inventario y se envió a la impresora.</span>
            <button type="button" className="os-cancelar" onClick={() => imprimir(registrada)}><Printer aria-hidden="true" size={16} />Reimprimir</button>
          </div>}
          <div className="os-acciones">
            {!registrada && <button className="os-guardar" type="submit" disabled={guardando || !lineas.length}><Printer aria-hidden="true" size={18} />{guardando ? "Registrando compra…" : "Imprimir compra"}</button>}
            <button className="os-cancelar" type="button" disabled={guardando} onClick={registrada ? alCerrar : cancelar.solicitarCancelacion}>{registrada ? "Volver al listado" : "Cancelar"}</button>
          </div>
        </aside>
      </div>
    </form>
    {cancelar.dialogo}
    {creandoModelo && <FormularioModeloMototaxi marcas={marcas} alCerrar={() => setCreandoModelo(false)} alGuardar={(modelo) => {
      setCreandoModelo(false);
      agregarModelo(modelo);
      alertas.mostrar({ tipo: "exito", mensaje: "Modelo agregado al catálogo." });
      alCambiarCatalogo();
    }} />}
  </div>;
}
