import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import type { ClienteRegistrado, DatosClienteNuevo } from "../../services/ingresos.service";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { useNuevoIngresoClienteForm } from "./use-nuevo-ingreso-cliente-form";
import { Eye, Search, UserPlus, X } from "lucide-react";

type Props = {
  venta: ReturnType<typeof useNuevoIngreso>;
  formulario: ReturnType<typeof useNuevoIngresoClienteForm>;
  esFactura: boolean;
  nombreCliente: string;
  numeroDocumento: string;
  tipoDocumento: string;
  intentoIdentificacion: boolean;
  identificacionFacturaPendiente: boolean;
  identificacionBoletaPendiente: boolean;
  onVerDetalle: (cliente: ClienteRegistrado) => void;
};

export function SelectorClienteVenta({ venta, formulario, esFactura, nombreCliente, numeroDocumento, tipoDocumento, intentoIdentificacion, identificacionFacturaPendiente, identificacionBoletaPendiente, onVerDetalle }: Props) {
  const {
    setModoCliente, tipoDocumentoBusqueda, busquedaClienteEjecutada, errorBusquedaCliente,
    mostrarRegistroCliente, setMostrarRegistroCliente, tipoDocumentoNuevo, setTipoDocumentoNuevo,
    numeroDocumentoNuevo, setNumeroDocumentoNuevo, nombresNuevo, setNombresNuevo,
    apellidoPaternoNuevo, setApellidoPaternoNuevo, apellidoMaternoNuevo, setApellidoMaternoNuevo,
    razonSocialNueva, direccionNueva, errorRegistroCliente, buscandoIdentidadNueva, identidadNuevaConsultada, setIdentidadNuevaConsultada,
    personaJuridicaNueva, documentoNuevoValido, longitudDocumentoBusqueda, busquedaSinResultados,
    ejecutarBusquedaCliente, abrirRegistroCliente, consultarIdentidadNueva, guardarClienteNuevo,
    cambiarTipoDocumentoBusqueda, cambiarBusquedaDocumento,
  } = formulario;
  const clienteSeleccionado = venta.clienteSeleccionado;

  const nombreRegistrado = (cliente: ClienteRegistrado) => cliente.nombreComercial ?? cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
  const iniciales = (nombre: string) => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((palabra) => palabra[0]).join("").toLocaleUpperCase("es-PE");
  const direccion = String(venta.camposNubefact.cliente_direccion ?? "").trim();

  return <div className="os-cliente">
    <label className="os-etiqueta" htmlFor="venta-buscar-cliente">{venta.tipoComprobante !== "BOLETA" ? "Cliente *" : "Cliente"}</label>
      {clienteSeleccionado ? <div className="os-cliente-fijo es-editable">
        <span className="os-avatar" aria-hidden="true">{iniciales(nombreCliente)}</span>
        <div className="os-cliente-datos">
          <strong>{nombreCliente}</strong>
          <span>{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"} {numeroDocumento}</span>
          {direccion && <span>{direccion}</span>}
        </div>
        <button className="os-cliente-cambiar" type="button" aria-label="Ver detalle del cliente seleccionado" title="Ver detalle del cliente" onClick={() => onVerDetalle(clienteSeleccionado)}><Eye aria-hidden="true" size={18} /></button>
        <button className="os-cliente-cambiar" type="button" aria-label="Cambiar cliente" title="Cambiar cliente" onClick={() => venta.quitarCliente()}><X aria-hidden="true" size={18} /></button>
      </div> : <div className="os-cliente-buscador">
        <div className="os-cliente-fila">
          <select aria-label="Tipo de documento para buscar" value={esFactura ? "06" : tipoDocumentoBusqueda} onChange={(event) => cambiarTipoDocumentoBusqueda(event.target.value as "01" | "06")}><option value="06">RUC</option>{!esFactura && <option value="01">DNI</option>}</select>
          <input id="venta-buscar-cliente" inputMode="numeric" maxLength={longitudDocumentoBusqueda} value={venta.busquedaCliente} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setModoCliente("buscar"); setMostrarRegistroCliente(false); void ejecutarBusquedaCliente(); } }} onChange={(event) => cambiarBusquedaDocumento(event.target.value)} placeholder={`Ingresa ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}`} autoComplete="off" aria-label={`Número de ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}`} />
          <button type="button" className="os-boton-oscuro" disabled={venta.buscandoClientes} onClick={() => { setModoCliente("buscar"); setMostrarRegistroCliente(false); void ejecutarBusquedaCliente(); }}><Search aria-hidden="true" size={16} strokeWidth={2} />{venta.buscandoClientes ? "Buscando…" : "Buscar cliente"}</button>
          <button type="button" className="os-boton-icono" aria-label="Crear cliente" title={busquedaSinResultados ? "Crear cliente" : "Busca primero el documento para crear el cliente"} disabled={!busquedaSinResultados} onClick={abrirRegistroCliente}><UserPlus aria-hidden="true" size={20} strokeWidth={1.9} /></button>
        </div>
        {busquedaClienteEjecutada === venta.busquedaCliente.trim() && venta.clientesEncontrados.length > 0 && <ul className="os-cliente-resultados" aria-label="Resultados de clientes">
          {venta.clientesEncontrados.map((cliente) => <li key={cliente.id}><button type="button" onClick={() => formulario.seleccionarCliente(cliente)}><strong>{nombreRegistrado(cliente)}</strong><small>{(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((documento) => `${documento.tipoDocumento === "06" ? "RUC" : documento.tipoDocumento === "01" ? "DNI" : documento.tipoDocumento} ${documento.numeroDocumento}`).join(" · ")}</small></button></li>)}
        </ul>}
        {errorBusquedaCliente && <NotificacionFlotante mensaje={errorBusquedaCliente} />}
        {mostrarRegistroCliente && (
          <Dialogo
            titulo="Registrar cliente"
            subtitulo={`Ya se buscó el ${tipoDocumentoNuevo} ${numeroDocumentoNuevo} y no hubo coincidencias.`}
            ancho="md"
            cerrable={!venta.registrandoCliente}
            onCerrar={() => setMostrarRegistroCliente(false)}
            pie={
              <button type="button" className="erp-btn erp-btn--primary erp-btn--lg max-sm:w-full" disabled={venta.registrandoCliente || !documentoNuevoValido} onClick={() => void guardarClienteNuevo()}>
                {venta.registrandoCliente ? "Guardando cliente…" : "Guardar y usar en esta venta"}
              </button>
            }
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Documento<select className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={tipoDocumentoNuevo} onChange={(event) => { setTipoDocumentoNuevo(event.target.value as DatosClienteNuevo["tipoDocumento"]); setIdentidadNuevaConsultada(false); }}><option value="DNI">DNI</option><option value="RUC">RUC</option><option value="CE">Carné de extranjería</option><option value="PASAPORTE">Pasaporte</option></select></label>
              <label className="grid gap-1.5 text-xs font-bold text-[#52697d]">{tipoDocumentoNuevo}<span className="flex gap-2"><input className="h-11 min-w-0 flex-1 rounded-xl border border-[#c5d1db] px-3 text-sm" inputMode={tipoDocumentoNuevo === "PASAPORTE" || tipoDocumentoNuevo === "CE" ? "text" : "numeric"} value={numeroDocumentoNuevo} maxLength={tipoDocumentoNuevo === "DNI" ? 8 : tipoDocumentoNuevo === "RUC" ? 11 : 20} onChange={(event) => { setNumeroDocumentoNuevo(tipoDocumentoNuevo === "CE" || tipoDocumentoNuevo === "PASAPORTE" ? event.target.value : event.target.value.replace(/\D/g, "")); setIdentidadNuevaConsultada(false); }} />{(tipoDocumentoNuevo === "DNI" || tipoDocumentoNuevo === "RUC") && <button type="button" className="h-11 rounded-xl border border-[#c7d8e7] bg-[#f4f8fb] px-3 text-sm font-bold text-[#174f88] disabled:opacity-50" onClick={() => void consultarIdentidadNueva()} disabled={buscandoIdentidadNueva || !documentoNuevoValido}>{buscandoIdentidadNueva ? "Consultando…" : "Buscar"}</button>}</span></label>
              {personaJuridicaNueva ? <label className="grid gap-1.5 text-xs font-bold text-[#52697d] sm:col-span-2">Razón social<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={razonSocialNueva} onChange={(event) => formulario.setRazonSocialNueva(event.target.value)} maxLength={180} /></label> : <><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Nombres<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={nombresNuevo} onChange={(event) => setNombresNuevo(event.target.value)} maxLength={120} /></label><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Apellido paterno<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={apellidoPaternoNuevo} onChange={(event) => setApellidoPaternoNuevo(event.target.value)} maxLength={120} /></label><label className="grid gap-1.5 text-xs font-bold text-[#52697d]">Apellido materno<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={apellidoMaternoNuevo} onChange={(event) => setApellidoMaternoNuevo(event.target.value)} maxLength={120} /></label></>}
              <label className="grid gap-1.5 text-xs font-bold text-[#52697d] sm:col-span-2">Dirección fiscal<input className="h-11 rounded-xl border border-[#c5d1db] px-3 text-sm" value={direccionNueva} onChange={(event) => formulario.setDireccionNueva(event.target.value)} maxLength={240} /></label>
            </div>
            {identidadNuevaConsultada && <p className="clientes-identity-note sm:col-span-2">Datos completados desde la consulta de identidad. Revísalos antes de guardar.</p>}
            {errorRegistroCliente && <NotificacionFlotante mensaje={errorRegistroCliente} />}
          </Dialogo>
        )}
      </div>}
    {intentoIdentificacion && identificacionFacturaPendiente && <NotificacionFlotante titulo="Completa los datos fiscales del cliente" mensaje="La factura requiere un RUC válido, razón social y dirección fiscal. Razón social y dirección admiten hasta 100 caracteres." />}
    {intentoIdentificacion && identificacionBoletaPendiente && <NotificacionFlotante titulo="La boleta requiere identificar al comprador" mensaje="Busca o registra al comprador con su tipo y número de documento para continuar con una boleta superior a S/ 700." />}
  </div>;
}
