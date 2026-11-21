import { useState, type Dispatch, type SetStateAction } from "react";
import { servicioIdentidad } from "../services/identidad.service";
import { servicioProveedores, type ProveedorRegistrado } from "../services/proveedores.service";

type IdentidadProveedor = Awaited<ReturnType<typeof servicioIdentidad.consultar>>;
type ManejarError = (problema: unknown, alternativa: string) => void;

export function useProveedorEntradaStock(setError: Dispatch<SetStateAction<string>>, manejarError: ManejarError) {
  const [proveedor, setProveedor] = useState("");
  const [proveedorTipoPersona, setProveedorTipoPersona] = useState("");
  const [proveedorTipoDocumento, setProveedorTipoDocumento] = useState("RUC");
  const [proveedorNumeroDocumento, setProveedorNumeroDocumento] = useState("");
  const [proveedorDireccion, setProveedorDireccion] = useState("");
  const [proveedoresEncontrados, setProveedoresEncontrados] = useState<ProveedorRegistrado[]>([]);
  const [buscandoProveedores, setBuscandoProveedores] = useState(false);
  const [proveedorNoEncontrado, setProveedorNoEncontrado] = useState(false);
  const [datosProveedorEditables, setDatosProveedorEditables] = useState(false);
  const [creandoProveedor, setCreandoProveedor] = useState(false);
  const [identidadProveedor, setIdentidadProveedor] = useState<IdentidadProveedor | null>(null);

  async function buscarProveedor() {
    const numero = proveedorNumeroDocumento.trim();
    const requerido = proveedorTipoDocumento === "DNI" ? 8 : proveedorTipoDocumento === "RUC" ? 11 : 1;
    if (numero.length < requerido || (proveedorTipoDocumento !== "EXT" && numero.length !== requerido)) {
      setError(proveedorTipoDocumento === "DNI" ? "Ingresa los 8 dígitos del DNI para buscar al proveedor." : proveedorTipoDocumento === "RUC" ? "Ingresa los 11 dígitos del RUC para buscar al proveedor." : "Ingresa el documento extranjero para buscar al proveedor.");
      setProveedoresEncontrados([]); setProveedorNoEncontrado(false); return;
    }
    setError(""); setBuscandoProveedores(true); setProveedoresEncontrados([]); setProveedorNoEncontrado(false); setIdentidadProveedor(null);
    try {
      const resultados = await servicioProveedores.listar(numero);
      const codigoDocumento = proveedorTipoDocumento === "DNI" ? "01" : proveedorTipoDocumento === "RUC" ? "06" : proveedorTipoDocumento;
      const coincidencias = resultados.filter((item) => item.numeroDocumento === numero && (item.tipoDocumento === proveedorTipoDocumento || item.tipoDocumento === codigoDocumento));
      setProveedoresEncontrados(coincidencias);
      setProveedorNoEncontrado(coincidencias.length === 0);
    } catch (problema) { manejarError(problema, "No se pudo buscar el proveedor en el directorio."); }
    finally { setBuscandoProveedores(false); }
  }

  async function abrirRegistroProveedor() {
    setDatosProveedorEditables(true); setCreandoProveedor(true); setProveedorNoEncontrado(false); setError(""); setIdentidadProveedor(null);
    if (proveedorTipoDocumento !== "DNI" && proveedorTipoDocumento !== "RUC") { setError("El directorio de proveedores permite registrar DNI o RUC."); return; }
    setBuscandoProveedores(true);
    try {
      const identidad = await servicioIdentidad.consultar(proveedorTipoDocumento, proveedorNumeroDocumento.trim());
      setIdentidadProveedor(identidad);
      setProveedor(identidad.razonSocial || [identidad.nombres, identidad.apellidoPaterno, identidad.apellidoMaterno].filter(Boolean).join(" "));
      setProveedorTipoPersona(identidad.tipoPersona);
      setProveedorDireccion(identidad.direccion ?? "");
    } catch (problema) { manejarError(problema, "No se pudieron consultar los datos del documento."); }
    finally { setBuscandoProveedores(false); }
  }

  async function crearProveedor() {
    const tipo = proveedorTipoDocumento;
    const numero = proveedorNumeroDocumento.trim();
    if ((tipo !== "DNI" && tipo !== "RUC") || !identidadProveedor) { setError("Busca los datos del proveedor antes de registrarlo."); return; }
    try {
      const creado = await servicioProveedores.crear({ tipoDocumento: tipo, numeroDocumento: numero,
        razonSocial: tipo === "RUC" && numero.startsWith("20") ? identidadProveedor.razonSocial || proveedor : undefined,
        nombres: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.nombres : undefined,
        apellidoPaterno: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.apellidoPaterno : undefined,
        apellidoMaterno: tipo === "DNI" || (tipo === "RUC" && !numero.startsWith("20")) ? identidadProveedor.apellidoMaterno : undefined,
      });
      setProveedor(creado.nombre); setProveedorTipoPersona(identidadProveedor.tipoPersona); setProveedorDireccion(identidadProveedor.direccion ?? "");
      setProveedoresEncontrados([creado]); setDatosProveedorEditables(false); setCreandoProveedor(false); setError("");
    } catch (problema) { manejarError(problema, "No se pudo registrar el proveedor en el directorio."); }
  }

  function seleccionarProveedor(entrada: ProveedorRegistrado) {
    const tipo = entrada.tipoDocumento === "01" ? "DNI" : entrada.tipoDocumento === "06" ? "RUC" : entrada.tipoDocumento;
    setProveedor(entrada.nombre || entrada.razonSocial || [entrada.nombres, entrada.apellidoPaterno, entrada.apellidoMaterno].filter(Boolean).join(" "));
    setProveedorTipoPersona(tipo === "DNI" || (tipo === "RUC" && !entrada.numeroDocumento.startsWith("20")) ? "NATURAL" : "JURIDICA");
    setProveedorTipoDocumento(tipo);
    setProveedorNumeroDocumento(entrada.numeroDocumento);
    setProveedorDireccion("");
    setIdentidadProveedor(null); setDatosProveedorEditables(true); setCreandoProveedor(false);
    setProveedoresEncontrados([]); setProveedorNoEncontrado(false); setError("");
  }

  function limpiarProveedor() {
    setProveedor(""); setProveedorTipoPersona(""); setProveedorTipoDocumento("RUC"); setProveedorNumeroDocumento(""); setProveedorDireccion("");
    setProveedoresEncontrados([]); setBuscandoProveedores(false); setProveedorNoEncontrado(false); setDatosProveedorEditables(false); setCreandoProveedor(false); setIdentidadProveedor(null);
  }

  return {
    proveedor, setProveedor, proveedorTipoPersona, setProveedorTipoPersona, proveedorTipoDocumento, setProveedorTipoDocumento,
    proveedorNumeroDocumento, setProveedorNumeroDocumento, proveedorDireccion, setProveedorDireccion,
    proveedoresEncontrados, buscandoProveedores, proveedorNoEncontrado, datosProveedorEditables, creandoProveedor,
    setDatosProveedorEditables, buscarProveedor, abrirRegistroProveedor, crearProveedor, seleccionarProveedor, limpiarProveedor,
  };
}
