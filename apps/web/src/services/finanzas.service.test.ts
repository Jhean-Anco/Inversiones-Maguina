import { describe } from "vitest";
import { servicioFinanzas, type DatosCuentaFinanciera } from "./finanzas.service";
import { probarSolicitudes } from "../test/solicitudes";

const cuenta = { tipo: "BANCO", nombre: "BCP", moneda: "PEN", saldoInicial: "10.00", fechaSaldoInicial: "2026-01-01" } as DatosCuentaFinanciera;

describe("servicioFinanzas", () => {
  probarSolicitudes([
    { nombre: "resumen", llamar: () => servicioFinanzas.resumen(), url: "/finanzas/cuentas/resumen" },
    { nombre: "flujo", llamar: () => servicioFinanzas.flujo("SEMANA"), url: "/finanzas/cuentas/flujo?periodo=SEMANA" },
    { nombre: "composicion", llamar: () => servicioFinanzas.composicion("2026-01-01", "2026-01-31"), url: "/finanzas/cuentas/composicion?desde=2026-01-01&hasta=2026-01-31" },
    { nombre: "movimientos con valores por defecto", llamar: () => servicioFinanzas.movimientos("MES", "2026-01-15"), url: "/finanzas/cuentas/movimientos?periodo=MES&fecha=2026-01-15&pagina=1&porPagina=10" },
    { nombre: "movimientos de una cuenta", llamar: () => servicioFinanzas.movimientos("DIA", "2026-01-15", "c1", 3, 20), url: "/finanzas/cuentas/movimientos?periodo=DIA&fecha=2026-01-15&pagina=3&porPagina=20&cuentaId=c1" },
    { nombre: "listar", llamar: () => servicioFinanzas.listar(), url: "/finanzas/cuentas" },
    { nombre: "opciones", llamar: () => servicioFinanzas.opciones(), url: "/finanzas/cuentas/opciones" },
    { nombre: "crear", llamar: () => servicioFinanzas.crear(cuenta), url: "/finanzas/cuentas", metodo: "POST", cuerpo: cuenta },
    { nombre: "actualizar", llamar: () => servicioFinanzas.actualizar("c 1", cuenta), url: "/finanzas/cuentas/c%201", metodo: "PATCH", cuerpo: cuenta },
    { nombre: "cambiarEstado", llamar: () => servicioFinanzas.cambiarEstado("c1", false), url: "/finanzas/cuentas/c1/estado", metodo: "PATCH", cuerpo: { activa: false } },
  ]);
});
