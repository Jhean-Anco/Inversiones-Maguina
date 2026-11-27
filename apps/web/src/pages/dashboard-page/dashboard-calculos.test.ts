import { describe, expect, it } from "vitest";
import {
  calcularMargen, construirAvanceMetas, construirCascadaCaja, construirMapaCalor, construirMapaVentas, construirPareto, ingresosEgresosPorMes,
  mesAnteriorCompleto, porcentajeCobrado, saldoNetoDeCaja, serieDiariaIngresos, variacionPorcentual, ventasMensualesPorConcepto,
} from "./dashboard-calculos";
import type { FlujoIngresosDashboard } from "../../services/reportes.service";
import type { FlujoFinanciero } from "../../services/finanzas.service";
import type { PuntoIngresos } from "./dashboard-chart-types";

type FilaVenta = Parameters<typeof calcularMargen>[0][number];
const fila = (tipo: FilaVenta["tipo"], venta: string, categoria: string | null = null, ventaConCosto: string | null = null, costo: string | null = null): FilaVenta => ({ tipo, categoria, venta, ventaConCosto, costo });

describe("variacionPorcentual", () => {
  it("calcula la variación sobre el periodo anterior", () => {
    expect(variacionPorcentual(150, 100)).toBe(50);
    expect(variacionPorcentual(50, 100)).toBe(-50);
  });

  it("sin base de comparación es 0 si tampoco hay valor actual y null en otro caso", () => {
    expect(variacionPorcentual(0, 0)).toBe(0);
    expect(variacionPorcentual(10, 0)).toBeNull();
  });
});

describe("saldoNetoDeCaja", () => {
  it("resta los egresos de los ingresos de una sola moneda", () => {
    const items = [
      { moneda: "PEN", sentido: "INGRESO" as const, importe: "500" },
      { moneda: "PEN", sentido: "EGRESO" as const, importe: "120.5" },
      { moneda: "USD", sentido: "INGRESO" as const, importe: "1000" },
    ];
    expect(saldoNetoDeCaja(items, "PEN")).toBe(379.5);
    expect(saldoNetoDeCaja(items, "USD")).toBe(1000);
    expect(saldoNetoDeCaja(items, "EUR")).toBe(0);
  });
});

describe("construirPareto", () => {
  const articulos = [
    { descripcion: "Filtro", tipo: "PRODUCTO", total: "20" },
    { descripcion: "Mototaxi", tipo: "MOTOTAXI", total: "60" },
    { descripcion: "Sin venta", tipo: "PRODUCTO", total: "0" },
    { descripcion: "Servicio", tipo: "SERVICIO", total: "20" },
  ];

  it("ordena por importe y acumula sobre el total de ventas del mes", () => {
    expect(construirPareto(articulos, 200)).toEqual([
      { nombre: "Mototaxi", tipo: "MOTOTAXI", total: 60, acumulado: 30 },
      { nombre: "Filtro", tipo: "PRODUCTO", total: 20, acumulado: 40 },
      { nombre: "Servicio", tipo: "SERVICIO", total: 20, acumulado: 50 },
    ]);
  });

  it("usa la suma de los artículos cuando no hay total del mes y limita a 100 %", () => {
    expect(construirPareto(articulos, 0).map((punto) => punto.acumulado)).toEqual([60, 80, 100]);
    expect(construirPareto(articulos, 50).map((punto) => punto.acumulado)).toEqual([100, 100, 100]);
  });

  it("devuelve una lista vacía sin artículos vendidos", () => {
    expect(construirPareto([], 0)).toEqual([]);
  });
});

describe("calcularMargen", () => {
  it("devuelve null cuando no se conoce el costo de ninguna venta", () => {
    expect(calcularMargen([fila("SERVICIO", "100")])).toBeNull();
    expect(calcularMargen([])).toBeNull();
  });

  it("calcula el margen solo sobre las ventas con costo y su cobertura", () => {
    const margen = calcularMargen([
      fila("PRODUCTO", "300", "Filtros", "300", "180"),
      fila("MOTOTAXI", "500", null, "500", "400"),
      fila("SERVICIO", "200"),
      fila("PRODUCTO", "50", "Frenos", null, "10"),
    ]);
    expect(margen).toMatchObject({ margen: 220, costo: 580, ventaConCosto: 800, ventaTotal: 1050 });
    expect(margen?.porcentaje).toBeCloseTo(27.5);
    expect(margen?.cobertura).toBeCloseTo(76.19, 2);
  });

  it("informa cobertura cero si las ventas totales se anulan", () => {
    expect(calcularMargen([fila("PRODUCTO", "100", "A", "100", "50"), fila("SERVICIO", "-100")])).toMatchObject({ porcentaje: 50, ventaTotal: 0, cobertura: 0 });
  });
});

describe("construirMapaVentas", () => {
  it("agrupa por categoría, servicios y mototaxis ordenando de mayor a menor", () => {
    expect(construirMapaVentas([
      fila("PRODUCTO", "100", "Filtros"),
      fila("PRODUCTO", "100", " Filtros "),
      fila("SERVICIO", "300"),
      fila("MOTOTAXI", "400"),
      fila("PRODUCTO", "50", null),
      fila("PRODUCTO", "50", "   "),
      fila("PRODUCTO", "0", "Vacía"),
    ])).toEqual([
      { nombre: "Mototaxis", valor: 400, porcentaje: 40 },
      { nombre: "Servicios", valor: 300, porcentaje: 30 },
      { nombre: "Filtros", valor: 200, porcentaje: 20 },
      { nombre: "Sin categoría", valor: 100, porcentaje: 10 },
    ]);
  });

  it("junta en 'Otros' las categorías que exceden el máximo", () => {
    const filas = ["A", "B", "C", "D"].map((categoria, indice) => fila("PRODUCTO", String(40 - indice * 10), categoria));
    expect(construirMapaVentas(filas, 3)).toEqual([
      { nombre: "A", valor: 40, porcentaje: 40 },
      { nombre: "B", valor: 30, porcentaje: 30 },
      { nombre: "Otros", valor: 30, porcentaje: 30 },
    ]);
  });

  it("no crea 'Otros' para una sola categoría sobrante", () => {
    const filas = ["A", "B", "C"].map((categoria) => fila("PRODUCTO", "10", categoria));
    expect(construirMapaVentas(filas, 3).map((tesela) => tesela.nombre)).toEqual(["A", "B", "C"]);
  });

  it("devuelve una lista vacía sin ventas positivas", () => {
    expect(construirMapaVentas([fila("PRODUCTO", "0", "A"), fila("SERVICIO", "-5")])).toEqual([]);
  });
});

describe("construirCascadaCaja", () => {
  it("parte de lo cobrado y aplica sumas y restas hasta el saldo neto", () => {
    const items = [
      { moneda: "PEN", concepto: "COBRANZA", importe: "1000" },
      { moneda: "PEN", concepto: "ADELANTO_ORDEN", importe: "200" },
      { moneda: "PEN", concepto: "NOTA_DEBITO", importe: "50" },
      { moneda: "PEN", concepto: "COMPRA_REPUESTOS", importe: "300" },
      { moneda: "PEN", concepto: "GASTOS", importe: "100" },
      { moneda: "PEN", concepto: "ACTIVOS", importe: "50" },
      { moneda: "PEN", concepto: "NOTA_CREDITO", importe: "1000" },
      { moneda: "USD", concepto: "COMPRA_MOTOTAXIS", importe: "999" },
    ];
    const cascada = construirCascadaCaja(items, "PEN");
    expect(cascada.cobrado).toBe(1200);
    expect(cascada.saldoNeto).toBe(-200);
    expect(cascada.pasos).toEqual([
      { clave: "COBRADO", nombre: "Cobrado", tipo: "inicio", valor: 1200, rango: [0, 1200] },
      { clave: "NOTA_DEBITO", nombre: "Notas de débito", tipo: "suma", valor: 50, rango: [1200, 1250] },
      { clave: "REPUESTOS", nombre: "Compra de repuestos", tipo: "resta", valor: 300, rango: [950, 1250] },
      { clave: "GASTOS", nombre: "Gastos y activos", tipo: "resta", valor: 150, rango: [800, 950] },
      { clave: "NOTA_CREDITO", nombre: "Notas de crédito", tipo: "resta", valor: 1000, rango: [-200, 800] },
      { clave: "SALDO", nombre: "Saldo neto", tipo: "final", valor: -200, rango: [-200, 0] },
    ]);
  });

  it("sin movimientos solo muestra el inicio y el saldo en cero", () => {
    expect(construirCascadaCaja([], "PEN").pasos.map((paso) => paso.clave)).toEqual(["COBRADO", "SALDO"]);
  });
});

describe("mesAnteriorCompleto", () => {
  it("devuelve el primer y último día del mes anterior", () => {
    expect(mesAnteriorCompleto("2026-03-15")).toEqual({ desde: "2026-02-01", hasta: "2026-02-28" });
    expect(mesAnteriorCompleto("2024-03-31")).toEqual({ desde: "2024-02-01", hasta: "2024-02-29" });
    expect(mesAnteriorCompleto("2026-01-10")).toEqual({ desde: "2025-12-01", hasta: "2025-12-31" });
  });
});

describe("porcentajeCobrado", () => {
  it("calcula lo cobrado sobre lo facturado con tope de 100 %", () => {
    expect(porcentajeCobrado({ facturado: "200", cobrado: "50" })).toBe(25);
    expect(porcentajeCobrado({ facturado: "100", cobrado: "150" })).toBe(100);
  });

  it("devuelve null sin datos o sin facturación", () => {
    expect(porcentajeCobrado(null)).toBeNull();
    expect(porcentajeCobrado({ facturado: "0", cobrado: "10" })).toBeNull();
  });
});

describe("construirAvanceMetas", () => {
  it("mide los ingresos contra el ritmo esperado a la fecha", () => {
    const [ventas, cobranza, margen] = construirAvanceMetas({
      hoy: "2026-04-15", metas: { VENTAS_MES: 3000, COBRANZA: 80, MARGEN: 30 },
      ingresos: { actual: 1500, anterior: 2800 }, cobranza: { actual: 75, anterior: 70 }, margen: { actual: 20, anterior: 25 },
    });
    expect(ventas).toEqual({ clave: "VENTAS_MES", titulo: "Ingresos del mes", unidad: "soles", actual: 1500, anterior: 2800, meta: 3000, esperado: 1500, avance: 50, estado: "adelante" });
    expect(cobranza).toMatchObject({ clave: "COBRANZA", unidad: "porcentaje", esperado: null, avance: 93.75, estado: "en-ritmo" });
    expect(margen).toMatchObject({ clave: "MARGEN", titulo: "Margen bruto", avance: (20 / 30) * 100, estado: "atrasado" });
  });

  it("deja sin avance ni estado los indicadores sin meta o sin dato", () => {
    const filas = construirAvanceMetas({ hoy: "2026-02-10", metas: { COBRANZA: 0 }, ingresos: null, cobranza: { actual: 50, anterior: null }, margen: { actual: null, anterior: null } });
    expect(filas.map(({ avance, estado, esperado, meta }) => ({ avance, estado, esperado, meta }))).toEqual([
      { avance: null, estado: null, esperado: null, meta: null },
      { avance: Infinity, estado: null, esperado: null, meta: 0 },
      { avance: null, estado: null, esperado: null, meta: null },
    ]);
  });
});

describe("construirMapaCalor", () => {
  const celdas = [
    { dia: 1, hora: 9, operaciones: 2, total: "100" },
    { dia: 1, hora: 11, operaciones: 1, total: "400" },
    { dia: 3, hora: 10, operaciones: 4, total: "80" },
    { dia: 8, hora: 10, operaciones: 9, total: "999" },
    { dia: 2, hora: 24, operaciones: 9, total: "999" },
    { dia: 0, hora: 10, operaciones: 9, total: "999" },
    { dia: 5, hora: -1, operaciones: 9, total: "999" },
    { dia: 4, hora: 10, operaciones: 0, total: "0" },
  ];

  it("devuelve null sin ventas válidas", () => {
    expect(construirMapaCalor([], "importe")).toBeNull();
    expect(construirMapaCalor(celdas.slice(3), "importe")).toBeNull();
  });

  it("arma la cuadrícula por importe con intensidades relativas", () => {
    const mapa = construirMapaCalor(celdas, "importe")!;
    expect(mapa.horas).toEqual([9, 10, 11]);
    expect(mapa.filas.map((filaCalor) => [filaCalor.dia, filaCalor.nombre, filaCalor.nombreCompleto])).toEqual([[1, "Lun", "lunes"], [3, "Mié", "miércoles"]]);
    expect(mapa.filas[0].celdas).toEqual([
      { hora: 9, valor: 100, operaciones: 2, total: 100, intensidad: 0.25 },
      { hora: 10, valor: 0, operaciones: 0, total: 0, intensidad: 0 },
      { hora: 11, valor: 400, operaciones: 1, total: 400, intensidad: 1 },
    ]);
    expect(mapa.mejor).toEqual({ diaCompleto: "lunes", hora: 11, valor: 400, operaciones: 1, total: 400 });
  });

  it("puede medir por número de operaciones", () => {
    const mapa = construirMapaCalor(celdas, "operaciones")!;
    expect(mapa.mejor).toEqual({ diaCompleto: "miércoles", hora: 10, valor: 4, operaciones: 4, total: 80 });
    expect(mapa.filas[0].celdas[0].intensidad).toBe(0.5);
  });

  it("no elige mejor celda si todas valen cero en la métrica", () => {
    const mapa = construirMapaCalor([{ dia: 7, hora: 20, operaciones: 1, total: "0" }], "importe")!;
    expect(mapa.filas[0]).toMatchObject({ nombre: "Dom", nombreCompleto: "domingo" });
    expect(mapa.filas[0].celdas[0].intensidad).toBe(0);
    expect(mapa.mejor).toBeNull();
  });
});

describe("serieDiariaIngresos", () => {
  const reporte: FlujoIngresosDashboard = {
    rango: { desde: "2026-01-01", hasta: "2026-01-03" },
    flujoPorComprobante: [
      { fecha: "2026-01-01", tipoComprobante: "BOLETA", ventas: 2, total: "100" },
      { fecha: "2026-01-01", tipoComprobante: "FACTURA", ventas: 1, total: "50.5" },
      { fecha: "2026-01-03", tipoComprobante: "NOTA_VENTA", ventas: 1, total: "20" },
    ],
    flujoPorConcepto: [{ fecha: "2026-01-01", tipo: "PRODUCTO", total: "150.5" }],
    flujoPorNotaDebito: [{ fecha: "2026-01-03", total: "5" }],
    flujoPorAdelanto: [{ fecha: "2026-01-02", total: "30" }],
  };

  it("devuelve una lista vacía sin reporte", () => {
    expect(serieDiariaIngresos(null, { desde: "2026-01-01", hasta: "2026-01-03" })).toEqual([]);
  });

  it("genera un punto por día con ceros en días sin movimiento y suma solo los orígenes", () => {
    const serie = serieDiariaIngresos(reporte, { desde: "2026-01-01", hasta: "2026-01-04" });
    expect(serie.map((punto) => punto.fecha)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
    expect(serie[0]).toMatchObject({ BOLETA: 100, FACTURA: 50.5, PRODUCTO: 150.5, total: 150.5 });
    expect(serie[1]).toMatchObject({ ADELANTO: 30, total: 30 });
    expect(serie[2]).toMatchObject({ NOTA_VENTA: 20, NOTA_DEBITO: 5, total: 25 });
    expect(serie[3]).toMatchObject({ BOLETA: 0, PRODUCTO: 0, total: 0 });
  });
});

const punto = (fecha: string, cambios: Partial<PuntoIngresos> = {}): PuntoIngresos => ({
  fecha, total: 0, BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, NOTA_DEBITO: 0, ADELANTO: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0, ...cambios,
});

describe("ventasMensualesPorConcepto", () => {
  it("resume los últimos 12 meses y marca el mes en curso", () => {
    const meses = ventasMensualesPorConcepto([
      punto("2026-03-02", { PRODUCTO: 10, SERVICIO: 5 }),
      punto("2026-03-20", { PRODUCTO: 15, MOTOTAXI: 100 }),
      punto("2025-04-05", { SERVICIO: 7 }),
      punto("2025-03-31", { SERVICIO: 999 }),
    ], "2026-03-25");
    expect(meses).toHaveLength(12);
    expect(meses[0]).toEqual({ clave: "2025-04", etiqueta: "Abr", PRODUCTO: 0, SERVICIO: 7, MOTOTAXI: 0, total: 7 });
    expect(meses[11]).toEqual({ clave: "2026-03", etiqueta: "Mar*", PRODUCTO: 25, SERVICIO: 5, MOTOTAXI: 100, total: 130 });
    expect(meses[8].clave).toBe("2025-12");
  });
});

describe("ingresosEgresosPorMes", () => {
  const flujo: FlujoFinanciero = {
    periodo: "MES", desde: "2025-11-01", hasta: "2026-01-31", monedas: ["PEN", "USD"],
    items: [
      { moneda: "PEN", fecha: "2025-11-01", ingresos: "100", egresos: "40", neto: "60" },
      { moneda: "PEN", fecha: "2026-01-01", ingresos: "10", egresos: "25", neto: "-15" },
      { moneda: "USD", fecha: "2025-12-01", ingresos: "500", egresos: "0", neto: "500" },
    ],
  };

  it("devuelve un mes por posición con ceros en meses sin flujo", () => {
    expect(ingresosEgresosPorMes(flujo, "PEN")).toEqual([
      { clave: "2025-11", etiqueta: "Nov", ingresos: 100, egresos: 40, neto: 60 },
      { clave: "2025-12", etiqueta: "Dic", ingresos: 0, egresos: 0, neto: 0 },
      { clave: "2026-01", etiqueta: "Ene", ingresos: 10, egresos: 25, neto: -15 },
    ]);
    expect(ingresosEgresosPorMes(flujo, "USD")[1]).toMatchObject({ ingresos: 500, neto: 500 });
  });

  it("devuelve una lista vacía si el rango está invertido", () => {
    expect(ingresosEgresosPorMes({ ...flujo, desde: "2026-03-01", hasta: "2026-01-31" }, "PEN")).toEqual([]);
  });
});
