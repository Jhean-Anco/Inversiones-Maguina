import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gt, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db, categoriasProductos, clientes, comprasMototaxisDetalle, comprobantesRelacionados, comprobantesRelacionadosDetalle, entradasStockDetalle, garantiasMototaxis, ingresos, ingresosDetalle, marcasProductos, modelosMototaxis, movimientosModelosMototaxis, movimientosStock, ordenesServicio, personas, productos, productosPresentaciones, reclamosGarantiaMototaxis, saldosStock, unidadesMedida } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";
import { consultarFlujoAdelantos, consultarFlujoNotasDebito, consultarFlujoPorComprobante, ventaVigente, type RangoFechas } from "./flujo-ingresos.consultas";
import { aplicarPermisosDeCosto, sumarFlujosDiarios } from "./reportes.util";
import { consultarRentabilidad } from "./rentabilidad.consultas";
import { consultarCobranza } from "./cobranza.consultas";
import { consultarHorarios } from "./horarios.consultas";
import { consultarArticulosMasVendidos } from "./articulos.consultas";

/** Ventas del dashboard: boletas, facturas y notas de venta que no estén anuladas. */
const comprobantesVenta = and(inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA", "NOTA_VENTA"]), ventaVigente);
const comprobantesIngresosAceptados = and(
  or(and(inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA"]), eq(ingresos.estado, "EMITIDO")),
    and(eq(ingresos.tipoComprobante, "NOTA_VENTA"), eq(ingresos.estado, "REGISTRADO"))),
  ventaVigente,
);

@Injectable()
export class ServicioReportes {  async resumenGerencial(permisos: string[]) {
    const hoy = fechaActualPeru();
    const desdeMes = hoy.slice(0, 8) + "01";
    const fechaDesdeGrafico = new Date(`${hoy}T00:00:00.000Z`);
    fechaDesdeGrafico.setUTCDate(fechaDesdeGrafico.getUTCDate() - 6);
    const desdeGrafico = fechaDesdeGrafico.toISOString().slice(0, 10);
    const [ventasHoy, ventasMes, notasHoy, notasMes, notasRecientes, cartera, existencias, actividadDiaria, recientes, principales, ventasPorMedioPago, mototaxis, garantias] = await Promise.all([
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(eq(ingresos.fecha, hoy), comprobantesVenta)),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(eq(ingresos.fecha, hoy), and(eq(ingresos.tipoComprobante, "NOTA_VENTA"), ventaVigente))),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), and(eq(ingresos.tipoComprobante, "NOTA_VENTA"), ventaVigente))),
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, cliente: ingresos.clienteNombre, medioPago: ingresos.medioPago, total: ingresos.total }).from(ingresos).where(and(eq(ingresos.tipoComprobante, "NOTA_VENTA"), ventaVigente)).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(6),
      db.select({ activos: sql<number>`count(*)::int` }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id)).where(and(eq(clientes.activo, true), eq(personas.activo, true))),
      db.select({ productos: sql<number>`count(*)::int`, sinStock: sql<number>`count(*) filter (where coalesce(${saldosStock.cantidad}, 0) <= 0)::int` }).from(productos).leftJoin(saldosStock, eq(productos.id, saldosStock.productoId)).where(eq(productos.activo, true)),
      db.select({ fecha: ingresos.fecha, operaciones: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeGrafico), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresos.fecha).orderBy(asc(ingresos.fecha)),
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, cliente: ingresos.clienteNombre, medioPago: ingresos.medioPago, estado: ingresos.estado, total: ingresos.total }).from(ingresos).where(comprobantesVenta).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(6),
      db.select({ descripcion: ingresosDetalle.descripcion, tipo: ingresosDetalle.tipo, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})::numeric(16,3)`, total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)` }).from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresosDetalle.descripcion, ingresosDetalle.tipo).orderBy(desc(sql`sum(${ingresosDetalle.total})`)).limit(12),
      db.select({ medioPago: ingresos.medioPago, operaciones: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresos.medioPago).orderBy(desc(sql`sum(${ingresos.total})`)),
      db.select({ id: modelosMototaxis.id, marca: marcasProductos.nombre, modelo: modelosMototaxis.nombre, version: modelosMototaxis.version, unidades: modelosMototaxis.stockDisponible })
        .from(modelosMototaxis).innerJoin(marcasProductos, eq(marcasProductos.id, modelosMototaxis.marcaId))
        .where(gte(modelosMototaxis.stockDisponible, 1)).orderBy(desc(modelosMototaxis.stockDisponible), asc(modelosMototaxis.nombre)),
      db.select({ reclamos: sql<number>`count(*)::int`, proveedor: sql<string>`coalesce(sum(${reclamosGarantiaMototaxis.importeProveedor}),0)::numeric(14,2)`, empresa: sql<string>`coalesce(sum(${reclamosGarantiaMototaxis.importeEmpresa}),0)::numeric(14,2)` }).from(reclamosGarantiaMototaxis),
    ]);
    const dias = Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(`${desdeGrafico}T00:00:00.000Z`);
      fecha.setUTCDate(fecha.getUTCDate() + indice);
      const iso = fecha.toISOString().slice(0, 10);
      const fila = actividadDiaria.find((item) => item.fecha === iso);
      return { fecha: iso, operaciones: Number(fila?.operaciones ?? 0), total: fila?.total ?? "0.00" };
    });
    const puedeLeerIngresos = permisos.includes("INGRESOS.LEER");
    const puedeLeerPersonas = permisos.includes("PERSONAS.LEER");
    const puedeLeerInventario = permisos.includes("INVENTARIO.LEER");
    const puedeLeerMototaxis = permisos.includes("MOTOTAXIS.LEER");
    return {
      generadoPara: hoy,
      ...(puedeLeerIngresos ? {
        ventasHoy: { operaciones: Number(ventasHoy[0]?.operaciones ?? 0), total: ventasHoy[0]?.total ?? "0.00" },
        ventasMes: { operaciones: Number(ventasMes[0]?.operaciones ?? 0), total: ventasMes[0]?.total ?? "0.00" },
        notasInternas: { hoy: { operaciones: Number(notasHoy[0]?.operaciones ?? 0), total: notasHoy[0]?.total ?? "0.00" }, mes: { operaciones: Number(notasMes[0]?.operaciones ?? 0), total: notasMes[0]?.total ?? "0.00" }, recientes: notasRecientes.map((nota) => ({ ...nota, cliente: nota.cliente || "Cliente varios" })) },
        ventasUltimosSieteDias: dias,
        ventasPorMedioPago: ventasPorMedioPago.map((pago) => ({ ...pago, operaciones: Number(pago.operaciones) })),
        ventasRecientes: recientes.map((venta) => ({ ...venta, cliente: venta.cliente || "Cliente varios" })),
        principalesArticulos: principales,
      } : {}),
      ...(puedeLeerPersonas ? { clientesActivos: Number(cartera[0]?.activos ?? 0) } : {}),
      ...(puedeLeerInventario ? { inventario: { productosActivos: Number(existencias[0]?.productos ?? 0), productosSinStock: Number(existencias[0]?.sinStock ?? 0) } } : {}),
      ...(puedeLeerMototaxis ? { inventarioMototaxis: { unidades: mototaxis.reduce((total, fila) => total + Number(fila.unidades), 0), porModelo: mototaxis, reclamosGarantia: { cantidad: Number(garantias[0]?.reclamos ?? 0), proveedor: garantias[0]?.proveedor ?? "0.00", empresa: garantias[0]?.empresa ?? "0.00" } } } : {}),
    };
  }

  async reporteIngresos(rango: RangoFechas, linea?: "PRODUCTO" | "MOTOTAXI" | "SERVICIO") {
    const filtroVentas = and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), comprobantesIngresosAceptados,
      ...(linea ? [eq(ingresosDetalle.tipo, linea)] : []));
    const ventasPorMes = await db.select({
      mes: sql<string>`to_char(date_trunc('month', ${ingresos.fecha}::date), 'YYYY-MM')`,
      documentos: sql<number>`count(distinct ${ingresos.id})::int`,
      total: sql<string>`coalesce(sum(${ingresosDetalle.total}), 0)::numeric(16,2)`,
    }).from(ingresos).innerJoin(ingresosDetalle, eq(ingresosDetalle.ingresoId, ingresos.id))
      .where(filtroVentas).groupBy(sql`date_trunc('month', ${ingresos.fecha}::date)`).orderBy(asc(sql`date_trunc('month', ${ingresos.fecha}::date)`));

    const filtroNotas = and(gte(comprobantesRelacionados.fecha, rango.desde), lte(comprobantesRelacionados.fecha, rango.hasta),
      eq(comprobantesRelacionados.tipoComprobante, "NOTA_CREDITO"), inArray(comprobantesRelacionados.estado, ["EMITIDO", "ANULACION_PENDIENTE"]),
      sql`${comprobantesRelacionados.datosNubefact}->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'`,
      ...(linea ? [eq(ingresosDetalle.tipo, linea)] : []));
    const notasPorMes = linea
      ? await db.select({
        mes: sql<string>`to_char(date_trunc('month', ${comprobantesRelacionados.fecha}::date), 'YYYY-MM')`,
        documentos: sql<number>`count(distinct ${comprobantesRelacionados.id})::int`,
        total: sql<string>`coalesce(sum((select coalesce(sum((item.valor->>'montoAjuste')::numeric), 0) from jsonb_array_elements(coalesce(${comprobantesRelacionados.datosNubefact}->'lineasOrigen', '[]'::jsonb)) as item(valor) where item.valor->>'ingresoDetalleId' = ${ingresosDetalle.id}::text)), 0)::numeric(16,2)`,
      }).from(comprobantesRelacionados)
        .innerJoin(comprobantesRelacionadosDetalle, eq(comprobantesRelacionadosDetalle.comprobanteRelacionadoId, comprobantesRelacionados.id))
        .innerJoin(ingresosDetalle, eq(ingresosDetalle.id, comprobantesRelacionadosDetalle.ingresoDetalleId))
        .where(filtroNotas).groupBy(sql`date_trunc('month', ${comprobantesRelacionados.fecha}::date)`).orderBy(asc(sql`date_trunc('month', ${comprobantesRelacionados.fecha}::date)`))
      : await db.select({
        mes: sql<string>`to_char(date_trunc('month', ${comprobantesRelacionados.fecha}::date), 'YYYY-MM')`,
        documentos: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${comprobantesRelacionados.total}), 0)::numeric(16,2)`,
      }).from(comprobantesRelacionados).where(filtroNotas)
        .groupBy(sql`date_trunc('month', ${comprobantesRelacionados.fecha}::date)`).orderBy(asc(sql`date_trunc('month', ${comprobantesRelacionados.fecha}::date)`));

    const ventasPorTipo = await db.select({
      tipo: ingresos.tipoComprobante,
      documentos: sql<number>`count(distinct ${ingresos.id})::int`,
      total: sql<string>`coalesce(sum(${ingresosDetalle.total}), 0)::numeric(16,2)`,
    }).from(ingresos).innerJoin(ingresosDetalle, eq(ingresosDetalle.ingresoId, ingresos.id))
      .where(filtroVentas).groupBy(ingresos.tipoComprobante);
    const notasPorTipo = linea
      ? await db.select({
        documentos: sql<number>`count(distinct ${comprobantesRelacionados.id})::int`,
        total: sql<string>`coalesce(sum((select coalesce(sum((item.valor->>'montoAjuste')::numeric), 0) from jsonb_array_elements(coalesce(${comprobantesRelacionados.datosNubefact}->'lineasOrigen', '[]'::jsonb)) as item(valor) where item.valor->>'ingresoDetalleId' = ${ingresosDetalle.id}::text)), 0)::numeric(16,2)`,
      }).from(comprobantesRelacionados)
        .innerJoin(comprobantesRelacionadosDetalle, eq(comprobantesRelacionadosDetalle.comprobanteRelacionadoId, comprobantesRelacionados.id))
        .innerJoin(ingresosDetalle, eq(ingresosDetalle.id, comprobantesRelacionadosDetalle.ingresoDetalleId)).where(filtroNotas)
      : await db.select({
        documentos: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${comprobantesRelacionados.total}), 0)::numeric(16,2)`,
      }).from(comprobantesRelacionados).where(filtroNotas);

    const ingresosBrutos = ventasPorTipo.reduce((suma, fila) => suma + Number(fila.total), 0);
    const cantidadVentas = ventasPorTipo.reduce((suma, fila) => suma + Number(fila.documentos), 0);
    const creditos = Number(notasPorTipo[0]?.total ?? 0);
    const cantidadCreditos = Number(notasPorTipo[0]?.documentos ?? 0);
    const totalNeto = ingresosBrutos - creditos;
    const tipos: Record<string, { documentos: number; total: number }> = Object.fromEntries(ventasPorTipo.map((fila) => [fila.tipo, { documentos: Number(fila.documentos), total: Number(fila.total) }]));
    const porMes = new Map<string, { ingresos: number; creditos: number }>();
    for (const fila of ventasPorMes) porMes.set(fila.mes, { ingresos: Number(fila.total), creditos: 0 });
    for (const fila of notasPorMes) {
      const actual = porMes.get(fila.mes) ?? { ingresos: 0, creditos: 0 };
      actual.creditos = Number(fila.total); porMes.set(fila.mes, actual);
    }
    const porDocumento = [
      { tipo: "FACTURA", etiqueta: "Factura", documentos: tipos.FACTURA?.documentos ?? 0, total: tipos.FACTURA?.total ?? 0 },
      { tipo: "BOLETA", etiqueta: "Boleta de venta", documentos: tipos.BOLETA?.documentos ?? 0, total: tipos.BOLETA?.total ?? 0 },
      { tipo: "NOTA_VENTA", etiqueta: "Nota de venta", documentos: tipos.NOTA_VENTA?.documentos ?? 0, total: tipos.NOTA_VENTA?.total ?? 0 },
      { tipo: "NOTA_CREDITO", etiqueta: "Nota de crédito", documentos: -cantidadCreditos, total: -creditos },
    ];
    const inicioMes = new Date(`${rango.desde.slice(0, 7)}-01T00:00:00.000Z`);
    const finMes = new Date(`${rango.hasta.slice(0, 7)}-01T00:00:00.000Z`);
    const meses: string[] = [];
    for (const cursor = new Date(inicioMes); cursor <= finMes; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) meses.push(cursor.toISOString().slice(0, 7));
    return {
      rango,
      linea: linea ?? "TODAS",
      resumen: { totalNeto: totalNeto.toFixed(2), documentosNetos: cantidadVentas - cantidadCreditos, ticketPromedio: cantidadVentas - cantidadCreditos > 0 ? (totalNeto / (cantidadVentas - cantidadCreditos)).toFixed(2) : "0.00" },
      porMes: meses.map((mes) => { const datos = porMes.get(mes) ?? { ingresos: 0, creditos: 0 }; return { mes, total: (datos.ingresos - datos.creditos).toFixed(2) }; }),
      porDocumento: porDocumento.map((fila) => ({ ...fila, total: fila.total.toFixed(2) })),
    };
  }

  async ingresosDashboard(mes: RangoFechas, anual: RangoFechas) {
    const fechasMes = and(gte(ingresos.fecha, mes.desde), lte(ingresos.fecha, mes.hasta), comprobantesVenta);
    const fechasAnuales = and(gte(ingresos.fecha, anual.desde), lte(ingresos.fecha, anual.hasta));
    const documentosAnuales = and(fechasAnuales, inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA", "NOTA_VENTA"]), ventaVigente);
    const [porMedioPago, flujoPorComprobante, flujoPorConcepto, flujoPorNotaDebito, flujoPorAdelanto] = await Promise.all([
      db.select({ medioPago: ingresos.medioPago, ventas: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` })
        .from(ingresos).where(fechasMes).groupBy(ingresos.medioPago).orderBy(desc(sql`sum(${ingresos.total})`)),
      consultarFlujoPorComprobante(anual),
      db.select({ fecha: ingresos.fecha, tipo: ingresosDetalle.tipo, total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)` })
        .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
        .where(documentosAnuales).groupBy(ingresos.fecha, ingresosDetalle.tipo).orderBy(asc(ingresos.fecha), asc(ingresosDetalle.tipo)),
      consultarFlujoNotasDebito(anual),
      consultarFlujoAdelantos(anual),
    ]);
    return {
      mes: { porMedioPago },
      anual: { rango: anual, flujoPorComprobante, flujoPorConcepto, flujoPorNotaDebito, flujoPorAdelanto },
    };
  }

  /**
   * Ingreso total por día en un rango, con la misma definición que el gráfico de ingresos del dashboard
   * (documentos de venta + notas de débito + adelantos de órdenes sin facturar). Solo devuelve días con movimiento.
   */
  async ingresosComparativo(rango: RangoFechas) {
    const [comprobantes, notasDebito, adelantos] = await Promise.all([
      consultarFlujoPorComprobante(rango),
      consultarFlujoNotasDebito(rango),
      consultarFlujoAdelantos(rango),
    ]);
    return { rango, dias: sumarFlujosDiarios(comprobantes, notasDebito, adelantos) };
  }

  /** Artículos más vendidos del rango y total de ventas del mismo rango. */
  articulosMasVendidos(rango: RangoFechas, limite = 12) { return consultarArticulosMasVendidos(rango, limite); }

  /** Ventas por día de la semana y hora, para el mapa de calor. */
  horarios(rango: RangoFechas) { return consultarHorarios(rango); }

  /** Lo vendido en el rango y lo ya cobrado de esas ventas. */
  cobranza(rango: RangoFechas) { return consultarCobranza(rango); }

  /** Ventas por categoría con su costo y margen. El costo solo se devuelve a quien tiene permiso sobre inventario o mototaxis. */
  async rentabilidad(rango: RangoFechas, permisos: string[] = []) {
    const filas = await consultarRentabilidad(rango);
    return { rango, filas: aplicarPermisosDeCosto(filas, { inventario: permisos.includes("INVENTARIO.LEER"), mototaxis: permisos.includes("MOTOTAXIS.LEER") }) };
  }

  async inventario(rango: RangoFechas, permisos: string[] = []) {
    const inicioPeriodo = new Date(`${rango.desde}T05:00:00.000Z`);
    const finPeriodo = new Date(`${rango.hasta}T05:00:00.000Z`);
    finPeriodo.setUTCDate(finPeriodo.getUTCDate() + 1);
    const movimientos = db.select({
      productoId: movimientosStock.productoId,
      entradas: sql<string>`coalesce(sum(case when ${movimientosStock.tipo} = 'ENTRADA' or (${movimientosStock.tipo} = 'AJUSTE' and ${movimientosStock.sentido} = 'INGRESO') then ${movimientosStock.cantidadBase} else 0 end), 0)::numeric(18,3)`.as("entradas"),
      salidas: sql<string>`coalesce(sum(case when ${movimientosStock.tipo} = 'SALIDA' or (${movimientosStock.tipo} = 'AJUSTE' and ${movimientosStock.sentido} = 'RETIRO') then ${movimientosStock.cantidadBase} else 0 end), 0)::numeric(18,3)`.as("salidas"),
    }).from(movimientosStock)
      .where(and(gte(movimientosStock.creadoEn, inicioPeriodo), lt(movimientosStock.creadoEn, finPeriodo)))
      .groupBy(movimientosStock.productoId).as("movimientos_periodo");
    const promediosCompra = db.select({
      productoId: entradasStockDetalle.productoId,
      precio: sql<string>`coalesce(sum(${entradasStockDetalle.subtotal}) / nullif(sum(${entradasStockDetalle.cantidadBase}), 0), 0)::numeric(18,6)`.as("precio_promedio_compra"),
    }).from(entradasStockDetalle).groupBy(entradasStockDetalle.productoId).as("promedios_compra_producto");
    const promediosVenta = db.select({
      productoId: ingresosDetalle.productoId,
      precio: sql<string>`coalesce(sum(${ingresosDetalle.total}) / nullif(sum(${ingresosDetalle.cantidadBase}), 0), 0)::numeric(18,6)`.as("precio_promedio_venta"),
    }).from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
      .where(and(eq(ingresosDetalle.tipo, "PRODUCTO"), sql`${ingresos.estado} <> 'ANULADO'`))
      .groupBy(ingresosDetalle.productoId).as("promedios_venta_producto");
    const items = await db.select({
      id: productos.id,
      codigo: productos.codigoInterno,
      nombre: productos.nombre,
      marca: marcasProductos.nombre,
      categoria: categoriasProductos.nombre,
      unidad: unidadesMedida.nombre,
      stockActual: sql<string>`coalesce(${saldosStock.cantidad}, 0)::numeric(18,3)`,
      entradasPeriodo: sql<string>`coalesce(${movimientos.entradas}, 0)::numeric(18,3)`,
      salidasPeriodo: sql<string>`coalesce(${movimientos.salidas}, 0)::numeric(18,3)`,
      precioPromedioCompra: sql<string>`coalesce(${promediosCompra.precio}, 0)::numeric(18,6)`,
      precioPromedioVenta: sql<string>`coalesce(${promediosVenta.precio}, 0)::numeric(18,6)`,
    }).from(productos)
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(productosPresentaciones, and(eq(productosPresentaciones.productoId, productos.id), eq(productosPresentaciones.esBase, true)))
      .innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
      .leftJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
      .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
      .leftJoin(movimientos, eq(productos.id, movimientos.productoId))
      .leftJoin(promediosCompra, eq(productos.id, promediosCompra.productoId))
      .leftJoin(promediosVenta, eq(productos.id, promediosVenta.productoId))
      .where(eq(productos.activo, true)).orderBy(asc(productos.nombre));
    const puedeLeerMototaxis = permisos.includes("MOTOTAXIS.LEER");
    const promediosCompraMototaxi = db.select({
      modeloId: comprasMototaxisDetalle.modeloId,
      precio: sql<string>`coalesce(sum(${comprasMototaxisDetalle.costoUnitario} * ${comprasMototaxisDetalle.cantidad}) / nullif(sum(${comprasMototaxisDetalle.cantidad}), 0), 0)::numeric(18,6)`.as("precio_promedio_compra"),
    }).from(comprasMototaxisDetalle).groupBy(comprasMototaxisDetalle.modeloId).as("promedios_compra_mototaxi");
    const promediosVentaMototaxi = db.select({
      modeloId: ingresosDetalle.mototaxiModeloId,
      precio: sql<string>`coalesce(sum(${ingresosDetalle.total}) / nullif(sum(${ingresosDetalle.cantidad}), 0), 0)::numeric(18,6)`.as("precio_promedio_venta"),
    }).from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id))
      .where(and(eq(ingresosDetalle.tipo, "MOTOTAXI"), sql`${ingresos.estado} <> 'ANULADO'`))
      .groupBy(ingresosDetalle.mototaxiModeloId).as("promedios_venta_mototaxi");
    const modelos = puedeLeerMototaxis ? await db.select({
      id: modelosMototaxis.id,
      codigo: modelosMototaxis.codigo,
      nombre: modelosMototaxis.nombre,
      version: modelosMototaxis.version,
      marca: marcasProductos.nombre,
      stockActual: modelosMototaxis.stockDisponible,
      entradasPeriodo: sql<number>`coalesce(sum(case when ${movimientosModelosMototaxis.tipo} in ('COMPRA', 'ANULACION_VENTA') or (${movimientosModelosMototaxis.tipo} = 'AJUSTE' and ${movimientosModelosMototaxis.cantidadFinal} > ${movimientosModelosMototaxis.cantidadAnterior}) then ${movimientosModelosMototaxis.cantidadFinal} - ${movimientosModelosMototaxis.cantidadAnterior} else 0 end), 0)::int`,
      salidasPeriodo: sql<number>`coalesce(sum(case when ${movimientosModelosMototaxis.tipo} = 'VENTA' or (${movimientosModelosMototaxis.tipo} = 'AJUSTE' and ${movimientosModelosMototaxis.cantidadFinal} < ${movimientosModelosMototaxis.cantidadAnterior}) then ${movimientosModelosMototaxis.cantidadAnterior} - ${movimientosModelosMototaxis.cantidadFinal} else 0 end), 0)::int`,
      precioPromedioCompra: sql<string>`coalesce(${promediosCompraMototaxi.precio}, 0)::numeric(18,6)`,
      precioPromedioVenta: sql<string>`coalesce(${promediosVentaMototaxi.precio}, 0)::numeric(18,6)`,
    }).from(modelosMototaxis)
      .innerJoin(marcasProductos, eq(modelosMototaxis.marcaId, marcasProductos.id))
      .leftJoin(movimientosModelosMototaxis, and(eq(modelosMototaxis.id, movimientosModelosMototaxis.modeloId), gte(movimientosModelosMototaxis.creadoEn, inicioPeriodo), lt(movimientosModelosMototaxis.creadoEn, finPeriodo)))
      .leftJoin(promediosCompraMototaxi, eq(modelosMototaxis.id, promediosCompraMototaxi.modeloId))
      .leftJoin(promediosVentaMototaxi, eq(modelosMototaxis.id, promediosVentaMototaxi.modeloId))
      .where(eq(modelosMototaxis.activo, true)).groupBy(modelosMototaxis.id, marcasProductos.nombre).orderBy(asc(modelosMototaxis.nombre)) : [];
    return {
      rango,
      resumen: {
        productos: items.length,
        productosConStock: items.filter((item) => Number(item.stockActual) > 0).length,
        sinStock: items.filter((item) => Number(item.stockActual) <= 0).length,
        productosConMovimiento: items.filter((item) => Number(item.entradasPeriodo) > 0 || Number(item.salidasPeriodo) > 0).length,
      },
      items,
      ...(puedeLeerMototaxis ? { mototaxis: {
        resumen: { modelos: modelos.length, modelosConStock: modelos.filter((modelo) => modelo.stockActual > 0).length, sinStock: modelos.filter((modelo) => modelo.stockActual <= 0).length, modelosConMovimiento: modelos.filter((modelo) => modelo.entradasPeriodo > 0 || modelo.salidasPeriodo > 0).length },
        items: modelos.map((modelo) => ({ ...modelo, nombre: modelo.version ? `${modelo.nombre} ${modelo.version}` : modelo.nombre })),
      } } : {}),
    };
  }
}

