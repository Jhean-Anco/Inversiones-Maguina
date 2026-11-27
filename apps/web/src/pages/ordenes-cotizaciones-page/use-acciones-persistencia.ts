import { servicioIngresos, type ClienteRegistrado, type Cotizacion } from "../../services/ingresos.service";
import type { LineaGestion } from "./gestion-utils";

export type DatosPersistencia = {
  cliente: ClienteRegistrado | null;
  clienteInicialId: string | null;
  lineas: LineaGestion[];
  vigenteHasta: string;
  fechaEmision: string;
  codigoCotizacion: string | null;
  cotizacionId: string | null;
  errorConsultaSerie: boolean;
  observacion: string;
};
export type AccionesPersistencia = {
  setError: (mensaje: string) => void;
  setGuardando: (estado: boolean) => void;
  setConfirmarDescarte: (estado: boolean) => void;
  setMostrarFormulario: (estado: boolean) => void;
  cargar: () => Promise<void>;
  limpiarBorradorCotizacion: () => void;
};

export function useAccionesPersistencia({ datos, acciones }: { datos: DatosPersistencia; acciones: AccionesPersistencia }) {
  const { cliente, clienteInicialId, lineas, vigenteHasta, fechaEmision, codigoCotizacion, cotizacionId, errorConsultaSerie, observacion } = datos;
  const { setError, setGuardando, setConfirmarDescarte, setMostrarFormulario, cargar, limpiarBorradorCotizacion } = acciones;

  /** Revisa los datos sin guardar; muestra el primer problema encontrado. */
  function validarGestion(): boolean {
    if (!codigoCotizacion) { setError(errorConsultaSerie ? "No se pudo consultar la serie de cotización." : "Falta configurar una serie para cotizaciones."); return false; }
    if (!lineas.length) { setError("Agrega al menos un repuesto o un trabajo."); return false; }
    if (vigenteHasta < fechaEmision) { setError("La fecha de vigencia no puede ser anterior a la fecha de emisión."); return false; }
    const cantidadNoEntera = lineas.find((linea) => !Number.isInteger(Number(linea.cantidad)) || Number(linea.cantidad) < 1);
    if (cantidadNoEntera) { setError("La cantidad de cada repuesto o servicio debe ser un entero mayor que cero."); return false; }
    const servicioIncompleto = lineas.find((linea) => linea.tipo === "SERVICIO" && (!String(linea.descripcion ?? linea.nombreVisible).trim() || !Number.isFinite(Number(linea.cantidad)) || Number(linea.cantidad) <= 0 || String(linea.precioUnitario).trim() === "" || !Number.isFinite(Number(linea.precioUnitario)) || Number(linea.precioUnitario) < 0));
    if (servicioIncompleto) { setError("Completa la descripción, cantidad y precio de cada servicio antes de guardar la cotización."); return false; }
    return true;
  }

  async function guardarGestion(): Promise<Cotizacion | null> {
    if (!validarGestion()) return null;
    setGuardando(true); setError("");
    try {
      const detalles = lineas as Record<string, unknown>[];
      const datosCotizacion = { clienteId: cliente?.id ?? clienteInicialId ?? null, detalles, observacion, vigenteHasta: vigenteHasta || null };
      const guardada = cotizacionId
        ? await servicioIngresos.actualizarCotizacion(cotizacionId, datosCotizacion)
        : await servicioIngresos.crearCotizacion(datosCotizacion);
      setConfirmarDescarte(false); limpiarBorradorCotizacion();
      setMostrarFormulario(false); await cargar();
      return guardada;
    } catch (problema) { setError(problema instanceof Error ? problema.message : "No se pudo guardar."); return null; }
    finally { setGuardando(false); }
  }

  return { validarGestion, guardarGestion };
}
