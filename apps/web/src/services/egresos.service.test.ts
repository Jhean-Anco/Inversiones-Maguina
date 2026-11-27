import { describe } from "vitest";
import { servicioEgresos, type DatosEgreso } from "./egresos.service";
import { probarSolicitudes } from "../test/solicitudes";

const datos = { tipo: "MOTOTAXI", fecha: "2026-01-02", categoria: "COMPRA", concepto: "Mototaxi", monto: "100.00", moneda: "PEN" } as DatosEgreso;
const pago = { fechaPago: "2026-01-03", importePagado: "50.00", medioPago: "EFECTIVO", cuentaFinancieraId: "c1", claveIdempotencia: "k1" };

describe("servicioEgresos", () => {
  probarSolicitudes([
    { nombre: "listar egresos", llamar: () => servicioEgresos.listar("MOTOTAXI", 1, 10, "bajaj"), url: "/egresos?tipo=MOTOTAXI&pagina=1&porPagina=10&busqueda=bajaj" },
    { nombre: "listar desde inventario", llamar: () => servicioEgresos.listar("MOTOTAXI", 2, 4, "", true), url: "/inventario/mototaxis?tipo=MOTOTAXI&pagina=2&porPagina=4&busqueda=" },
    { nombre: "crear egreso", llamar: () => servicioEgresos.crear(datos), url: "/egresos", metodo: "POST", cuerpo: datos },
    { nombre: "crear desde inventario", llamar: () => servicioEgresos.crear(datos, true), url: "/inventario/mototaxis", metodo: "POST", cuerpo: datos },
    { nombre: "registrar pago codifica el id", llamar: () => servicioEgresos.registrarPago("e/1", pago), url: "/egresos/e%2F1/pagos", metodo: "POST", cuerpo: pago },
    { nombre: "registrar pago desde inventario", llamar: () => servicioEgresos.registrarPago("e1", pago, true), url: "/inventario/mototaxis/e1/pagos", metodo: "POST", cuerpo: pago },
  ]);
});
