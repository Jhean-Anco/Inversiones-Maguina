import { useState, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";

type UseOrdenServicioClientesProps = {
  setError: Dispatch<SetStateAction<string>>;
};

function nombreCliente(cliente: ClienteRegistrado) {
  return cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
}

export function useOrdenServicioClientes({ setError }: UseOrdenServicioClientesProps) {
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteConsultado, setClienteConsultado] = useState("");
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"DNI" | "RUC" | "NOMBRE">("DNI");
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cliente, setCliente] = useState<ClienteRegistrado | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);

  function limpiarBusqueda() {
    setCliente(null);
    setClienteBusqueda("");
    setClienteConsultado("");
    setClientes([]);
    setTipoDocumentoBusqueda("DNI");
    setMostrarFormularioCliente(false);
  }

  function prepararEdicion(nombre: string) {
    setCliente(null);
    setClienteBusqueda(nombre);
    setClienteConsultado("");
    setClientes([]);
    setMostrarFormularioCliente(false);
  }

  function seleccionarCliente(seleccionado: ClienteRegistrado | null) {
    setCliente(seleccionado);
    if (seleccionado) setClienteBusqueda(nombreCliente(seleccionado));
    setClientes([]);
  }

  function cambiarTipoDocumento(tipo: "DNI" | "RUC" | "NOMBRE") {
    setTipoDocumentoBusqueda(tipo);
    setClienteBusqueda("");
    setClienteConsultado("");
    setClientes([]);
  }

  function cambiarBusqueda(valor: string) {
    setClienteBusqueda(tipoDocumentoBusqueda === "NOMBRE" ? valor : valor.replace(/\D/g, ""));
    setClienteConsultado("");
    setClientes([]);
  }

  async function buscarCliente() {
    const consulta = clienteBusqueda.trim();
    if (buscandoClientes) return;
    if (consulta.length < 2) {
      setError("Ingresa al menos dos caracteres para buscar al cliente.");
      return;
    }
    setBuscandoClientes(true);
    setClientes([]);
    setClienteConsultado("");
    setError("");
    try {
      setClientes(await servicioIngresos.buscarClientes(consulta));
      setClienteConsultado(consulta);
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo buscar el cliente.");
    } finally {
      setBuscandoClientes(false);
    }
  }

  function manejarEnterCliente(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") {
      evento.preventDefault();
      void buscarCliente();
    }
  }

  async function registrarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const coincidencias = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const nuevoCliente = coincidencias.find((item) => item.id === creado.id)
        ?? coincidencias.find((item) => item.numeroDocumento === datos.numeroDocumento);
      if (!nuevoCliente) return "El cliente se registró, pero no se pudo cargar en la orden. Vuelve a buscarlo por su documento.";
      seleccionarCliente(nuevoCliente);
      setMostrarFormularioCliente(false);
      return null;
    } catch (problema) {
      return problema instanceof Error ? problema.message : "No se pudo registrar el cliente.";
    }
  }

  return {
    clienteBusqueda,
    clienteConsultado,
    buscandoClientes,
    tipoDocumentoBusqueda,
    clientes,
    cliente,
    mostrarFormularioCliente,
    setMostrarFormularioCliente,
    limpiarBusqueda,
    prepararEdicion,
    seleccionarCliente,
    cambiarTipoDocumento,
    cambiarBusqueda,
    buscarCliente,
    manejarEnterCliente,
    registrarCliente,
  };
}
