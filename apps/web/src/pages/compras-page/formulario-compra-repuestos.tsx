import "../ordenes-servicio-page/orden-servicio-editor.css";
import "../nuevo-ingreso-page/nueva-venta-editor.css";
import "./formulario-compra-repuestos.css";
import { CheckCircle2, ChevronDown, MessageSquareText, Printer } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { documentoDeCompra } from "../../components/inventario/entrada-stock-detalle/documento-compra";
import { useAltaRapidaRepuesto } from "../../components/productos/use-alta-rapida-repuesto";
import { NotificacionFlotante, useAlertas } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { useConfirmarCancelacionFormulario } from "../../hooks/use-confirmar-cancelacion-formulario";
import type { useEntradasStock } from "../../hooks/use-entradas-stock";
import type { ImpresionPreparada } from "../../impresion/servicio-impresion";
import { mensajeErrorImpresion } from "../../impresion/use-impresion";
import { useImprimirAlEmitir } from "../../impresion/use-imprimir-al-emitir";
import { servicioEntradasStock, type EntradaStock } from "../../services/inventario/entradas-stock.service";
import { CobroVenta, importesCobro, parteCobroVacia, validarCobro, type ParteCobro } from "../nuevo-ingreso-page/cobro-venta";
import { ProveedorCompra } from "./proveedor-compra";
import { RepuestosCompra } from "./repuestos-compra";

const documentos = { FACTURA: "Factura", BOLETA: "Boleta", GUIA_REMISION: "Guía de remisión", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento" };
const LIMITE_OBSERVACIONES = 2000;
const soles = (valor: number) => `S/ ${valor.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const documentoImprimible = (id: string) => servicioEntradasStock.consultar(id).then(documentoDeCompra);

type Props = { modulo: ReturnType<typeof useEntradasStock>; alCerrar: () => void; compraEditada?: EntradaStock };

/** Pagos vigentes de la compra como partes del pago: todas con su importe salvo la última, que toma el resto. */
function partesIniciales(compra?: EntradaStock): ParteCobro[] {
  const pagos = (compra?.pagos ?? []).filter((pago) => pago.cuentaFinancieraId);
  if (!pagos.length) return [parteCobroVacia()];
  return pagos.map((pago, indice) => ({ ...parteCobroVacia(), cuentaId: pago.cuentaFinancieraId ?? "", medioPago: pago.medioPago, monto: indice < pagos.length - 1 ? Number(pago.importePagado).toFixed(2) : "" }));
}

function Tarjeta({ paso, id, titulo, extra, children }: { paso: number; id: string; titulo: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return <section className="os-tarjeta" aria-labelledby={id}>
    <div className="os-tarjeta-cabecera"><div className="os-titulo"><span className="os-paso" aria-hidden="true">{paso}</span><h3 id={id}>{titulo}</h3>{extra}</div></div>
    {children}
  </section>;
}

/** Compra de repuestos con la estructura `os-*` de Órdenes de servicio; el botón principal registra e imprime. */
export function FormularioCompraRepuestos({ modulo, alCerrar, compraEditada }: Props) {
  const { guardando, error, setError, fecha, setFecha, tipoDocumento, setTipoDocumento, numeroDocumento, setNumeroDocumento,
    proveedor, setProveedorTipoDocumento, observacion, setObservacion, detalles, totalBorrador, guardar } = modulo;
  const formulario = useRef<HTMLFormElement>(null);
  const alertas = useAlertas();
  const imprimirAlEmitir = useImprimirAlEmitir(alertas);
  const [partes, setPartes] = useState<ParteCobro[]>(() => partesIniciales(compraEditada));
  const editando = Boolean(compraEditada);
  const [registrada, setRegistrada] = useState<EntradaStock | null>(null);
  const firma = JSON.stringify({ fecha, tipoDocumento, numeroDocumento, proveedor, observacion, detalles, partes });
  const cancelar = useConfirmarCancelacionFormulario(formulario, alCerrar, "la compra de repuestos", firma);
  const alta = useAltaRapidaRepuesto({
    busqueda: modulo.productoBusqueda,
    alCrear: (producto) => {
      void servicioEntradasStock.buscarProductos(producto.codigo).then((resultados) => {
        const creado = resultados.find((item) => item.codigoInterno === producto.codigo) ?? (resultados.length === 1 ? resultados[0] : null);
        if (!creado) { alertas.error("El repuesto se creó, pero no se pudo agregar solo. Búscalo manualmente."); return; }
        modulo.seleccionarProductoCompra(creado);
        modulo.limpiarProductoElegido();
      }).catch(() => alertas.error("El repuesto se creó, pero no se pudo agregar solo. Búscalo manualmente."));
    },
    alError: alertas.error,
  });
  const sinDocumento = tipoDocumento === "SIN_DOCUMENTO";
  const lineasConImporte = detalles.filter((fila) => Number(fila.importeTotal) > 0).length;

  function imprimir(entrada: EntradaStock) {
    void imprimirAlEmitir.preparar("TICKET").then((preparada) => imprimirAlEmitir.imprimir(() => documentoImprimible(entrada.id), preparada))
      .catch((problema) => alertas.error(mensajeErrorImpresion(problema)));
  }

  function registrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!detalles.length) { setError("Agrega al menos un repuesto a la compra."); return; }
    const errorPago = validarCobro(partes, totalBorrador);
    if (errorPago) { setError(errorPago.replaceAll("cobro", "pago").replaceAll("cobrar", "pagar")); return; }
    const importes = importesCobro(partes, totalBorrador);
    const pagos = partes.map((parte, indice) => ({ cuentaFinancieraId: parte.cuentaId, medioPago: parte.medioPago, importePagado: importes[indice].toFixed(2) }));
    // El navegador exige el gesto del usuario para pedir la impresora: se prepara antes de cualquier await.
    const preparacion = imprimirAlEmitir.preparar("TICKET");
    void (async () => {
      let preparada: ImpresionPreparada;
      try { preparada = await preparacion; }
      catch (problema) { alertas.error(mensajeErrorImpresion(problema)); return; }
      const creada = await guardar(evento, pagos);
      if (!creada) return;
      setRegistrada(creada);
      void imprimirAlEmitir.imprimir(() => documentoImprimible(creada.id), preparada);
    })();
  }

  return <div className="os-editor compra-repuestos-editor">
    {error && <NotificacionFlotante mensaje={error} onCerrar={() => setError("")} />}
    <form ref={formulario} className="os-formulario" onSubmit={registrar} aria-busy={guardando}>
      <div className="os-indicadores">
        <span className="os-chip border-[#c8deed] bg-[#eef6fb] text-[#17628b]"><i className="bg-[#2a8bbd]" aria-hidden="true" />{registrada ? editando ? "Compra actualizada" : "Compra registrada" : editando ? "Editando compra" : "Ingresará al inventario"}</span>
        <div className="os-numero" aria-live="polite"><span>N.° DE COMPRA</span><strong>{registrada?.codigo ?? compraEditada?.codigo ?? "Se asigna al guardar"}</strong></div>
      </div>

      <div className="os-disposicion">
        <fieldset className="os-columna compra-rep-columna" disabled={guardando || Boolean(registrada)}>
          <Tarjeta paso={1} id="compra-titulo-datos" titulo="Datos de la compra">
            <div className="os-campos compra-rep-datos">
              <label className="os-campo">Tipo de documento *
                <span className="os-select">
                  <select value={tipoDocumento} onChange={(evento) => {
                    const tipo = evento.target.value;
                    setTipoDocumento(tipo);
                    if (tipo === "FACTURA") setProveedorTipoDocumento("RUC");
                    if (tipo === "SIN_DOCUMENTO") { modulo.limpiarProveedor(); setNumeroDocumento(""); }
                  }}>
                    {Object.entries(documentos).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
                  </select>
                  <ChevronDown aria-hidden="true" size={16} />
                </span>
              </label>
              <label className="os-campo">Fecha de compra *<input type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} required /></label>
              {!sinDocumento && <label className="os-campo">N.° del documento *
                <input value={numeroDocumento} onChange={(evento) => setNumeroDocumento(evento.target.value)} maxLength={60} placeholder="Ej. F001-00001234" required />
              </label>}
            </div>
          </Tarjeta>

          {!sinDocumento && <Tarjeta paso={2} id="compra-titulo-proveedor" titulo="Proveedor"><ProveedorCompra modulo={modulo} /></Tarjeta>}

          <Tarjeta paso={sinDocumento ? 2 : 3} id="compra-titulo-repuestos" titulo="Repuestos de la compra"
            extra={<span className="os-contador">{detalles.length} {detalles.length === 1 ? "línea" : "líneas"}</span>}>
            <RepuestosCompra modulo={modulo} onCrearRepuesto={() => void alta.abrir()} />
          </Tarjeta>

          <Tarjeta paso={sinDocumento ? 3 : 4} id="compra-titulo-observaciones" titulo="Observaciones">
            <div className="os-revision">
              <label className="os-campo">
                <span className="os-revision-titulo"><MessageSquareText aria-hidden="true" size={16} />Observaciones de la compra <em className="os-opcional">Opcional</em></span>
                <textarea maxLength={LIMITE_OBSERVACIONES} rows={3} value={observacion} onChange={(evento) => setObservacion(evento.target.value)}
                  placeholder="Ej. El proveedor entregará los 2 filtros restantes el lunes; la factura llegó con el pedido." />
                <small className="os-ayuda os-contador">{observacion.length}/{LIMITE_OBSERVACIONES}</small>
              </label>
            </div>
          </Tarjeta>
        </fieldset>

        <aside className="os-resumen" aria-label="Resumen de la compra">
          <h3>Resumen de la compra</h3>
          <dl className="os-importes">
            <div><dt>Documento</dt><dd>{documentos[tipoDocumento as keyof typeof documentos] ?? tipoDocumento}{numeroDocumento && !sinDocumento ? ` ${numeroDocumento}` : ""}</dd></div>
            {!sinDocumento && <div><dt>Proveedor</dt><dd className="compra-resumen-texto">{proveedor.trim() || "Pendiente"}</dd></div>}
            <div><dt>Repuestos</dt><dd>{lineasConImporte}/{detalles.length}</dd></div>
            <div className="es-total"><dt>Total</dt><dd aria-live="polite">{soles(totalBorrador)}</dd></div>
          </dl>
          {!registrada && totalBorrador > 0 && <CobroVenta titulo="Pago" partes={partes} total={totalBorrador} onChange={setPartes} />}
          {registrada && <div className="compra-confirmacion" role="status">
            <strong><CheckCircle2 aria-hidden="true" size={18} />Compra {registrada.codigo} {editando ? "actualizada" : "registrada"}</strong>
            <span>{editando ? "El stock y los pagos se ajustaron" : "El stock se actualizó"} y se envió a la impresora.</span>
            <button type="button" className="os-cancelar" onClick={() => imprimir(registrada)}><Printer aria-hidden="true" size={16} />Reimprimir</button>
          </div>}
          <div className="os-acciones">
            {!registrada && <button className="os-guardar" type="submit" disabled={guardando || !detalles.length}><Printer aria-hidden="true" size={18} />{guardando ? editando ? "Guardando cambios…" : "Registrando compra…" : "Imprimir compra"}</button>}
            <button className="os-cancelar" type="button" disabled={guardando} onClick={registrada ? alCerrar : cancelar.solicitarCancelacion}>{registrada ? "Volver al listado" : "Cancelar"}</button>
          </div>
        </aside>
      </div>
    </form>
    {cancelar.dialogo}
    {alta.dialogo}
  </div>;
}
