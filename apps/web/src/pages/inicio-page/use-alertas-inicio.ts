import { useCallback, useEffect, useState } from "react";
import { servicioProductos, type AlertaStockBajo } from "../../services/inventario/productos.service";
import { servicioIngresos } from "../../services/ingresos.service";

type SerieFaltante = { tipo: string; nombre: string; icono: string };

export function useAlertasInicio(permisos: string[]) {
  const puedeLeerInventario = permisos.includes("INVENTARIO.LEER");
  const puedeVerAlertasIngresos = permisos.includes("INGRESOS.LEER") || permisos.includes("INGRESOS.CREAR") || permisos.includes("FINANZAS.ADMINISTRAR");
  const puedeAdministrarSeries = permisos.includes("FINANZAS.ADMINISTRAR");
  const [alertasStockBajo, setAlertasStockBajo] = useState<AlertaStockBajo[]>([]);
  const [seriesFaltantes, setSeriesFaltantes] = useState<SerieFaltante[]>([]);
  const [cargandoAlertasStock, setCargandoAlertasStock] = useState(true);
  const [errorAlertasStock, setErrorAlertasStock] = useState("");

  const cargarAlertasStock = useCallback(async () => {
    if (!puedeLeerInventario && !puedeVerAlertasIngresos) {
      setAlertasStockBajo([]);
      setSeriesFaltantes([]);
      setErrorAlertasStock("");
      setCargandoAlertasStock(false);
      return;
    }
    setCargandoAlertasStock(true);
    const [resultadoStock, resultadoSeries] = await Promise.allSettled([
      puedeLeerInventario ? servicioProductos.alertasStockBajo() : Promise.resolve([] as AlertaStockBajo[]),
      puedeVerAlertasIngresos ? servicioIngresos.numeraciones() : Promise.resolve(null),
    ]);
    const errores: string[] = [];
    if (resultadoStock.status === "fulfilled") {
      setAlertasStockBajo(resultadoStock.value);
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
    seriesFaltantes,
    cargandoAlertasStock,
    errorAlertasStock,
    cargarAlertasStock,
    puedeLeerInventario,
    puedeVerAlertasIngresos,
    puedeAdministrarSeries,
    cantidadNotificaciones: alertasStockBajo.length + seriesFaltantes.length,
  };
}
