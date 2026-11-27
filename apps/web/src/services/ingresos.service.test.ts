import { describe, expect, it, vi } from "vitest";
import { servicioIngresos, type DatosNuevoIngreso } from "./ingresos.service";
import { probarSolicitudes, simularFetch, ultimaSolicitud } from "../test/solicitudes";

const json = "POST" as const;
const venta: DatosNuevoIngreso = { idempotencyKey: "k1", fecha: "2026-01-02", tipoComprobante: "BOLETA", medioPago: "EFECTIVO", detalles: [] };
const pago = { idempotencyKey: "p1", fechaPago: "2026-01-03", importeAplicado: "10.00", medioPago: "EFECTIVO", cuentaFinancieraId: "c1" };
const nota = { tipo: "NOTA_CREDITO" as const, lineas: [{ detalleId: "d1", monto: "5.00" }], cuentaFinancieraId: "c1", medioPago: "EFECTIVO" };

describe("servicioIngresos", () => {
  describe("guías de remisión", () => {
    probarSolicitudes([
      { nombre: "listarGuias con valores por defecto", llamar: () => servicioIngresos.listarGuias(), url: "/ingresos/guias?pagina=1&porPagina=10" },
      { nombre: "listarGuias filtra por estado y búsqueda recortada", llamar: () => servicioIngresos.listarGuias(2, 6, "PENDIENTES", "  T001 "), url: "/ingresos/guias?pagina=2&porPagina=6&estado=PENDIENTES&busqueda=T001" },
      { nombre: "listarGuias ignora búsquedas en blanco", llamar: () => servicioIngresos.listarGuias(1, 10, "TODAS", "   "), url: "/ingresos/guias?pagina=1&porPagina=10" },
      { nombre: "listarUbigeos", llamar: () => servicioIngresos.listarUbigeos(), url: "/ingresos/ubigeos" },
      { nombre: "obtenerDocumentoParaGuia", llamar: () => servicioIngresos.obtenerDocumentoParaGuia("i/1"), url: "/ingresos/guias/documentos/i%2F1" },
      { nombre: "emitirGuia", llamar: () => servicioIngresos.emitirGuia({ tipo: "REMITENTE" }), url: "/ingresos/guias", metodo: json, cuerpo: { tipo: "REMITENTE" } },
      { nombre: "consultarGuia", llamar: () => servicioIngresos.consultarGuia("g1"), url: "/ingresos/guias/g1/consultar", metodo: json },
    ]);

    it("buscarDocumentosParaGuia propaga la señal de cancelación y el tipo opcional", async () => {
      const fetchSimulado = simularFetch([]);
      const controlador = new AbortController();
      await servicioIngresos.buscarDocumentosParaGuia("B001", "BOLETA", controlador.signal);
      expect(ultimaSolicitud(fetchSimulado)).toMatchObject({ url: "/ingresos/guias/documentos?busqueda=B001&tipo=BOLETA", init: { signal: controlador.signal } });
      await servicioIngresos.buscarDocumentosParaGuia("B001", "", controlador.signal);
      expect(ultimaSolicitud(fetchSimulado).url).toBe("/ingresos/guias/documentos?busqueda=B001");
    });

    it("buscarDocumentosParaGuia rechaza cuando la búsqueda se cancela", async () => {
      const controlador = new AbortController();
      vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => new Promise((_resolver, rechazar) => {
        init?.signal?.addEventListener("abort", () => rechazar(new DOMException("Abortado", "AbortError")));
      }));
      const busqueda = servicioIngresos.buscarDocumentosParaGuia("F001", "", controlador.signal);
      controlador.abort();
      await expect(busqueda).rejects.toMatchObject({ estado: 0 });
    });
  });

  describe("órdenes de servicio y cotizaciones", () => {
    probarSolicitudes([
      { nombre: "mediosPagoDisponibles", llamar: () => servicioIngresos.mediosPagoDisponibles(), url: "/ingresos/medios-pago" },
      { nombre: "listarOrdenesServicio", llamar: () => servicioIngresos.listarOrdenesServicio(), url: "/ingresos/ordenes-servicio?busqueda=" },
      { nombre: "listarOrdenesServicio con búsqueda", llamar: () => servicioIngresos.listarOrdenesServicio("ABC-123"), url: "/ingresos/ordenes-servicio?busqueda=ABC-123" },
      { nombre: "crearOrdenServicio", llamar: () => servicioIngresos.crearOrdenServicio({ motivo: "Afinado" }), url: "/ingresos/ordenes-servicio", metodo: json, cuerpo: { motivo: "Afinado" } },
      { nombre: "actualizarOrdenServicio", llamar: () => servicioIngresos.actualizarOrdenServicio("o1", { estado: "EN_PROCESO" }), url: "/ingresos/ordenes-servicio/o1", metodo: "PATCH", cuerpo: { estado: "EN_PROCESO" } },
      { nombre: "emitirOrdenServicio", llamar: () => servicioIngresos.emitirOrdenServicio("o1", { tipoComprobante: "BOLETA", medioPago: "EFECTIVO" }), url: "/ingresos/ordenes-servicio/o1/emitir", metodo: json, cuerpo: { tipoComprobante: "BOLETA", medioPago: "EFECTIVO" } },
      { nombre: "listarCotizaciones", llamar: () => servicioIngresos.listarCotizaciones(), url: "/ingresos/cotizaciones?busqueda=" },
      { nombre: "listarCotizaciones con búsqueda", llamar: () => servicioIngresos.listarCotizaciones("COT 1"), url: "/ingresos/cotizaciones?busqueda=COT%201" },
      { nombre: "crearCotizacion", llamar: () => servicioIngresos.crearCotizacion({ observacion: "x" }), url: "/ingresos/cotizaciones", metodo: json, cuerpo: { observacion: "x" } },
      { nombre: "actualizarCotizacion", llamar: () => servicioIngresos.actualizarCotizacion("c1", { observacion: "y" }), url: "/ingresos/cotizaciones/c1", metodo: "PATCH", cuerpo: { observacion: "y" } },
      { nombre: "cambiarEstadoCotizacion", llamar: () => servicioIngresos.cambiarEstadoCotizacion("c1", "ENVIADA"), url: "/ingresos/cotizaciones/c1/estado", metodo: "PATCH", cuerpo: { estado: "ENVIADA" } },
      { nombre: "convertirCotizacion", llamar: () => servicioIngresos.convertirCotizacion("c1", { tipoComprobante: "FACTURA", medioPago: "TARJETA" }), url: "/ingresos/cotizaciones/c1/convertir", metodo: json, cuerpo: { tipoComprobante: "FACTURA", medioPago: "TARJETA" } },
    ]);
  });

  describe("ventas y comprobantes", () => {
    probarSolicitudes([
      { nombre: "listarVentas con valores por defecto", llamar: () => servicioIngresos.listarVentas("REPUESTOS"), url: "/ingresos?tipoVenta=REPUESTOS&pagina=1&porPagina=10&busqueda=&tipoDocumento=&medioPago=&estado=TODAS&conSaldo=false" },
      { nombre: "listarVentas con filtros", llamar: () => servicioIngresos.listarVentas("MOTOTAXIS", 3, 8, "ana", "FACTURA", "YAPE", "PENDIENTES", true), url: "/ingresos?tipoVenta=MOTOTAXIS&pagina=3&porPagina=8&busqueda=ana&tipoDocumento=FACTURA&medioPago=YAPE&estado=PENDIENTES&conSaldo=true" },
      { nombre: "reintentarEmision", llamar: () => servicioIngresos.reintentarEmision("i1"), url: "/ingresos/i1/reintentar-emision", metodo: json },
      { nombre: "consultarEstadoComprobante", llamar: () => servicioIngresos.consultarEstadoComprobante("i1"), url: "/ingresos/i1/consultar-estado", metodo: json },
      { nombre: "listarNotas", llamar: () => servicioIngresos.listarNotas("i1"), url: "/ingresos/i1/notas" },
      { nombre: "anularIngreso", llamar: () => servicioIngresos.anularIngreso("i1", "Error de digitación", true), url: "/ingresos/i1/anulacion", metodo: json, cuerpo: { motivo: "Error de digitación", confirmoNoEntregado: true } },
      { nombre: "consultarAnulacionIngreso", llamar: () => servicioIngresos.consultarAnulacionIngreso("i1"), url: "/ingresos/i1/anulacion/consultar", metodo: json },
      { nombre: "anularNota", llamar: () => servicioIngresos.anularNota("i1", "n1", "Duplicada", false), url: "/ingresos/i1/notas/n1/anulacion", metodo: json, cuerpo: { motivo: "Duplicada", confirmoNoEntregado: false } },
      { nombre: "consultarAnulacionNota", llamar: () => servicioIngresos.consultarAnulacionNota("i1", "n1"), url: "/ingresos/i1/notas/n1/anulacion/consultar", metodo: json },
      { nombre: "fuenteNota", llamar: () => servicioIngresos.fuenteNota("i1"), url: "/ingresos/i1/notas/fuente" },
      { nombre: "emitirNota", llamar: () => servicioIngresos.emitirNota("i1", nota), url: "/ingresos/i1/notas", metodo: json, cuerpo: nota },
      { nombre: "estadoNubefact", llamar: () => servicioIngresos.estadoNubefact(), url: "/ingresos/nubefact/estado" },
      { nombre: "numeraciones", llamar: () => servicioIngresos.numeraciones(), url: "/ingresos/series" },
      { nombre: "crear venta", llamar: () => servicioIngresos.crear(venta), url: "/ingresos", metodo: json, cuerpo: venta },
      { nombre: "listarPagos", llamar: () => servicioIngresos.listarPagos("i1"), url: "/ingresos/i1/pagos" },
      { nombre: "listarPagos a una fecha", llamar: () => servicioIngresos.listarPagos("i1", "2026-01-31"), url: "/ingresos/i1/pagos?fechaEvaluacion=2026-01-31" },
      { nombre: "registrarPago", llamar: () => servicioIngresos.registrarPago("i1", pago), url: "/ingresos/i1/pagos", metodo: json, cuerpo: pago },
    ]);
  });

  describe("catálogo y clientes", () => {
    probarSolicitudes([
      { nombre: "buscarProductos simple", llamar: () => servicioIngresos.buscarProductos("filtro aceite"), url: "/ingresos/productos?busqueda=filtro%20aceite&limite=10" },
      { nombre: "buscarProductos con banderas", llamar: () => servicioIngresos.buscarProductos("775", true, true, true), url: "/ingresos/productos?busqueda=775&limite=10&catalogo=1&escaneo=1&paraVenta=1" },
      { nombre: "buscarMototaxis", llamar: () => servicioIngresos.buscarMototaxis("bajaj"), url: "/ingresos/mototaxis?busqueda=bajaj" },
      { nombre: "buscarClientes", llamar: () => servicioIngresos.buscarClientes("Pérez"), url: "/ingresos/clientes?busqueda=P%C3%A9rez" },
      { nombre: "listarClientes con valores por defecto", llamar: () => servicioIngresos.listarClientes(), url: "/ingresos/clientes/listado?pagina=1&porPagina=10&busqueda=" },
      { nombre: "listarClientes", llamar: () => servicioIngresos.listarClientes(2, 4, "ana"), url: "/ingresos/clientes/listado?pagina=2&porPagina=4&busqueda=ana" },
      { nombre: "consultarIdentidadCliente delega en identidad", llamar: () => servicioIngresos.consultarIdentidadCliente("DNI", "12345678"), url: "/personas/consulta-identidad?tipoDocumento=DNI&numeroDocumento=12345678" },
      { nombre: "registrarCliente", llamar: () => servicioIngresos.registrarCliente({ tipoDocumento: "DNI", numeroDocumento: "12345678", nombres: "Ana" }), url: "/ingresos/clientes", metodo: json, cuerpo: { tipoDocumento: "DNI", numeroDocumento: "12345678", nombres: "Ana" } },
      { nombre: "actualizarCliente", llamar: () => servicioIngresos.actualizarCliente("cl/1", { telefono: "999" }), url: "/ingresos/clientes/cl%2F1", metodo: "PATCH", cuerpo: { telefono: "999" } },
    ]);
  });

  describe("edición de notas de venta", () => {
    const cambios = { versionDocumento: "v1", fecha: "2026-01-02", medioPago: "EFECTIVO", observacion: null, detalles: [] };
    probarSolicitudes([
      { nombre: "obtenerNotaVenta codifica el identificador", llamar: () => servicioIngresos.obtenerNotaVenta("n/1"), url: "/ingresos/n%2F1/nota-venta" },
      { nombre: "editarNotaVenta envía un PATCH", llamar: () => servicioIngresos.editarNotaVenta("n1", cambios), url: "/ingresos/n1/nota-venta", metodo: "PATCH", cuerpo: cambios },
    ]);
  });
});
