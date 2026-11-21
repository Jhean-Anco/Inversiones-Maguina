import { useState, type KeyboardEvent } from "react";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../../services/ingresos.service";

type UseGestionClienteProps = {
  setError: (mensaje: string) => void;
  nombreCliente: (cliente: ClienteRegistrado) => string;
};

export function useGestionCliente({ setError, nombreCliente }: UseGestionClienteProps) {
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteBusquedaConsultada, setClienteBusquedaConsultada] = useState("");
  const [tipoDocumentoBusqueda, setTipoDocumentoBusqueda] = useState<"DNI" | "RUC" | "NOMBRE">("DNI");
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [clientes, setClientes] = useState<ClienteRegistrado[]>([]);
  const [cliente, setCliente] = useState<ClienteRegistrado | null>(null);
  const [mostrarFormularioCliente, setMostrarFormularioCliente] = useState(false);

  async function ejecutarBusquedaCliente() {
    const consulta = clienteBusqueda.trim();
    if (buscandoClientes) return;
    if (consulta.length < 2) { setError("Ingresa al menos dos caracteres para buscar al cliente."); return; }
    setBuscandoClientes(true); setClientes([]); setClienteBusquedaConsultada(""); setError("");
    try {
      const resultados = await servicioIngresos.buscarClientes(consulta);
      setClientes(resultados); setClienteBusquedaConsultada(consulta);
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo buscar el cliente."); }
    finally { setBuscandoClientes(false); }
  }

  async function registrarYSeleccionarCliente(datos: DatosClienteNuevo): Promise<string | null> {
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const coincidencias = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const nuevoCliente = coincidencias.find((item) => item.id === creado.id) ?? coincidencias.find((item) => item.numeroDocumento === datos.numeroDocumento);
      if (!nuevoCliente) return "El cliente se registró, pero no se pudo cargar en la cotización. Vuelve a buscarlo por su documento.";
      setCliente(nuevoCliente); setClienteBusqueda(nombreCliente(nuevoCliente)); setClientes([]); setMostrarFormularioCliente(false);
      return null;
    } catch (problema) { return problema instanceof Error ? problema.message : "No se pudo registrar el cliente."; }
  }

  function seleccionarClienteCotizacion(item: ClienteRegistrado) {
    setCliente(item); setClienteBusqueda(nombreCliente(item)); setClienteBusquedaConsultada(""); setClientes([]);
  }
  function limpiarClienteCotizacion() {
    setCliente(null); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setClientes([]);
  }
  function cambiarTipoDocumentoBusqueda(tipo: "DNI" | "RUC" | "NOMBRE") {
    setTipoDocumentoBusqueda(tipo); setClienteBusqueda(""); setClienteBusquedaConsultada(""); setClientes([]);
  }
  function cambiarBusquedaClienteCotizacion(valor: string) {
    setClienteBusqueda(tipoDocumentoBusqueda === "NOMBRE" ? valor : valor.replace(/\D/g, ""));
    setClienteBusquedaConsultada(""); setClientes([]);
  }
  function manejarEnterBusquedaCliente(evento: KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Enter") { evento.preventDefault(); void ejecutarBusquedaCliente(); }
  }

  return {
    cliente,
    setCliente,
    clienteBusqueda,
    setClienteBusqueda,
    clienteBusquedaConsultada,
    setClienteBusquedaConsultada,
    tipoDocumentoBusqueda,
    setTipoDocumentoBusqueda,
    cambiarTipoDocumentoBusqueda,
    cambiarBusquedaClienteCotizacion,
    buscandoClientes,
    clientes,
    setClientes,
    mostrarFormularioCliente,
    setMostrarFormularioCliente,
    ejecutarBusquedaCliente,
    registrarYSeleccionarCliente,
    seleccionarClienteCotizacion,
    limpiarClienteCotizacion,
    manejarEnterBusquedaCliente,
  };
}
