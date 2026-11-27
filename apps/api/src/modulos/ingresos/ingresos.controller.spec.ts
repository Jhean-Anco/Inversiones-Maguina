import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ControladorIngresos } from "./ingresos.controller";
import type { ServicioIngresos } from "./ingresos.service";

test("el controlador delega cada ruta en el servicio con los parámetros y el usuario autenticado", async () => {
  const llamadas: [string, unknown[]][] = [];
  const servicio = new Proxy({}, { get: (_objetivo, metodo: string) => (...argumentos: unknown[]) => { llamadas.push([metodo, argumentos]); return metodo; } }) as ServicioIngresos;
  const controlador = new ControladorIngresos(servicio);
  const solicitud = { usuario: { id: "usuario-1" } } as never;
  const cuerpo = { dato: 1 };
  const casos: [unknown, string, unknown[]][] = [
    [controlador.listarVentas("REPUESTOS", "2", "5", "x", "BOLETA", "EFECTIVO", "EMITIDAS", "true"), "listarVentas", [{ tipoVenta: "REPUESTOS", pagina: "2", porPagina: "5", busqueda: "x", tipoDocumento: "BOLETA", medioPago: "EFECTIVO", estado: "EMITIDAS", conSaldo: "true" }]],
    [controlador.buscarProductos("aceite", "1", "5", "1", "1"), "buscarProductos", ["aceite", true, "5", true, true]],
    [controlador.buscarProductos("aceite", "0", undefined, undefined, undefined), "buscarProductos", ["aceite", false, undefined, false, false]],
    [controlador.buscarMototaxisVenta("moto"), "buscarMototaxisVenta", ["moto"]],
    [controlador.obtenerNumeraciones(), "obtenerNumeraciones", []],
    [controlador.listarSeriesConfiguradas(), "listarSeriesConfiguradas", []],
    [controlador.guardarSerieConfigurada(cuerpo), "guardarSerieConfigurada", [cuerpo]],
    [controlador.listarGuias("1", "10", "TODAS", "b"), "listarGuias", ["1", "10", "TODAS", "b"]],
    [controlador.buscarDocumentosParaGuia("b", "BOLETA"), "buscarDocumentosParaGuia", ["b", "BOLETA"]],
    [controlador.obtenerDocumentoParaGuia("id"), "obtenerDocumentoParaGuia", ["id"]],
    [controlador.listarUbigeos(), "listarUbigeos", []],
    [controlador.emitirGuia(cuerpo, solicitud), "emitirGuia", [cuerpo, "usuario-1"]],
    [controlador.consultarGuia("id"), "consultarGuia", ["id"]],
    [controlador.obtenerMediosPagoDisponibles(), "mediosPagoDisponibles", []],
    [controlador.listarOrdenesServicio("b"), "listarOrdenesServicio", ["b"]],
    [controlador.crearOrdenServicio(cuerpo, solicitud), "crearOrdenServicio", [cuerpo, "usuario-1"]],
    [controlador.actualizarOrdenServicio("id", cuerpo, solicitud), "actualizarOrdenServicio", ["id", cuerpo, "usuario-1"]],
    [controlador.emitirOrdenServicio("id", cuerpo, solicitud), "emitirOrdenServicio", ["id", cuerpo, "usuario-1"]],
    [controlador.listarCotizaciones("b"), "listarCotizaciones", ["b"]],
    [controlador.crearCotizacion(cuerpo, solicitud), "crearCotizacion", [cuerpo, "usuario-1"]],
    [controlador.actualizarCotizacion("id", cuerpo), "actualizarCotizacion", ["id", cuerpo]],
    [controlador.cambiarEstadoCotizacion("id", cuerpo), "cambiarEstadoCotizacion", ["id", cuerpo]],
    [controlador.convertirCotizacion("id", cuerpo, solicitud), "convertirCotizacion", ["id", cuerpo, "usuario-1"]],
    [controlador.buscarClientes("b"), "buscarClientes", ["b"]],
    [controlador.listarClientes("1", "10", "b"), "listarClientes", ["1", "10", "b"]],
    [controlador.consultarIdentidadCliente("DNI", "12345678"), "consultarIdentidadCliente", ["DNI", "12345678"]],
    [controlador.registrarCliente(cuerpo), "registrarCliente", [cuerpo]],
    [controlador.actualizarCliente("id", cuerpo), "actualizarCliente", ["id", cuerpo]],
    [controlador.estadoNubefact(), "estadoNubefact", []],
    [controlador.crear(cuerpo, solicitud), "crear", [cuerpo, "usuario-1"]],
    [controlador.consultarEstadoComprobante("id"), "consultarEstadoComprobante", ["id"]],
    [controlador.reintentarEmision("id"), "reintentarEmision", ["id"]],
    [controlador.obtenerFuenteNota("id"), "obtenerFuenteNota", ["id"]],
    [controlador.listarNotas("id"), "listarNotas", ["id"]],
    [controlador.emitirNota("id", cuerpo, solicitud), "emitirNota", ["id", cuerpo, "usuario-1"]],
    [controlador.anularIngreso("id", cuerpo, solicitud), "anularIngreso", ["id", cuerpo, "usuario-1"]],
    [controlador.consultarAnulacionIngreso("id", solicitud), "consultarAnulacionIngreso", ["id", "usuario-1"]],
    [controlador.anularNota("id", "nota", cuerpo, solicitud), "anularNota", ["id", "nota", cuerpo, "usuario-1"]],
    [controlador.consultarAnulacionNota("id", "nota"), "consultarAnulacionNota", ["id", "nota"]],
    [controlador.listarPagos("id"), "listarPagos", ["id"]],
    [controlador.registrarPago("id", cuerpo, solicitud), "registrarPago", ["id", cuerpo, "usuario-1"]],
  ];
  casos.forEach(([resultado, metodo, argumentos], indice) => {
    assert.equal(resultado, metodo);
    assert.deepEqual(llamadas[indice], [metodo, argumentos]);
  });
});
