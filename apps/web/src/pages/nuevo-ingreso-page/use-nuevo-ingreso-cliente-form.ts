import { useState } from "react";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";
import type { useNuevoIngreso } from "../../hooks/use-nuevo-ingreso";

type VentaCliente = Pick<ReturnType<typeof useNuevoIngreso>, "buscarClientes" | "quitarCliente" | "setBusquedaCliente" | "guardarCliente" | "seleccionarCliente" | "seleccionarDocumentoCliente" | "busquedaCliente" | "buscandoClientes" | "clientesEncontrados">;

export function useNuevoIngresoClienteForm(venta: VentaCliente) {
  const [modoCliente, setModoCliente] = useState<"buscar" | "nuevo">("buscar");
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"01" | "06">("01");
  const [busquedaClienteEjecutada, setBusquedaClienteEjecutada] = useState("");
  const [errorBusquedaCliente, setErrorBusquedaCliente] = useState("");
  const [mostrarNotificacionSinCliente, setMostrarNotificacionSinCliente] = useState(false);
  const [mostrarRegistroCliente, setMostrarRegistroCliente] = useState(false);
  const [tipoDocumentoNuevo, setTipoDocumentoNuevo] = useState<DatosClienteNuevo["tipoDocumento"]>("DNI");
  const [numeroDocumentoNuevo, setNumeroDocumentoNuevo] = useState("");
  const [nombresNuevo, setNombresNuevo] = useState("");
  const [apellidoPaternoNuevo, setApellidoPaternoNuevo] = useState("");
  const [apellidoMaternoNuevo, setApellidoMaternoNuevo] = useState("");
  const [razonSocialNueva, setRazonSocialNueva] = useState("");
  const [direccionNueva, setDireccionNueva] = useState("");
  const [errorRegistroCliente, setErrorRegistroCliente] = useState("");
  const [buscandoIdentidadNueva, setBuscandoIdentidadNueva] = useState(false);

  const longitudDocumentoBusqueda = tipoDocumentoBusqueda === "01" ? 8 : 11;
  const busquedaSinResultados = busquedaClienteEjecutada === venta.busquedaCliente.trim()
    && venta.busquedaCliente.trim().length === longitudDocumentoBusqueda
    && !venta.buscandoClientes
    && venta.clientesEncontrados.length === 0;
  const personaJuridicaNueva = tipoDocumentoNuevo === "RUC" && numeroDocumentoNuevo.startsWith("20");
  const documentoNuevoValido = tipoDocumentoNuevo === "DNI"
    ? numeroDocumentoNuevo.length === 8
    : tipoDocumentoNuevo === "RUC"
      ? numeroDocumentoNuevo.length === 11
      : numeroDocumentoNuevo.trim().length > 0;

  async function ejecutarBusquedaCliente() {
    const consulta = venta.busquedaCliente.trim();
    setBusquedaClienteEjecutada("");
    setMostrarNotificacionSinCliente(false);
    if (!new RegExp(`^\\d{${longitudDocumentoBusqueda}}$`).test(consulta)) {
      setErrorBusquedaCliente(`Ingresa ${longitudDocumentoBusqueda} dígitos para buscar por ${tipoDocumentoBusqueda === "01" ? "DNI" : "RUC"}.`);
      return;
    }
    setErrorBusquedaCliente("");
    const resultados = await venta.buscarClientes(tipoDocumentoBusqueda);
    if (resultados !== null) {
      setBusquedaClienteEjecutada(consulta);
      setMostrarNotificacionSinCliente(resultados.length === 0);
    }
  }

  function abrirRegistroCliente() {
    const documentoBuscado = venta.busquedaCliente.trim();
    setTipoDocumentoNuevo(tipoDocumentoBusqueda === "01" ? "DNI" : "RUC");
    setModoCliente("nuevo");
    venta.quitarCliente();
    setMostrarRegistroCliente(true);
    setErrorRegistroCliente("");
    if (/^\d+$/.test(documentoBuscado)) setNumeroDocumentoNuevo(documentoBuscado);
    venta.setBusquedaCliente("");
  }

  async function consultarIdentidadNueva() {
    if (tipoDocumentoNuevo !== "DNI" && tipoDocumentoNuevo !== "RUC") return;
    setBuscandoIdentidadNueva(true);
    setErrorRegistroCliente("");
    try {
      const identidad = await servicioIngresos.consultarIdentidadCliente(tipoDocumentoNuevo, numeroDocumentoNuevo.trim());
      if (identidad.tipoPersona === "JURIDICA") setRazonSocialNueva(identidad.razonSocial ?? "");
      else {
        setNombresNuevo(identidad.nombres ?? "");
        setApellidoPaternoNuevo(identidad.apellidoPaterno ?? "");
        setApellidoMaternoNuevo(identidad.apellidoMaterno ?? "");
      }
      setDireccionNueva(identidad.direccion ?? "");
    } catch (problema) {
      setErrorRegistroCliente(problema instanceof Error ? problema.message : "No se pudo consultar el documento en APIS Perú.");
    } finally {
      setBuscandoIdentidadNueva(false);
    }
  }

  async function guardarClienteNuevo() {
    const payload: DatosClienteNuevo = {
      tipoDocumento: tipoDocumentoNuevo,
      numeroDocumento: numeroDocumentoNuevo.trim(),
      ...(personaJuridicaNueva
        ? { razonSocial: razonSocialNueva.trim() }
        : { nombres: nombresNuevo.trim(), apellidoPaterno: apellidoPaternoNuevo.trim(), apellidoMaterno: apellidoMaternoNuevo.trim() }),
      direccion: direccionNueva.trim(),
    };
    const guardado = await venta.guardarCliente(payload);
    if (guardado) setMostrarRegistroCliente(false);
  }

  function seleccionarCliente(cliente: ClienteRegistrado) {
    const consulta = venta.busquedaCliente.trim();
    const documentos = cliente.documentos?.length ? cliente.documentos : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
    const documento = documentos.find((item) => item.tipoDocumento === tipoDocumentoBusqueda && item.numeroDocumento.includes(consulta)) ?? documentos[0];
    venta.seleccionarCliente(cliente);
    if (documento) venta.seleccionarDocumentoCliente(documento);
    setModoCliente("buscar");
    setMostrarRegistroCliente(false);
  }

  function cambiarTipoDocumentoBusqueda(tipo: "01" | "06") {
    setTipoDocumentoBusqueda(tipo);
    venta.setBusquedaCliente("");
    setBusquedaClienteEjecutada("");
    setErrorBusquedaCliente("");
    setMostrarNotificacionSinCliente(false);
  }

  function cambiarBusquedaDocumento(valor: string) {
    venta.setBusquedaCliente(valor.replace(/\D/g, "").slice(0, longitudDocumentoBusqueda));
    setBusquedaClienteEjecutada("");
    setErrorBusquedaCliente("");
    setMostrarNotificacionSinCliente(false);
    setMostrarRegistroCliente(false);
  }

  function limpiarFormularioCliente() {
    setMostrarRegistroCliente(false);
    setModoCliente("buscar");
  }

  return {
    modoCliente, setModoCliente, tipoDocumentoBusqueda, setTipoDocumentoBusqueda,
    busquedaClienteEjecutada, setBusquedaClienteEjecutada, errorBusquedaCliente,
    setErrorBusquedaCliente, mostrarNotificacionSinCliente, setMostrarNotificacionSinCliente,
    mostrarRegistroCliente, setMostrarRegistroCliente, tipoDocumentoNuevo, setTipoDocumentoNuevo,
    numeroDocumentoNuevo, setNumeroDocumentoNuevo, nombresNuevo, setNombresNuevo,
    apellidoPaternoNuevo, setApellidoPaternoNuevo, apellidoMaternoNuevo, setApellidoMaternoNuevo,
    razonSocialNueva, setRazonSocialNueva, direccionNueva, setDireccionNueva,
    errorRegistroCliente, setErrorRegistroCliente, buscandoIdentidadNueva,
    personaJuridicaNueva, documentoNuevoValido, longitudDocumentoBusqueda, busquedaSinResultados,
    ejecutarBusquedaCliente, abrirRegistroCliente, consultarIdentidadNueva, guardarClienteNuevo, seleccionarCliente,
    cambiarTipoDocumentoBusqueda, cambiarBusquedaDocumento, limpiarFormularioCliente,
  };
}
