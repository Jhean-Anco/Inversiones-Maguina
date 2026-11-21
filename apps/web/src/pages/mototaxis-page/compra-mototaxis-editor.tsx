
import type { Dispatch, FormEventHandler, SetStateAction } from "react";
import { CatalogoRecientes } from "../../components/catalogo/catalogo-recientes";
import { MIN_CARACTERES_BUSQUEDA_CATALOGO, type CatalogoReciente } from "../../components/catalogo/use-catalogo-recientes";
import { CompraCatalogo, CompraDocumento, CompraPie, CompraRevision, type PagoDocumentoCompra } from "../../components/documentos/compra-documento";
import type { ModeloMototaxi, ProveedorMototaxi } from "../../services/mototaxis.service";

export type LineaCompraMototaxi = {
  modeloId: string; cantidad: string; costoUnitario: string; porcentajeGarantia: string; mesesGarantia: string;
};
export type CompraMototaxiBorrador = LineaCompraMototaxi & {
  proveedorPersonaId: string; fecha: string; documentoTipo: string; documentoNumero: string; observacion: string;
};

const documentos = { FACTURA: "Factura", BOLETA: "Boleta", NOTA: "Nota", OTRO: "Otro documento", SIN_DOCUMENTO: "Sin documento" };
const importe = (valor: string | number) => `S/ ${Number(valor || 0).toFixed(2)}`;

type Props = {
  compra: CompraMototaxiBorrador;
  actualizarCompra: (cambios: Partial<CompraMototaxiBorrador>) => void;
  enRevision: boolean;
  guardando: boolean;
  proveedores: ProveedorMototaxi[];
  busquedaProveedor: string;
  alBuscarProveedor: (valor: string) => void;
  alAgregarProveedor: () => void;
  modelos: ModeloMototaxi[];
  totalModelos: number;
  busquedaModelo: string;
  alBuscarModelo: (valor: string) => void;
  alSeleccionarModelo: (modelo: ModeloMototaxi) => void;
  modelosRecientes: CatalogoReciente[];
  alSeleccionarReciente: (reciente: CatalogoReciente) => void;
  alCrearModelo: () => void;
  nombreModelo: (id: string) => string;
  lineasAgregadas: LineaCompraMototaxi[];
  alAgregarLinea: () => void;
  alQuitarLinea: (indice: number) => void;
  totalCompra: number;
  pagos: PagoDocumentoCompra[];
  setPagos: Dispatch<SetStateAction<PagoDocumentoCompra[]>>;
  alCancelar: () => void;
  alEditar: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export function CompraMototaxisEditor({
  compra, actualizarCompra, enRevision, guardando, proveedores, busquedaProveedor, alBuscarProveedor, alAgregarProveedor,
  modelos, totalModelos, busquedaModelo, alBuscarModelo, alSeleccionarModelo, modelosRecientes, alSeleccionarReciente, alCrearModelo,
  nombreModelo, lineasAgregadas, alAgregarLinea, alQuitarLinea, totalCompra, pagos, setPagos, alCancelar, alEditar, onSubmit,
}: Props) {
  const proveedor = proveedores.find((item) => item.id === compra.proveedorPersonaId);
  const terminoProveedor = busquedaProveedor.trim().toLocaleLowerCase();
  const proveedoresEncontrados = terminoProveedor ? proveedores.filter((item) =>
    `${item.nombre} ${item.tipoDocumento} ${item.numeroDocumento}`.toLocaleLowerCase().includes(terminoProveedor)).slice(0, 8) : [];
  const lineas = compra.modeloId ? [...lineasAgregadas, compra] : lineasAgregadas;
  const cantidad = lineas.reduce((total, linea) => total + (Number(linea.cantidad) || 0), 0);
  const sinDocumento = compra.documentoTipo === "SIN_DOCUMENTO";
  const tituloDocumento = documentos[compra.documentoTipo as keyof typeof documentos] ?? compra.documentoTipo;
  const catalogo = <CompraCatalogo titulo="Buscar modelos" etiqueta="Buscar modelos para comprar" placeholder="Marca, modelo o código"
    valor={busquedaModelo} alBuscar={alBuscarModelo}
    accion={<button type="button" className="compra-secundario" onClick={alCrearModelo}>+ Agregar modelo</button>}
  >
    {!totalModelos ? <div className="venta-catalog-empty"><strong>No hay modelos registrados</strong></div>
      : !busquedaModelo.trim() ? <CatalogoRecientes items={modelosRecientes} alSeleccionar={alSeleccionarReciente} titulo="Últimos modelos seleccionados" etiquetaAccion="Seleccionar modelo" />
      : busquedaModelo.trim().length < MIN_CARACTERES_BUSQUEDA_CATALOGO ? <div className="venta-catalog-empty is-hint"><span>Escribe al menos cuatro caracteres para buscar.</span></div>
      : modelos.length ? modelos.map((modelo) => <article className="venta-catalog-product" key={modelo.id}>
        <div className="venta-catalog-product-title"><strong>{nombreModelo(modelo.id)}</strong><span>{modelo.codigo}</span></div>
        <button type="button" onClick={() => alSeleccionarModelo(modelo)}>Seleccionar modelo</button>
      </article>)
      : <div className="venta-catalog-empty"><strong>Sin resultados</strong><span>Prueba con otra marca, modelo o código.</span></div>}
  </CompraCatalogo>;

  const campos = <>
    <div className="compra-campos compra-comprobante">
      <label>Tipo de documento
        <select value={compra.documentoTipo} onChange={(evento) => {
          const documentoTipo = evento.target.value;
          actualizarCompra({ documentoTipo, documentoNumero: documentoTipo === "SIN_DOCUMENTO" ? "" : compra.documentoNumero });
        }}>
          {Object.entries(documentos).map(([valor, etiqueta]) => <option key={valor} value={valor}>{etiqueta}</option>)}
        </select>
      </label>
      <label>Fecha de compra<input type="date" required value={compra.fecha} onChange={(evento) => actualizarCompra({ fecha: evento.target.value })} /></label>
      <label>Número del documento
        <input type="text" autoComplete="off" maxLength={80} disabled={sinDocumento} value={compra.documentoNumero}
          onChange={(evento) => actualizarCompra({ documentoNumero: evento.target.value })} placeholder={sinDocumento ? "Sin documento" : "Opcional"} />
      </label>
    </div>
    <div className="compra-campos compra-proveedor compra-proveedor-moto">
      <label>Proveedor
        <input type="search" aria-label="Buscar proveedor" autoComplete="off" value={proveedor?.nombre ?? busquedaProveedor}
          onKeyDown={(evento) => { if (evento.key === "Enter") evento.preventDefault(); }}
          placeholder="Nombre, RUC o DNI" onChange={(evento) => {
            alBuscarProveedor(evento.target.value);
            actualizarCompra({ proveedorPersonaId: "" });
          }} />
      </label>
      <button className="compra-secundario" type="button" onClick={alAgregarProveedor}>+ Agregar proveedor</button>
      {proveedor && <p className="compra-campo-ancho compra-ayuda">{proveedor.tipoDocumento} {proveedor.numeroDocumento}</p>}
      {terminoProveedor && <div className="compra-campo-ancho compra-opciones" aria-label="Proveedores encontrados">
        {proveedoresEncontrados.length ? proveedoresEncontrados.map((item) => <button type="button" key={item.id} onClick={() => {
          actualizarCompra({ proveedorPersonaId: item.id });
          alBuscarProveedor("");
        }}><strong>{item.nombre}</strong><small>{item.tipoDocumento} {item.numeroDocumento}</small></button>)
          : <p className="compra-ayuda" role="status">No se encontró el proveedor.</p>}
      </div>}
    </div>
  </>;

  const detalle = <>
    {compra.modeloId && <div className="compra-modelo-edicion">
      <div className="compra-modelo-titulo"><strong>{nombreModelo(compra.modeloId)}</strong><button className="compra-quitar" type="button"
        aria-label={`Quitar ${nombreModelo(compra.modeloId)} del detalle en edición`} onClick={() => actualizarCompra({ modeloId: "", cantidad: "1", costoUnitario: "" })}>×</button></div>
      <div className="compra-campos compra-modelo-campos">
        <label>Cantidad<input type="number" min="1" max="2147483647" step="1" required value={compra.cantidad} onChange={(evento) => actualizarCompra({ cantidad: evento.target.value })} /></label>
        <label>Costo unitario (S/)<input type="number" min="0.01" step="0.01" required value={compra.costoUnitario} onChange={(evento) => actualizarCompra({ costoUnitario: evento.target.value })} /></label>
        <label>Cobertura de garantía<select value={compra.porcentajeGarantia} onChange={(evento) => actualizarCompra({ porcentajeGarantia: evento.target.value })}>
          <option value="70">70%</option><option value="80">80%</option>
        </select></label>
        <label>Garantía (meses)<input type="number" min="1" max="120" step="1" required value={compra.mesesGarantia} onChange={(evento) => actualizarCompra({ mesesGarantia: evento.target.value })} /></label>
      </div>
      <div className="compra-modelo-titulo">
        <button className="compra-secundario" type="button" onClick={alAgregarLinea}>Agregar modelo al detalle</button>
        <span className="compra-importe">Subtotal <strong>{importe(Number(compra.cantidad) * Number(compra.costoUnitario))}</strong></span>
      </div>
    </div>}
    {lineasAgregadas.length > 0 && <div className="compra-tabla-scroll" role="region" aria-label="Detalle de modelos" tabIndex={0}>
      <table className="compra-tabla" role="table" aria-label="Modelos agregados">
        <thead><tr><th scope="col">Modelo</th><th scope="col">Cantidad</th><th scope="col">Costo unitario</th><th scope="col">Garantía</th><th scope="col">Total de línea</th><th scope="col" aria-label="Acciones" /></tr></thead>
        <tbody>{lineasAgregadas.map((linea, indice) => <tr key={`${linea.modeloId}-${indice}`}>
          <td><strong>{nombreModelo(linea.modeloId)}</strong></td>
          <td data-campo="Cantidad">{linea.cantidad}</td>
          <td data-campo="Costo unitario" className="compra-importe">{importe(linea.costoUnitario)}</td>
          <td data-campo="Garantía">{linea.porcentajeGarantia}% · {linea.mesesGarantia} meses</td>
          <td data-campo="Total de línea" className="compra-importe"><strong>{importe(Number(linea.cantidad) * Number(linea.costoUnitario))}</strong></td>
          <td><button className="compra-quitar" type="button" aria-label={`Quitar ${nombreModelo(linea.modeloId)}`} onClick={() => alQuitarLinea(indice)}>×</button></td>
        </tr>)}</tbody>
      </table>
    </div>}
    {!lineas.length && <div className="venta-empty"><strong>Agrega el primer modelo</strong><span>Selecciona un modelo e indica su cantidad, costo y garantía.</span></div>}
  </>;

  return <CompraDocumento titulo={enRevision ? "Revisar compra de mototaxis" : "Nueva compra de mototaxis"} enRevision={enRevision}
    catalogo={catalogo} campos={campos} tituloDetalle="Modelos de la compra" conteoDetalle={`${cantidad} ${cantidad === 1 ? "unidad" : "unidades"}`} detalle={detalle}
    pie={<CompraPie total={totalCompra} observacion={compra.observacion} alObservar={(observacion) => actualizarCompra({ observacion })}
      pagos={pagos} alCambiarPagos={setPagos} alAgregarPago={() => setPagos((filas) => [...filas, { clave: crypto.randomUUID(), cuentaFinancieraId: "", medioPago: "", importe: "" }])}
      alQuitarPago={(clave) => setPagos((filas) => filas.filter((fila) => fila.clave !== clave))}
      alCancelar={alCancelar} alEditar={alEditar} guardando={guardando} tieneDetalle={lineas.length > 0} enRevision={enRevision}
      modalidadPago="Pago al contado" />}
    revision={<CompraRevision proveedor={<>{proveedor?.nombre ?? "Sin proveedor seleccionado"}{proveedor && <small>{proveedor.tipoDocumento} {proveedor.numeroDocumento}</small>}</>}
      fecha={compra.fecha} documento={<>{tituloDocumento}{compra.documentoNumero && <small>{compra.documentoNumero}</small>}</>} observacion={compra.observacion}
      detalle={<div className="compra-revision-lineas">{lineas.map((item, indice) => <article key={`${item.modeloId}-${indice}`}>
        <div><strong>{nombreModelo(item.modeloId)}</strong><small>{item.cantidad} × {importe(item.costoUnitario)} · Garantía {item.porcentajeGarantia}% por {item.mesesGarantia} meses</small></div>
        <strong className="compra-importe">{importe(Number(item.cantidad) * Number(item.costoUnitario))}</strong>
      </article>)}</div>}
    />} onSubmit={onSubmit}
  />;
}
