import { ChevronDown, Search, UserPlus, X } from "lucide-react";
import type { useEntradasStock } from "../../hooks/use-entradas-stock";

const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "P";

/** Proveedor de la compra con la base `os-*`: buscador por documento, resultados, alta rápida y proveedor fijado. */
export function ProveedorCompra({ modulo }: { modulo: ReturnType<typeof useEntradasStock> }) {
  const {
    tipoDocumento, proveedor, proveedorTipoDocumento, proveedorTipoPersona, proveedorNumeroDocumento, proveedorDireccion,
    setProveedor, setProveedorTipoDocumento, setProveedorTipoPersona, setProveedorNumeroDocumento, setProveedorDireccion,
    proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, creandoProveedor,
    setDatosProveedorEditables, buscarProveedor, abrirRegistroProveedor, crearProveedor, seleccionarProveedor, limpiarProveedor,
  } = modulo;
  const extranjero = proveedorTipoDocumento === "EXT";
  const dni = proveedorTipoDocumento === "DNI";
  const longitudDocumento = extranjero ? 100 : dni ? 8 : 11;
  const fijado = Boolean(proveedor.trim()) && !datosProveedorEditables && proveedoresEncontrados.length === 0;

  function actualizarTipoPersona(tipo: string, numero: string) {
    if (tipo === "EXT") setProveedorTipoPersona(proveedorTipoPersona || "JURIDICA");
    else if (tipo === "DNI" || (tipo === "RUC" && /^(10|15)/.test(numero))) setProveedorTipoPersona("NATURAL");
    else if (tipo === "RUC" && numero.startsWith("20")) setProveedorTipoPersona("JURIDICA");
    else setProveedorTipoPersona("");
  }

  if (fijado) return <div className="os-cliente">
    <span className="os-etiqueta">Proveedor *</span>
    <div className="os-cliente-fijo es-editable">
      <span className="os-avatar" aria-hidden="true">{iniciales(proveedor)}</span>
      <div className="os-cliente-datos">
        <strong>{proveedor}</strong>
        {proveedorNumeroDocumento && <span>{proveedorTipoDocumento} {proveedorNumeroDocumento}</span>}
        {proveedorDireccion.trim() && <span>{proveedorDireccion}</span>}
      </div>
      <button className="os-cliente-cambiar" type="button" aria-label="Cambiar proveedor" title="Cambiar proveedor" onClick={limpiarProveedor}><X aria-hidden="true" size={18} /></button>
    </div>
  </div>;

  return <div className="os-cliente">
    <label className="os-etiqueta" htmlFor="compra-proveedor-documento">Proveedor *</label>
    <div className="os-cliente-buscador">
      <div className="os-cliente-fila">
        <span className="os-select compra-tipo-identificacion">
          <select aria-label="Tipo de identificación del proveedor" value={proveedorTipoDocumento} required onChange={(evento) => {
            const tipo = evento.target.value;
            setProveedorTipoDocumento(tipo);
            setDatosProveedorEditables(false);
            actualizarTipoPersona(tipo, proveedorNumeroDocumento);
          }}>
            <option value="">Documento</option>
            <option value="RUC">RUC</option>
            <option value="DNI" disabled={tipoDocumento === "FACTURA"}>DNI</option>
            <option value="EXT">Extranjero</option>
          </select>
          <ChevronDown aria-hidden="true" size={16} />
        </span>
        <input id="compra-proveedor-documento" type="text" autoComplete="off" disabled={buscandoProveedores} inputMode={extranjero ? "text" : "numeric"}
          pattern={dni ? "[0-9]{8}" : extranjero ? "[A-Za-z0-9][A-Za-z0-9 .\\/\\-]{0,99}" : proveedorTipoDocumento === "RUC" ? "[0-9]{11}" : "[0-9]{8,11}"}
          value={proveedorNumeroDocumento} maxLength={longitudDocumento} required
          placeholder={dni ? "Ingresa DNI (8 dígitos)" : extranjero ? "Pasaporte o identificación" : "Ingresa RUC (11 dígitos)"}
          aria-label="Número de documento del proveedor"
          onKeyDown={(evento) => { if (evento.key === "Enter") { evento.preventDefault(); void buscarProveedor(); } }}
          onChange={(evento) => {
            const numero = (extranjero ? evento.target.value.replace(/[^A-Za-z0-9 ./-]/g, "") : evento.target.value.replace(/\D/g, "")).slice(0, longitudDocumento);
            setProveedorNumeroDocumento(numero);
            setDatosProveedorEditables(false);
            if (!extranjero) actualizarTipoPersona(proveedorTipoDocumento, numero);
          }} />
        <button className="os-boton-oscuro" type="button" disabled={buscandoProveedores} onClick={() => void buscarProveedor()}><Search aria-hidden="true" size={16} strokeWidth={2} />{buscandoProveedores ? "Buscando…" : "Buscar proveedor"}</button>
        <button className="os-boton-icono" type="button" aria-label="Agregar proveedor" title="Agregar proveedor" disabled={buscandoProveedores || proveedoresEncontrados.length > 0} onClick={() => void abrirRegistroProveedor()}><UserPlus aria-hidden="true" size={20} strokeWidth={1.9} /></button>
      </div>
      {proveedoresEncontrados.length > 0 && <ul className="os-cliente-resultados" aria-label="Proveedores encontrados">
        {proveedoresEncontrados.map((entrada) => <li key={entrada.id}><button type="button" onClick={() => seleccionarProveedor(entrada)}>
          <strong>{entrada.nombre}</strong>
          <small>{entrada.tipoDocumento === "01" ? "DNI" : entrada.tipoDocumento === "06" ? "RUC" : entrada.tipoDocumento} · {entrada.numeroDocumento}</small>
        </button></li>)}
      </ul>}
      {proveedorNoEncontrado && !datosProveedorEditables && <div className="os-resultados-estado"><strong>No encontramos este proveedor</strong><span>Regístralo con los datos del comprobante.</span>
        <button className="os-crear-repuesto" type="button" onClick={() => void abrirRegistroProveedor()}><UserPlus aria-hidden="true" size={16} />Registrar proveedor «{proveedorNumeroDocumento}»</button>
      </div>}
    </div>
    {datosProveedorEditables && <div className="os-campos compra-rep-proveedor-datos">
      <label className="os-campo">Nombre o razón social *
        <input value={proveedor} onChange={(evento) => setProveedor(evento.target.value)} maxLength={180} placeholder="Como aparece en el documento" required />
      </label>
      <label className="os-campo"><span>Dirección <em className="os-opcional">Opcional</em></span>
        <input value={proveedorDireccion} onChange={(evento) => setProveedorDireccion(evento.target.value)} maxLength={250} placeholder="Como figura en el comprobante" />
      </label>
      {creandoProveedor && <button className="os-boton-oscuro compra-registrar-proveedor" type="button" onClick={() => void crearProveedor()}><UserPlus aria-hidden="true" size={16} />Registrar proveedor</button>}
    </div>}
  </div>;
}
