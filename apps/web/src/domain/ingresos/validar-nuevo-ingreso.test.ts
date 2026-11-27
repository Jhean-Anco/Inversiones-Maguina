import { describe, expect, it } from "vitest";
import { validarNuevoIngreso } from "./validar-nuevo-ingreso";
import type { EstadoNubefact, MototaxiParaIngreso, ProductoParaIngreso } from "../../services/ingresos.service";
import type { LineaCarrito } from "../../types/nuevo-ingreso";

const HOY = "2026-01-20";
const estadoHabilitado: EstadoNubefact = { regimenTributario: "GENERAL", credencialesConfiguradas: true, seriesConfiguradas: true, emisionHabilitada: true, serieFacturaConfigurada: true, emisionFacturaHabilitada: true };
const producto = { productoId: "p1", codigo: "R-1", nombre: "Filtro de aceite", presentacionId: "pr1", precio: "25.00", tramos: [{ listaCodigo: "GENERAL", listaNombre: "General", precio: "30.00", cantidadMinima: "1" }] } as ProductoParaIngreso;
const mototaxi = { mototaxiModeloId: "m1", codigo: "M-1", marca: "Bajaj", modelo: "RE", version: null, precioVenta: "9000.00", stockDisponible: 2 } as MototaxiParaIngreso;

const lineaProducto = (cambios: Partial<Extract<LineaCarrito, { tipo: "PRODUCTO" }>> = {}): LineaCarrito => ({ clave: "a", tipo: "PRODUCTO", producto, cantidad: "1", descuento: "0", afectacionIgv: "GRAVADO", ...cambios });
const lineaServicio = (cambios: Partial<Extract<LineaCarrito, { tipo: "SERVICIO" }>> = {}): LineaCarrito => ({ clave: "b", tipo: "SERVICIO", descripcion: "Mano de obra", cantidad: "1", precio: "40.00", descuento: "0", afectacionIgv: "GRAVADO", ...cambios });
const lineaMototaxi = (cambios: Partial<Extract<LineaCarrito, { tipo: "MOTOTAXI" }>> = {}): LineaCarrito => ({ clave: "c", tipo: "MOTOTAXI", mototaxi, cantidad: "1", precio: "9000.00", descuento: "0", afectacionIgv: "GRAVADO", ...cambios });

const clienteFactura = { cliente_tipo_de_documento: "6", cliente_numero_de_documento: "20123456789", cliente_denominacion: "ACME SAC", cliente_direccion: "Av. Lima 123" };

type Entrada = Parameters<typeof validarNuevoIngreso>[0];
const validar = (cambios: Partial<Entrada> = {}) => validarNuevoIngreso({
  tipoVenta: "REPUESTOS", tipoComprobante: "BOLETA", estadoNubefact: estadoHabilitado, fecha: HOY, hoy: HOY, clienteSeleccionado: false,
  camposNubefact: {}, total: 100, ordenServicioId: null, lineas: [lineaServicio()], ...cambios,
});
const errorDe = (cambios: Partial<Entrada>) => {
  const resultado = validar(cambios);
  if (resultado.valida) throw new Error("Se esperaba una validación fallida");
  return resultado.error;
};

describe("validarNuevoIngreso", () => {
  describe("emisión de facturas", () => {
    it("exige NubeFact habilitado para facturas", () => {
      const mensaje = "Completa las credenciales y la serie de factura de NubeFact.";
      expect(errorDe({ tipoComprobante: "FACTURA", estadoNubefact: null })).toBe(mensaje);
      expect(errorDe({ tipoComprobante: "FACTURA", estadoNubefact: { ...estadoHabilitado, emisionFacturaHabilitada: false } })).toBe(mensaje);
    });

    it("exige un cliente con RUC, razón social y dirección válidos", () => {
      const mensaje = "La factura requiere un cliente registrado con RUC válido, razón social y dirección fiscal (máximo 100 caracteres cada una).";
      const factura = { tipoComprobante: "FACTURA" as const, clienteSeleccionado: true };
      expect(errorDe({ ...factura, clienteSeleccionado: false, camposNubefact: clienteFactura })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_tipo_de_documento: "1" } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_numero_de_documento: "2012345678" } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_denominacion: "   " } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_denominacion: "A".repeat(101) } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_direccion: "" } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: { ...clienteFactura, cliente_direccion: "D".repeat(101) } })).toBe(mensaje);
      expect(errorDe({ ...factura, camposNubefact: {} })).toBe(mensaje);
    });

    it("acepta una factura con cliente válido y la clasifica como RUC", () => {
      expect(validar({ tipoComprobante: "FACTURA", clienteSeleccionado: true, camposNubefact: { ...clienteFactura, cliente_denominacion: "A".repeat(100) } })).toMatchObject({ valida: true, tipoDocInterno: "RUC" });
    });
  });

  describe("plazo de envío", () => {
    it("rechaza facturas con más de 3 días de antigüedad", () => {
      const base = { tipoComprobante: "FACTURA" as const, clienteSeleccionado: true, camposNubefact: clienteFactura };
      expect(validar({ ...base, fecha: "2026-01-17" }).valida).toBe(true);
      expect(errorDe({ ...base, fecha: "2026-01-16" })).toBe("La fecha supera el plazo de envío de 3 días para facturas.");
    });

    it("rechaza boletas con más de 5 días de antigüedad", () => {
      expect(validar({ fecha: "2026-01-15" }).valida).toBe(true);
      expect(errorDe({ fecha: "2026-01-14" })).toBe("La fecha supera el plazo de envío de 5 días para boletas enviadas individualmente por OSE.");
    });

    it("no limita la fecha de las notas de venta", () => {
      expect(validar({ tipoComprobante: "NOTA_VENTA", fecha: "2025-11-01" }).valida).toBe(true);
    });
  });

  describe("boletas mayores a S/ 700", () => {
    const mensaje = "Para una boleta mayor a S/ 700.00, busca o registra al comprador con su documento de identidad.";

    it("exigen identificar al comprador", () => {
      expect(errorDe({ total: 700.01 })).toBe(mensaje);
      expect(errorDe({ total: 800, clienteSeleccionado: true, camposNubefact: { cliente_tipo_de_documento: "", cliente_numero_de_documento: "12345678" } })).toBe(mensaje);
      expect(errorDe({ total: 800, clienteSeleccionado: true, camposNubefact: { cliente_tipo_de_documento: "1", cliente_numero_de_documento: "" } })).toBe(mensaje);
    });

    it("se aceptan con el documento del comprador o hasta S/ 700 sin él", () => {
      expect(validar({ total: 700 }).valida).toBe(true);
      expect(validar({ total: 800, clienteSeleccionado: true, camposNubefact: { cliente_tipo_de_documento: "1", cliente_numero_de_documento: "12345678" } })).toMatchObject({ valida: true, tipoDocInterno: "DNI" });
    });
  });

  describe("composición de la venta", () => {
    it("exige al menos una línea", () => {
      expect(errorDe({ lineas: [] })).toBe("Agrega al menos un repuesto o servicio.");
      expect(errorDe({ tipoVenta: "MOTOTAXIS", lineas: [] })).toBe("Agrega al menos una mototaxi para continuar con esta venta.");
    });

    it("separa la venta de mototaxis de la de repuestos", () => {
      expect(errorDe({ tipoVenta: "MOTOTAXIS", lineas: [lineaServicio()] })).toBe("Agrega al menos una mototaxi para continuar con esta venta.");
      expect(errorDe({ tipoVenta: "MOTOTAXIS", lineas: [lineaMototaxi(), lineaServicio()] })).toBe("La venta de mototaxis se registra por separado de los repuestos y servicios.");
      expect(errorDe({ lineas: [lineaServicio(), lineaMototaxi()] })).toBe("Registra la mototaxi desde el flujo de venta de mototaxis.");
    });
  });

  describe("cantidades y descuentos", () => {
    it.each(["0", "-1", "abc", "1.2345"])("rechaza la cantidad %s", (cantidad) => {
      expect(errorDe({ lineas: [lineaServicio(), lineaServicio({ cantidad })] })).toBe("Revisa la cantidad de la línea 2.");
    });

    it.each(["-1", "1.234", "40.01", "x"])("rechaza el descuento %s", (descuento) => {
      expect(errorDe({ lineas: [lineaServicio({ descuento })] })).toBe("El descuento de la línea 1 debe ser válido y no superar el importe con IGV.");
    });

    it("acepta cantidades con 3 decimales y descuentos iguales al importe", () => {
      expect(validar({ lineas: [lineaServicio({ cantidad: "1.125", precio: "10.00", descuento: "11.25" })] })).toMatchObject({ valida: true, detalles: [{ cantidad: "1.125", descuento: "11.25" }] });
    });
  });

  describe("repuestos", () => {
    it("rechaza repuestos sin precio para la lista y cantidad", () => {
      const sinPrecio = lineaProducto({ listaPrecioCodigo: "MAYOR" });
      expect(errorDe({ lineas: [sinPrecio] })).toBe("No hay precio configurado para la lista y cantidad de Filtro de aceite.");
    });

    it("envía la lista y el precio esperado cuando se vende por lista", () => {
      expect(validar({ lineas: [lineaProducto({ listaPrecioCodigo: "GENERAL", cantidad: "2", descuento: "5" })] })).toEqual({
        valida: true, tipoDocInterno: undefined,
        detalles: [{ tipo: "PRODUCTO", presentacionId: "pr1", listaPrecioCodigo: "GENERAL", precioEsperado: "30.00", cantidad: "2", descuento: "5.00", afectacionIgv: "GRAVADO" }],
      });
    });

    it("fija el precio unitario cuando la venta proviene de una orden de servicio", () => {
      expect(validar({ ordenServicioId: "os1", lineas: [lineaProducto({ listaPrecioCodigo: "GENERAL" })] })).toMatchObject({
        valida: true, detalles: [{ tipo: "PRODUCTO", precioUnitario: "30.00" }],
      });
    });

    it("usa el precio general sin enviar lista cuando la línea no la tiene", () => {
      const resultado = validar({ lineas: [lineaProducto({ afectacionIgv: "EXONERADO" })] });
      expect(resultado).toEqual({ valida: true, tipoDocInterno: undefined, detalles: [{ tipo: "PRODUCTO", presentacionId: "pr1", cantidad: "1", descuento: "0.00", afectacionIgv: "EXONERADO" }] });
    });
  });

  describe("mototaxis", () => {
    const mototaxis = (linea: LineaCarrito) => ({ tipoVenta: "MOTOTAXIS" as const, lineas: [linea] });

    it("exige cantidades enteras dentro del saldo", () => {
      expect(errorDe(mototaxis(lineaMototaxi({ cantidad: "1.5" })))).toBe("Ingresa una cantidad entera dentro del saldo de la línea 1.");
      expect(errorDe(mototaxis(lineaMototaxi({ cantidad: "3" })))).toBe("Ingresa una cantidad entera dentro del saldo de la línea 1.");
    });

    it.each(["0", "0.001", "abc", "9000.005"])("rechaza el precio %s", (precio) => {
      expect(errorDe(mototaxis(lineaMototaxi({ precio })))).toBe("Ingresa un precio de venta válido para la mototaxi de la línea 1.");
    });

    it("genera el detalle de la mototaxi", () => {
      expect(validar(mototaxis(lineaMototaxi({ cantidad: "2", descuento: "100" })))).toEqual({
        valida: true, tipoDocInterno: undefined,
        detalles: [{ tipo: "MOTOTAXI", mototaxiModeloId: "m1", cantidad: "2", precioUnitario: "9000.00", descuento: "100.00", afectacionIgv: "GRAVADO" }],
      });
    });
  });

  describe("servicios", () => {
    it("exigen descripción y precio válido", () => {
      const mensaje = "Completa la descripción y un precio válido con IGV para el servicio 1.";
      expect(errorDe({ lineas: [lineaServicio({ descripcion: "  " })] })).toBe(mensaje);
      // Un precio negativo deja el importe bajo cero, así que lo detiene primero la validación del descuento.
      expect(errorDe({ lineas: [lineaServicio({ precio: "-1" })] })).toBe("El descuento de la línea 1 debe ser válido y no superar el importe con IGV.");
      expect(errorDe({ lineas: [lineaServicio({ precio: "1.234" })] })).toBe(mensaje);
      expect(errorDe({ lineas: [lineaServicio({ precio: "abc" })] })).toBe(mensaje);
    });

    it("recortan la descripción y permiten servicios gratuitos", () => {
      expect(validar({ lineas: [lineaServicio({ descripcion: "  Diagnóstico  ", precio: "0" })] })).toEqual({
        valida: true, tipoDocInterno: undefined,
        detalles: [{ tipo: "SERVICIO", descripcion: "Diagnóstico", cantidad: "1", precioUnitario: "0", descuento: "0.00", afectacionIgv: "GRAVADO" }],
      });
    });
  });

  it.each([["1", "DNI"], ["6", "RUC"], ["4", "CE"], ["7", "PASAPORTE"], ["0", undefined], ["", undefined]])("traduce el tipo de documento %s a %s", (codigo, esperado) => {
    expect(validar({ tipoComprobante: "NOTA_VENTA", camposNubefact: { cliente_tipo_de_documento: codigo } })).toMatchObject({ valida: true, tipoDocInterno: esperado });
  });
});
