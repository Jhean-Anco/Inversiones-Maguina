
import type { useEntradasStock } from "../../../hooks/use-entradas-stock";

export function ProveedorCompraRepuestos({ modulo }: { modulo: ReturnType<typeof useEntradasStock> }) {
  const {
    tipoDocumento, proveedor, proveedorTipoDocumento, proveedorTipoPersona, proveedorNumeroDocumento, proveedorDireccion,
    setProveedor, setProveedorTipoDocumento, setProveedorTipoPersona, setProveedorNumeroDocumento, setProveedorDireccion,
    proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, creandoProveedor,
    setDatosProveedorEditables, buscarProveedor, abrirRegistroProveedor, crearProveedor, seleccionarProveedor,
  } = modulo;
  const sinDocumento = tipoDocumento === "SIN_DOCUMENTO";
  const extranjero = proveedorTipoDocumento === "EXT";
  const dni = proveedorTipoDocumento === "DNI";
  const longitudDocumento = extranjero ? 100 : dni ? 8 : 11;

  function actualizarTipoPersona(tipo: string, numero: string) {
    if (tipo === "EXT") setProveedorTipoPersona(proveedorTipoPersona || "JURIDICA");
    else if (tipo === "DNI" || (tipo === "RUC" && /^(10|15)/.test(numero))) setProveedorTipoPersona("NATURAL");
    else if (tipo === "RUC" && numero.startsWith("20")) setProveedorTipoPersona("JURIDICA");
    else setProveedorTipoPersona("");
  }

  return <div className="compra-campos compra-proveedor">
    <label>Tipo de identificación
      <select value={proveedorTipoDocumento} onChange={(evento) => {
        const tipo = evento.target.value;
        setProveedorTipoDocumento(tipo);
        setDatosProveedorEditables(false);
        actualizarTipoPersona(tipo, proveedorNumeroDocumento);
      }} required={!sinDocumento}>
        <option value="">Selecciona documento</option>
        <option value="RUC">RUC</option>
        <option value="DNI" disabled={tipoDocumento === "FACTURA"}>DNI</option>
        <option value="EXT">Documento extranjero</option>
      </select>
    </label>
    <label>{extranjero ? "Documento extranjero" : `${proveedorTipoDocumento || "RUC/DNI"} del proveedor`}
      <input type="text" disabled={buscandoProveedores} inputMode={extranjero ? "text" : "numeric"}
        pattern={dni ? "[0-9]{8}" : extranjero ? "[A-Za-z0-9][A-Za-z0-9 .\\/\\-]{0,99}" : proveedorTipoDocumento === "RUC" ? "[0-9]{11}" : "[0-9]{8,11}"}
        value={proveedorNumeroDocumento} maxLength={longitudDocumento}
        placeholder={dni ? "8 dígitos" : extranjero ? "Pasaporte o identificación" : "11 dígitos"}
        required={!sinDocumento}
        onChange={(evento) => {
          const numero = (extranjero ? evento.target.value.replace(/[^A-Za-z0-9 ./-]/g, "") : evento.target.value.replace(/\D/g, "")).slice(0, longitudDocumento);
          setProveedorNumeroDocumento(numero);
          setDatosProveedorEditables(false);
          if (!extranjero) actualizarTipoPersona(proveedorTipoDocumento, numero);
        }}
      />
    </label>
    <div className="compra-inline-actions">
      <button type="button" className="compra-secundario" disabled={buscandoProveedores || sinDocumento} onClick={() => void buscarProveedor()}>{buscandoProveedores ? "Buscando…" : "Buscar proveedor"}</button>
      <button type="button" className="compra-secundario" aria-label="Agregar proveedor" title="Agregar proveedor" disabled={buscandoProveedores || sinDocumento || proveedoresEncontrados.length > 0} onClick={() => void abrirRegistroProveedor()}>+</button>
    </div>
    {proveedorNoEncontrado && <p className="compra-campo-ancho compra-ayuda" role="status">No encontramos este proveedor. Usa el botón + para registrarlo.</p>}
    {proveedoresEncontrados.length > 0 && <div className="compra-opciones compra-campo-ancho" aria-label="Proveedores encontrados">
      {proveedoresEncontrados.map((entrada) => <button type="button" key={entrada.id} onClick={() => seleccionarProveedor(entrada)}>
        <strong>{entrada.nombre}</strong>
        <small>{entrada.tipoDocumento === "01" ? "DNI" : entrada.tipoDocumento === "06" ? "RUC" : entrada.tipoDocumento} {entrada.numeroDocumento}</small>
      </button>)}
    </div>}
    {datosProveedorEditables && <div className="compra-campos compra-datos-proveedor compra-campo-ancho">
      <label>Nombre o razón social del proveedor
        <input value={proveedor} onChange={(evento) => setProveedor(evento.target.value)} maxLength={180} placeholder="Como aparece en el documento" required={!sinDocumento} />
      </label>
      <label>Dirección del proveedor
        <input value={proveedorDireccion} onChange={(evento) => setProveedorDireccion(evento.target.value)} maxLength={250} placeholder="Como figura en el comprobante" />
      </label>
      {creandoProveedor && <button className="compra-secundario" type="button" onClick={() => void crearProveedor()}>Registrar proveedor</button>}
    </div>}
  </div>;
}
