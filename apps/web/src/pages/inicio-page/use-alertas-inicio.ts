import { useCallback, useEffect, useRef, useState } from "react";
import { servicioProductos, type AlertaStockBajo } from "../../services/inventario/productos.service";
import { servicioIngresos } from "../../services/ingresos.service";

type SerieFaltante = { tipo: string; nombre: string; icono: string };

export function useAlertasInicio(permisos: string[]) {
  const puedeLeerInventario = permisos.includes("INVENTARIO.LEER");
  const puedeVerAlertasIngresos = permisos.includes("INGRESOS.LEER") || permisos.includes("INGRESOS.CREAR") || permisos.includes("FINANZAS.ADMINISTRAR");
  const puedeAdministrarSeries = permisos.includes("FINANZAS.ADMINISTRAR");
  const [alertasStockBajo, setAlertasStockBajo] = useState<AlertaStockBajo[]>([]);
  const [totalAlertasStock, setTotalAlertasStock] = useState(0);
  const [paginaAlertasStock, setPaginaAlertasStock] = useState(0);
  const [hayMasAlertasStock, setHayMasAlertasStock] = useState(false);
  const [cargandoMasAlertasStock, setCargandoMasAlertasStock] = useState(false);
  const [seriesFaltantes, setSeriesFaltantes] = useState<SerieFaltante[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);
  const [errorAlertasStock, setErrorAlertasStock] = useState("");
  const solicitudIdRef = useRef(0);
  const cargandoMasRef = useRef(false);

  const cargarAlertasStock = useCallback(async () => {
    const solicitudId = ++solicitudIdRef.current;
    cargandoMasRef.current = false;
    setCargandoMasAlertasStock(false);
    if (!puedeLeerInventario && !puedeVerAlertasIngresos) {
      setAlertasStockBajo([]);
      setTotalAlertasStock(0);
      setPaginaAlertasStock(0);
      setHayMasAlertasStock(false);
      setSeriesFaltantes([]);
      setErrorAlertasStock("");
      setCargandoAlertasStock(false);
      return;
    }
    setCargandoAlertasStock(true);
    const [resultadoStock, resultadoSeries] = await Promise.allSettled([
      puedeLeerInventario ? servicioProductos.alertasStockBajo(1, 20) : Promise.resolve(null),
      puedeVerAlertasIngresos ? servicioIngresos.numeraciones() : Promise.resolve(null),
    ]);
    if (solicitudId !== solicitudIdRef.current) return;
    const errores: string[] = [];
    if (resultadoStock.status === "fulfilled") {
      const pagina = resultadoStock.value;
      setAlertasStockBajo(pagina?.items ?? []);
      setTotalAlertasStock(pagina?.total ?? 0);
      setPaginaAlertasStock(pagina?.pagina ?? 0);
      setHayMasAlertasStock(pagina?.hayMas ?? false);
    } else {
      errores.push("No se pudieron actualizar las alertas de inventario.");
    }
    if (resultadoSeries.status === "fulfilled" && resultadoSeries.value) {
      const numeraciones = resultadoSeries.value;
      const series: SerieFaltante[] = [
        { tipo: "BOLETA", nombre: "boletas de venta", icono: "B" },
        { tipo: "FACTURA", nombre: "facturas de venta", icono: "F" },
        { tipo: "NOTA_VENTA", nombre: "notas de venta", icono: "NV" },
        { tipo: "ORDEN_SERVICIO", nombre: "órdenes de servicio", icono: "OS" },
        { tipo: "COTIZACION", nombre: "cotizaciones", icono: "COT" },
        { tipo: "GUIA_REMITENTE", nombre: "guías de remisión de remitente", icono: "GR" },
      ];
      setSeriesFaltantes(series.filter((serie) => !numeraciones[serie.tipo as keyof typeof numeraciones]?.codigo));
    } else if (!puedeVerAlertasIngresos) {
      setSeriesFaltantes([]);
    } else {
      setSeriesFaltantes([]);
      errores.push("No se pudieron actualizar las series de documentos.");
    }
    setErrorAlertasStock(errores.join(" "));
    setCargandoAlertasStock(false);
  }, [puedeLeerInventario, puedeVerAlertasIngresos]);

  const cargarMasAlertasStock = useCallback(async () => {
    if (!puedeLeerInventario || !hayMasAlertasStock || cargandoAlertasStock || cargandoMasRef.current || paginaAlertasStock < 1) return;
    cargandoMasRef.current = true;
    setCargandoMasAlertasStock(true);
    const solicitudId = solicitudIdRef.current;
    const paginaSiguiente = paginaAlertasStock + 1;
    try {
      const resultado = await servicioProductos.alertasStockBajo(paginaSiguiente, 20);
      if (solicitudId !== solicitudIdRef.current) return;
      setAlertasStockBajo((actuales) => {
        const idsActuales = new Set(actuales.map((alerta) => alerta.id));
        return [...actuales, ...resultado.items.filter((alerta) => !idsActuales.has(alerta.id))];
      });
      setPaginaAlertasStock(resultado.pagina);
      if (resultado.total !== undefined) setTotalAlertasStock(resultado.total);
      setHayMasAlertasStock(resultado.hayMas);
      setErrorAlertasStock("");
    } catch {
      if (solicitudId === solicitudIdRef.current) setErrorAlertasStock("No se pudieron cargar más alertas de inventario.");
    } finally {
      if (solicitudId === solicitudIdRef.current) {
        cargandoMasRef.current = false;
        setCargandoMasAlertasStock(false);
      }
    }
  }, [cargandoAlertasStock, hayMasAlertasStock, paginaAlertasStock, puedeLeerInventario]);

  useEffect(() => {
    void cargarAlertasStock();
    const intervalo = window.setInterval(() => void cargarAlertasStock(), 60_000);
    const alVolver = () => { if (document.visibilityState === "visible") void cargarAlertasStock(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargarAlertasStock]);

  return {
    alertasStockBajo,
    totalAlertasStock,
    hayMasAlertasStock,
    cargandoMasAlertasStock,
    cargarMasAlertasStock,
    seriesFaltantes,
    cargandoAlertasStock,
    errorAlertasStock,
    cargarAlertasStock,
    puedeLeerInventario,
    puedeVerAlertasIngresos,
    puedeAdministrarSeries,
    cantidadNotificaciones: totalAlertasStock + seriesFaltantes.length,
  };
}
