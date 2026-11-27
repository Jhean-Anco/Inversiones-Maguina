import { describe, expect, it } from "vitest";
import {
  compararAcumulado, compararTicketPromedio, construirRitmo, etiquetaComparacion, limitesPeriodo, PERIODOS, rangosDelPeriodo, textosPeriodo, tramoComparado, variacionPorConcepto,
} from "./dashboard-periodos";
import type { FlujoIngresosDashboard } from "../../services/reportes.service";
import type { PuntoIngresos } from "./dashboard-chart-types";

const punto = (fecha: string, cambios: Partial<PuntoIngresos> = {}): PuntoIngresos => ({
  fecha, total: 0, BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, NOTA_DEBITO: 0, ADELANTO: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0, ...cambios,
});

describe("textos de periodos", () => {
  it("lista los cuatro periodos disponibles", () => {
    expect(PERIODOS.map((periodo) => periodo.clave)).toEqual(["SEMANA", "MES", "TRIMESTRE", "ANIO"]);
  });

  it("ofrece textos para cada periodo", () => {
    expect(textosPeriodo("MES")).toEqual({ este: "Este mes", del: "del mes", anterior: "mes anterior", conArticulo: "el mes anterior", nombre: "este mes" });
    expect(textosPeriodo("SEMANA").conArticulo).toBe("la semana anterior");
  });

  it("rotula la comparación elegida", () => {
    expect(etiquetaComparacion("TRIMESTRE", "ANTERIOR")).toBe("trimestre anterior");
    expect(etiquetaComparacion("TRIMESTRE", "ANIO_PASADO")).toBe("año pasado");
  });
});

describe("limitesPeriodo", () => {
  it("la semana va de lunes a domingo", () => {
    expect(limitesPeriodo("SEMANA", "2026-01-21")).toEqual({ inicio: "2026-01-19", fin: "2026-01-25" });
    expect(limitesPeriodo("SEMANA", "2026-03-08")).toEqual({ inicio: "2026-03-02", fin: "2026-03-08" });
    expect(limitesPeriodo("SEMANA", "2026-01-19")).toEqual({ inicio: "2026-01-19", fin: "2026-01-25" });
  });

  it("el mes respeta años bisiestos", () => {
    expect(limitesPeriodo("MES", "2024-02-10")).toEqual({ inicio: "2024-02-01", fin: "2024-02-29" });
    expect(limitesPeriodo("MES", "2026-12-31")).toEqual({ inicio: "2026-12-01", fin: "2026-12-31" });
  });

  it("el trimestre agrupa tres meses calendario", () => {
    expect(limitesPeriodo("TRIMESTRE", "2026-05-15")).toEqual({ inicio: "2026-04-01", fin: "2026-06-30" });
    expect(limitesPeriodo("TRIMESTRE", "2026-12-01")).toEqual({ inicio: "2026-10-01", fin: "2026-12-31" });
  });

  it("el año va de enero a diciembre", () => {
    expect(limitesPeriodo("ANIO", "2026-07-04")).toEqual({ inicio: "2026-01-01", fin: "2026-12-31" });
  });
});

describe("rangosDelPeriodo", () => {
  it("recorta el mes anterior a sus propios días", () => {
    const rangos = rangosDelPeriodo("MES", "2026-03-31");
    expect(rangos).toEqual({
      periodo: "MES", diasPeriodo: 31,
      actual: { desde: "2026-03-01", hasta: "2026-03-31", dias: 31 },
      anterior: { desde: "2026-02-01", hasta: "2026-02-28", dias: 28 },
      anioPasado: { desde: "2025-03-01", hasta: "2025-03-31", dias: 31 },
      completos: {
        actual: { inicio: "2026-03-01", fin: "2026-03-31" },
        anterior: { inicio: "2026-02-01", fin: "2026-02-28" },
        anioPasado: { inicio: "2025-03-01", fin: "2025-03-31" },
      },
    });
  });

  it("alinea la semana del año pasado por día de la semana", () => {
    const rangos = rangosDelPeriodo("SEMANA", "2026-01-21");
    expect(rangos.diasPeriodo).toBe(7);
    expect(rangos.actual).toEqual({ desde: "2026-01-19", hasta: "2026-01-21", dias: 3 });
    expect(rangos.anterior).toEqual({ desde: "2026-01-12", hasta: "2026-01-14", dias: 3 });
    expect(rangos.anioPasado).toEqual({ desde: "2025-01-20", hasta: "2025-01-22", dias: 3 });
  });

  it("compara trimestres y años equivalentes", () => {
    const trimestre = rangosDelPeriodo("TRIMESTRE", "2026-05-10");
    expect(trimestre.diasPeriodo).toBe(91);
    expect(trimestre.actual).toEqual({ desde: "2026-04-01", hasta: "2026-05-10", dias: 40 });
    expect(trimestre.anterior).toEqual({ desde: "2026-01-01", hasta: "2026-02-09", dias: 40 });
    expect(trimestre.anioPasado).toEqual({ desde: "2025-04-01", hasta: "2025-05-10", dias: 40 });

    const anio = rangosDelPeriodo("ANIO", "2025-12-31");
    expect(anio.diasPeriodo).toBe(365);
    expect(anio.anterior).toEqual({ desde: "2024-01-01", hasta: "2024-12-30", dias: 365 });
    expect(anio.anioPasado).toEqual(anio.anterior);
  });

  it("elige el tramo comparado", () => {
    const rangos = rangosDelPeriodo("MES", "2026-03-10");
    expect(tramoComparado(rangos, "ANTERIOR")).toBe(rangos.anterior);
    expect(tramoComparado(rangos, "ANIO_PASADO")).toBe(rangos.anioPasado);
  });
});

describe("comparaciones acumuladas", () => {
  const rangos = rangosDelPeriodo("MES", "2026-03-03");
  const dias = [
    punto("2026-03-01", { total: 100, PRODUCTO: 60, SERVICIO: 40 }),
    punto("2026-03-03", { total: 50, MOTOTAXI: 50 }),
    punto("2026-02-02", { total: 100, PRODUCTO: 100 }),
    punto("2026-02-04", { total: 999 }),
    punto("2025-03-01", { total: 75, SERVICIO: 75 }),
  ];

  it("acumula día a día el periodo actual y el comparado", () => {
    expect(compararAcumulado(dias, rangos, "ANTERIOR")).toEqual({ actual: 150, anterior: 100, variacion: 50, serieActual: [100, 100, 150], serieAnterior: [0, 100, 100] });
    expect(compararAcumulado(dias, rangos, "ANIO_PASADO", "SERVICIO")).toEqual({ actual: 40, anterior: 75, variacion: ((40 - 75) / 75) * 100, serieActual: [40, 40, 40], serieAnterior: [75, 75, 75] });
  });

  it("devuelve ceros cuando el tramo no tiene días", () => {
    const vacio = { ...rangos, actual: { ...rangos.actual, dias: 0 }, anterior: { ...rangos.anterior, dias: 0 } };
    expect(compararAcumulado(dias, vacio, "ANTERIOR")).toEqual({ actual: 0, anterior: 0, variacion: 0, serieActual: [], serieAnterior: [] });
  });

  it("compara por concepto de venta", () => {
    expect(variacionPorConcepto(dias, rangos, "ANTERIOR")).toEqual([
      { clave: "PRODUCTO", nombre: "Repuestos", actual: 60, anterior: 100, variacion: -40 },
      { clave: "SERVICIO", nombre: "Servicios", actual: 40, anterior: 0, variacion: null },
      { clave: "MOTOTAXI", nombre: "Mototaxis", actual: 50, anterior: 0, variacion: null },
    ]);
  });

  it("compara el ticket promedio dentro de cada tramo", () => {
    const reporte = {
      flujoPorComprobante: [
        { fecha: "2026-03-01", tipoComprobante: "BOLETA", ventas: 2, total: "100" },
        { fecha: "2026-03-02", tipoComprobante: "FACTURA", ventas: 2, total: "200" },
        { fecha: "2026-03-04", tipoComprobante: "BOLETA", ventas: 10, total: "1" },
        { fecha: "2026-02-01", tipoComprobante: "NOTA_VENTA", ventas: 1, total: "50" },
      ],
    } as FlujoIngresosDashboard;
    expect(compararTicketPromedio(reporte, rangos, "ANTERIOR")).toEqual({ actual: 75, anterior: 50, variacion: 50 });
    expect(compararTicketPromedio(reporte, rangos, "ANIO_PASADO")).toEqual({ actual: 75, anterior: null, variacion: null });
  });
});

describe("construirRitmo", () => {
  const dias = [
    punto("2026-04-01", { total: 30 }), punto("2026-04-02", { total: 30 }), punto("2026-04-03", { total: 30 }),
    punto("2026-03-01", { total: 10 }), punto("2026-03-31", { total: 20 }),
  ];

  it("proyecta el cierre linealmente después de tres días", () => {
    const ritmo = construirRitmo(dias, rangosDelPeriodo("MES", "2026-04-03"));
    expect(ritmo.acumuladoActual).toBe(90);
    expect(ritmo.proyeccionCierre).toBe(900);
    expect(ritmo.puntos).toHaveLength(30);
    expect(ritmo.puntos[0]).toEqual({ dia: 1, actual: 30, proyeccion: null, anterior: 10, anioPasado: 0 });
    expect(ritmo.puntos[2]).toEqual({ dia: 3, actual: 90, proyeccion: 90, anterior: 10, anioPasado: 0 });
    expect(ritmo.puntos[29]).toEqual({ dia: 30, actual: null, proyeccion: 900, anterior: 10, anioPasado: 0 });
    expect(ritmo).toMatchObject({ cierreAnterior: 30, cierreAnioPasado: 0, hayAnterior: true, hayAnioPasado: false });
  });

  it("no proyecta con menos de tres días transcurridos", () => {
    const ritmo = construirRitmo(dias, rangosDelPeriodo("MES", "2026-04-02"));
    expect(ritmo.proyeccionCierre).toBeNull();
    expect(ritmo.puntos.every((puntoRitmo) => puntoRitmo.proyeccion === null)).toBe(true);
  });

  it("no proyecta cuando el periodo ya terminó y completa días faltantes con null", () => {
    const ritmo = construirRitmo(dias, rangosDelPeriodo("MES", "2026-03-31"));
    expect(ritmo.proyeccionCierre).toBeNull();
    expect(ritmo.acumuladoActual).toBe(30);
    expect(ritmo.puntos).toHaveLength(31);
    expect(ritmo.puntos[30]).toMatchObject({ dia: 31, actual: 30, anterior: null });
    expect(ritmo.hayAnterior).toBe(false);
  });
});
