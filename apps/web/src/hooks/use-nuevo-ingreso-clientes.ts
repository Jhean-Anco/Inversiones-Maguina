import { useRef, useState } from "react";
import { servicioIngresos, type ClienteRegistrado, type DatosClienteNuevo } from "../services/ingresos.service";

type ValorNubefact = string | number | boolean | null;

type UseNuevoIngresoClientesProps = {
  actualizarCampoNubefact: (clave: string, valor: ValorNubefact) => void;
  setError: (mensaje: string) => void;
};

export function useNuevoIngresoClientes({ actualizarCampoNubefact, setError }: UseNuevoIngresoClientesProps) {
  const [busquedaCliente, cambiarBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteRegistrado[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteRegistrado | null>(null);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [registrandoCliente, setRegistrandoCliente] = useState(false);
  const consultaClientes = useRef(0);

  function setBusquedaCliente(valor: string) {
    ++consultaClientes.current;
    cambiarBusquedaCliente(valor);
    setClientesEncontrados([]);
    setBuscandoClientes(false);
  }

  async function buscarClientes(tipoDocumento: "01" | "06") {
    const texto = busquedaCliente.trim();
    const longitudRequerida = tipoDocumento === "01" ? 8 : 11;
    if (!new RegExp(`^\\d{${longitudRequerida}}$`).test(texto) || clienteSeleccionado) return null;

    const actual = ++consultaClientes.current;
    setClientesEncontrados([]);
    setBuscandoClientes(true);
    setError("");

    try {
      const data = await servicioIngresos.buscarClientes(texto);
      if (actual !== consultaClientes.current) return null;

      const filtrados = data.filter((cliente) => {
        const documentos = cliente.documentos?.length
          ? cliente.documentos
          : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
        return documentos.some((documento) => documento.tipoDocumento === tipoDocumento && documento.numeroDocumento.includes(texto));
      });

      setClientesEncontrados(filtrados);
      return filtrados;
    } catch (problema) {
      if (actual === consultaClientes.current) setError(problema instanceof Error ? problema.message : "No se pudo buscar clientes.");
      return null;
    } finally {
      if (actual === consultaClientes.current) setBuscandoClientes(false);
    }
  }

  function seleccionarDocumentoCliente(documento: { tipoDocumento: string; numeroDocumento: string }) {
    const tipo = ({ "01": "1", "06": "6", "04": "4", "07": "7" } as Record<string, string>)[documento.tipoDocumento] ?? "0";
    actualizarCampoNubefact("cliente_tipo_de_documento", tipo);
    actualizarCampoNubefact("cliente_numero_de_documento", documento.numeroDocumento);
  }

  function seleccionarCliente(cliente: ClienteRegistrado) {
    setClienteSeleccionado(cliente);
    setBusquedaCliente("");
    setClientesEncontrados([]);

    const nombre = cliente.razonSocial ?? [cliente.nombres, cliente.apellidoPaterno, cliente.apellidoMaterno].filter(Boolean).join(" ");
    const identificadores = cliente.documentos?.length
      ? cliente.documentos
      : [{ tipoDocumento: cliente.tipoDocumento, numeroDocumento: cliente.numeroDocumento }];
    const preferido = identificadores.find((item) => item.tipoDocumento === "01") ?? identificadores[0];
    seleccionarDocumentoCliente(preferido);
    actualizarCampoNubefact("cliente_denominacion", nombre);
    actualizarCampoNubefact("cliente_direccion", cliente.direccion ?? "");
  }

  function actualizarClienteEnResultados(cliente: ClienteRegistrado) {
    setClientesEncontrados((actuales) => actuales.map((item) => (item.id === cliente.id ? cliente : item)));
    if (clienteSeleccionado?.id === cliente.id) seleccionarCliente(cliente);
  }

  async function guardarCliente(datos: DatosClienteNuevo) {
    setRegistrandoCliente(true);
    setError("");
    try {
      const creado = await servicioIngresos.registrarCliente(datos);
      const encontrados = await servicioIngresos.buscarClientes(datos.numeroDocumento);
      const cliente = encontrados.find((item) => item.id === creado.id);
      if (!cliente) throw new Error("Cliente registrado, pero no se pudo cargar para esta venta. Búscalo por su documento.");
      seleccionarCliente(cliente);
      return true;
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No se pudo registrar el cliente.");
      return false;
    } finally {
      setRegistrandoCliente(false);
    }
  }

  function quitarCliente() {
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    actualizarCampoNubefact("cliente_tipo_de_documento", "0");
    actualizarCampoNubefact("cliente_numero_de_documento", "");
    actualizarCampoNubefact("cliente_denominacion", "");
    actualizarCampoNubefact("cliente_direccion", "");
  }

  return {
    busquedaCliente,
    setBusquedaCliente,
    buscarClientes,
    clientesEncontrados,
    buscandoClientes,
    registrandoCliente,
    clienteSeleccionado,
    seleccionarDocumentoCliente,
    seleccionarCliente,
    actualizarClienteEnResultados,
    guardarCliente,
    quitarCliente,
  };
}
