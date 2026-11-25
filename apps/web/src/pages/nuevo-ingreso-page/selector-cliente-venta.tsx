import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { Dialogo } from "../../components/ui/dialogo/dialogo";
import type { ClienteRegistrado, DatosClienteNuevo } from "../../services/ingresos.service";
import { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";
import type { useNuevoIngresoClienteForm } from "./use-nuevo-ingreso-cliente-form";
import { formularioDocumentoClases as clases } from "../../components/documentos/formulario-documento-clases";

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
  const iconoDetalle = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></svg>;
  const direccion = String(venta.camposNubefact.cliente_direccion ?? "").trim();

  return <div className="flex flex-col gap-2">
    <label className={clases.etiquetaCampo} htmlFor="venta-buscar-cliente">Cliente</label>
      {clienteSeleccionado ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#c9e3d4] bg-[#f4faf6] px-4 py-3">
        <div className="grid min-w-0 gap-0.5 [overflow-wrap:anywhere]"><strong className="text-sm font-semibold text-[#0b2545]">{nombreCliente}</strong><span className="text-xs text-[#52697d]">{tipoDocumento === "6" ? "RUC" : tipoDocumento === "1" ? "DNI" : "Documento"} {numeroDocumento}{direccion ? ` · ${direccion}` : ""}</span></div>
        <div className="flex flex-none gap-2"><button className={clases.botonIcono} type="button" aria-label="Ver detalle del cliente seleccionado" title="Ver detalle del cliente" onClick={() => onVerDetalle(clienteSeleccionado)}>{iconoDetalle}</button><button className={clases.botonSecundario} type="button" aria-label="Quitar cliente de la venta" title="Quitar cliente" onClick={() => venta.quitarCliente()}>Cambiar</button></div>
      </div> : <>
        <div className="flex flex-wrap gap-2.5">
          <select className={`${clases.campo} !w-[116px] flex-none`} aria-label="Tipo de documento para buscar" value={esFactura ? "06" : tipoDocumentoBusqueda} onChange={(event) => cambiarTipoDocumentoBusqueda(event.target.value as "01" | "06")}><option value="06">RUC</option>{!esFactura && <option value="01">DNI</option>}</select>
          <input className={`${clases.campo} !w-auto min-w-[200px] flex-[1_1_220px]`} id="venta-buscar-cliente" inputMode="numeric" maxLength={longitudDocumentoBusqueda} value={venta.busquedaCliente} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} onChange={(event) => cambiarBusquedaDocumento(event.target.value)} placeholder={`Ingresa ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}`} autoComplete="off" aria-describedby={errorBusquedaCliente ? "venta-busqueda-cliente-error" : undefined} />
          <button type="button" className={clases.botonOscuro} disabled={venta.buscandoClientes} onClick={() => { setModoCliente("buscar"); setMostrarRegistroCliente(false); void ejecutarBusquedaCliente(); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>{venta.buscandoClientes ? "Buscando…" : "Buscar cliente"}
          </button>
          <button type="button" className={clases.botonIcono} aria-label="Crear cliente" title="Crear cliente" disabled={!busquedaSinResultados} onClick={abrirRegistroCliente}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M15.5 20v-1.4a4.1 4.1 0 0 0-4.1-4.1H6.6a4.1 4.1 0 0 0-4.1 4.1V20M9 10.6a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM19 8v7m-3.5-3.5h7" /></svg>
          </button>
        </div>
        {busquedaClienteEjecutada === venta.busquedaCliente.trim() && venta.clientesEncontrados.length > 0 && <ul aria-label="Resultados de clientes" className="m-0 flex list-none flex-col gap-0.5 rounded-xl border border-[#dbe3e9] bg-white p-1.5 shadow-[0_10px_26px_rgba(15,42,66,.1)]">
          {venta.clientesEncontrados.map((cliente) => <li className="flex items-center gap-1" key={cliente.id}><button className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 text-left [overflow-wrap:anywhere] hover:bg-[#eef4fa]" type="button" onClick={() => formulario.seleccionarCliente(cliente)}><strong className="text-sm font-semibold text-[#0b2545]">{nombreRegistrado(cliente)}</strong><span className="text-xs text-[#52697d]">{(cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }]).map((documento) => `${documento.tipoDocumento === "06" ? "RUC" : documento.tipoDocumento === "01" ? "DNI" : documento.tipoDocumento} ${documento.numeroDocumento}`).join(" · ")}</span></button><button className="grid h-10 w-10 flex-none place-items-center rounded-lg text-[#174b78] hover:bg-[#eef4fa]" type="button" aria-label={`Ver detalle de ${cliente.nombreComercial ?? cliente.razonSocial ?? cliente.numeroDocumento}`} title="Ver detalle del cliente" onClick={() => onVerDetalle(cliente)}>{iconoDetalle}</button></li>)}
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
              <button type="button" className="min-h-11 rounded-xl border border-[#b91e30] bg-gradient-to-br from-[#d92c40] to-[#bb1d30] px-5 text-sm font-bold text-white disabled:opacity-60 max-sm:w-full" disabled={venta.registrandoCliente || !documentoNuevoValido} onClick={() => void guardarClienteNuevo()}>
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
      </>}
    {intentoIdentificacion && identificacionFacturaPendiente && <NotificacionFlotante titulo="Completa los datos fiscales del cliente" mensaje="La factura requiere un RUC válido, razón social y dirección fiscal. Razón social y dirección admiten hasta 100 caracteres." />}
    {intentoIdentificacion && identificacionBoletaPendiente && <NotificacionFlotante titulo="La boleta requiere identificar al comprador" mensaje="Busca o registra al comprador con su tipo y número de documento para continuar con una boleta superior a S/ 700." />}
  </div>;
}
