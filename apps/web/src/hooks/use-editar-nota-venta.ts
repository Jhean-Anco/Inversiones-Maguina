import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { datosDeEdicion, formularioDesdeNota, totalEdicion, validarEdicion, type FormularioNota, type LineaEdicion } from "../domain/ingresos/edicion-nota-venta";
import { ErrorApi } from "../services/api-cliente";
import { servicioIngresos, type NotaVentaEditable } from "../services/ingresos.service";

const fechaHoy = () => { const ahora = new Date(); return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const mensajeDe = (problema: unknown, respaldo: string) => problema instanceof Error ? problema.message : respaldo;

export function useEditarNotaVenta(ingresoId: string, onGuardada: (mensaje: string) => void) {
  const [nota, setNota] = useState<NotaVentaEditable | null>(null);
  const [formulario, setFormulario] = useState<FormularioNota | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [requiereDevolucion, setRequiereDevolucion] = useState(false);
  const [devolucionConfirmada, setDevolucionConfirmada] = useState(false);
  const enviando = useRef(false);
  const consulta = useRef(0);

  const cargar = useCallback(async () => {
    const actual = ++consulta.current;
    setCargando(true); setError(""); setRequiereDevolucion(false); setDevolucionConfirmada(false);
    try {
      const datos = await servicioIngresos.obtenerNotaVenta(ingresoId);
      if (actual !== consulta.current) return;
      setNota(datos); setFormulario(formularioDesdeNota(datos));
    } catch (problema) {
      if (actual === consulta.current) setError(mensajeDe(problema, "No se pudo cargar la nota de venta."));
    } finally { if (actual === consulta.current) setCargando(false); }
  }, [ingresoId]);

  useEffect(() => { void cargar(); return () => { consulta.current += 1; }; }, [cargar]);

  /** Cualquier cambio invalida la devolución confirmada: el importe a devolver puede ser otro. */
  const cambiar = (cambios: Partial<FormularioNota> | ((actual: FormularioNota) => Partial<FormularioNota>)) => {
    setRequiereDevolucion(false); setDevolucionConfirmada(false); setError("");
    setFormulario((actual) => actual ? { ...actual, ...(typeof cambios === "function" ? cambios(actual) : cambios) } : actual);
  };
  const cambiarLinea = (clave: string, cambios: Partial<LineaEdicion>) => cambiar((actual) => ({ lineas: actual.lineas.map((linea) => linea.clave === clave ? { ...linea, ...cambios } : linea) }));
  const quitarLinea = (clave: string) => cambiar((actual) => ({ lineas: actual.lineas.filter((linea) => linea.clave !== clave || linea.bloqueo) }));
  /** Repetir un artículo ya presente suma una unidad en vez de duplicar la línea. */
  const agregarLinea = (nueva: LineaEdicion) => cambiar((actual) => {
    const repetida = actual.lineas.find((linea) => !linea.bloqueo && ((nueva.presentacionId && linea.presentacionId === nueva.presentacionId) || (nueva.mototaxiModeloId && linea.mototaxiModeloId === nueva.mototaxiModeloId)));
    return { lineas: repetida ? actual.lineas.map((linea) => linea === repetida ? { ...linea, cantidad: String(Number(linea.cantidad) + 1) } : linea) : [...actual.lineas, nueva] };
  });

  async function guardar(evento?: FormEvent) {
    evento?.preventDefault();
    if (!nota || !formulario || !nota.editable || enviando.current) return;
    const invalido = validarEdicion(formulario, fechaHoy());
    if (invalido) { setError(invalido); return; }
    enviando.current = true; setGuardando(true); setError("");
    try {
      const resultado = await servicioIngresos.editarNotaVenta(ingresoId, datosDeEdicion(formulario, nota.versionDocumento, devolucionConfirmada));
      onGuardada(resultado.sinCambios ? `La nota ${resultado.nota.codigo} no tenía cambios por guardar.` : `La nota ${resultado.nota.codigo} se actualizó.`);
    } catch (problema) {
      const mensaje = mensajeDe(problema, "No se pudo guardar la nota de venta.");
      if (problema instanceof ErrorApi && problema.estado === 409 && mensaje.includes("Confirma la devolución")) setRequiereDevolucion(true);
      setError(mensaje);
    } finally { enviando.current = false; setGuardando(false); }
  }

  return {
    nota, formulario, cargando, guardando, error, requiereDevolucion, devolucionConfirmada, setDevolucionConfirmada,
    total: formulario ? totalEdicion(formulario.lineas) : 0, hoy: fechaHoy(), recargar: cargar, cambiar, cambiarLinea, quitarLinea, agregarLinea, guardar,
  };
}
