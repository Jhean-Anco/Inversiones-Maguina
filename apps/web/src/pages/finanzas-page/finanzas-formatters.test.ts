import { describe, expect, it } from "vitest";
import type { CuentaFinanciera } from "../../services/finanzas.service";
import {
  cantidad,
  cuentaVacia,
  datosDeCuenta,
  etiquetaTipo,
  fechaLocal,
  identificadorCuenta,
  moneda,
  saldoConciliado,
  tiposCuenta,
} from "./finanzas-formatters";

const cuentaBase: CuentaFinanciera = {
  id: "cuenta-1",
  tipo: "BANCO",
  nombre: "Cuenta de operaciones",
  entidad: "Banco de prueba",
  titular: null,
  moneda: "PEN",
  numeroCuenta: null,
  cci: null,
  numeroTarjeta: null,
  telefono: null,
  observacion: null,
  activa: true,
};

describe("formatters de cuentas financieras", () => {
  it("expone los tipos de cuenta y etiqueta cada tipo conocido", () => {
    expect(tiposCuenta.map(({ valor }) => valor)).toEqual(["EFECTIVO", "BANCO", "BILLETERA", "TARJETA"]);
    expect(etiquetaTipo("EFECTIVO")).toBe("Caja / efectivo");
    expect(etiquetaTipo("BANCO")).toBe("Cuenta bancaria");
    expect(etiquetaTipo("BILLETERA")).toBe("Billetera digital");
    expect(etiquetaTipo("TARJETA")).toBe("Tarjeta");
    expect(etiquetaTipo("OTRO" as CuentaFinanciera["tipo"])).toBe("OTRO");
  });

  it("formatea importes, cantidades y la fecha local", () => {
    expect(moneda("1234.5", "PEN")).toBe(new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(1234.5));
    expect(moneda("no-numérico", "PEN")).toBe(new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(0));
    expect(cantidad(12000)).toBe(new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 }).format(12000));
    expect(fechaLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("prioriza un identificador recibido y enmascara números de cuenta", () => {
    expect(identificadorCuenta({ ...cuentaBase, identificador: "Cuenta **** 4321", numeroCuenta: "001234321" })).toBe("Cuenta **** 4321");
    expect(identificadorCuenta({ ...cuentaBase, numeroCuenta: "001-234-5678" })).toBe("•••• 5678");
    expect(identificadorCuenta({ ...cuentaBase, identificador: null, numeroCuenta: "001-234-5678" })).toBe("—");
    expect(identificadorCuenta({ ...cuentaBase, numeroCuenta: null, cci: "1234" })).toBe("1234");
    expect(identificadorCuenta({ ...cuentaBase, numeroCuenta: null, cci: null, telefono: "999 888 777" })).toBe("•••• 8777");
    expect(identificadorCuenta(cuentaBase)).toBe("—");
    expect(identificadorCuenta({ ...cuentaBase, identificador: "" })).toBe("—");
  });

  it("considera conciliado solo un saldo presente con estado conciliado", () => {
    expect(saldoConciliado({ ...cuentaBase, saldoEstado: "CONCILIADO", saldoActual: "120.00" })).toBe(true);
    expect(saldoConciliado({ ...cuentaBase, saldoEstado: "CONCILIADO", saldoActual: null })).toBe(false);
    expect(saldoConciliado({ ...cuentaBase, saldoEstado: "SIN_CONCILIAR", saldoActual: "120.00" })).toBe(false);
  });

  it("prepara un formulario vacío y copia una cuenta con campos opcionales", () => {
    expect(cuentaVacia()).toEqual({
      tipo: "EFECTIVO",
      nombre: "",
      entidad: "",
      titular: "",
      moneda: "PEN",
      saldoInicial: "",
      fechaSaldoInicial: "",
      numeroCuenta: "",
      cci: "",
      numeroTarjeta: "",
      telefono: "",
      observacion: "",
    });

    expect(datosDeCuenta({ ...cuentaBase, titular: "Titular ficticio", numeroCuenta: "000123", saldoInicial: null, fechaSaldoInicial: null })).toMatchObject({
      tipo: "BANCO",
      nombre: "Cuenta de operaciones",
      titular: "Titular ficticio",
      numeroCuenta: "000123",
      saldoInicial: "",
      fechaSaldoInicial: "",
      entidad: "Banco de prueba",
      cci: "",
      numeroTarjeta: "",
      telefono: "",
      observacion: "",
    });
  });
});
