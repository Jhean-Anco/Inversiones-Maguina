import { describe } from "vitest";
import { servicioReportes } from "./reportes.service";
import { probarSolicitudes } from "../test/solicitudes";

const rango = { desde: "2026-01-01", hasta: "2026-01-31" };
const query = "desde=2026-01-01&hasta=2026-01-31";

describe("servicioReportes", () => {
  probarSolicitudes([
    { nombre: "ingresosDashboard combina el rango anual con el inicio del mes", llamar: () => servicioReportes.ingresosDashboard({ mes: { desde: "2026-01-01", hasta: "2026-01-31" }, anual: { desde: "2025-02-01", hasta: "2026-01-31" } }), url: "/reportes/ingresos/dashboard?desde=2025-02-01&hasta=2026-01-31&mesDesde=2026-01-01" },
    { nombre: "ingresosComparativo", llamar: () => servicioReportes.ingresosComparativo(rango), url: `/reportes/ingresos/comparativo?${query}` },
    { nombre: "rentabilidad", llamar: () => servicioReportes.rentabilidad(rango), url: `/reportes/ingresos/rentabilidad?${query}` },
    { nombre: "articulos", llamar: () => servicioReportes.articulos(rango), url: `/reportes/ingresos/articulos?${query}` },
    { nombre: "horarios", llamar: () => servicioReportes.horarios(rango), url: `/reportes/ingresos/horarios?${query}` },
    { nombre: "cobranza", llamar: () => servicioReportes.cobranza(rango), url: `/reportes/ingresos/cobranza?${query}` },
    { nombre: "inventario", llamar: () => servicioReportes.inventario(rango), url: `/reportes/inventario?${query}` },
    { nombre: "reporteIngresos de todas las líneas omite el filtro", llamar: () => servicioReportes.reporteIngresos({ ...rango, linea: "TODAS" }), url: `/reportes/ingresos/reporte?${query}` },
    { nombre: "reporteIngresos de una línea", llamar: () => servicioReportes.reporteIngresos({ ...rango, linea: "MOTOTAXI" }), url: `/reportes/ingresos/reporte?${query}&linea=MOTOTAXI` },
  ]);
});
