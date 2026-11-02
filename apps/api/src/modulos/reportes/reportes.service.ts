import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db, categoriasProductos, clientes, garantiasMototaxis, ingresos, ingresosDetalle, marcasProductos, movimientosStock, personas, productos, productosPresentaciones, reclamosGarantiaMototaxis, saldosStock, unidadesMedida, unidadesMototaxis } from "@magina/database";
import { fechaActualPeru } from "../../utilidades/fecha-peru";

type RangoFechas = { desde: string; hasta: string };
const comprobantesVenta = eq(ingresos.tipoComprobante, "BOLETA");

@Injectable()
export class ServicioReportes {  async resumenGerencial() {
    const hoy = fechaActualPeru();
    const desdeMes = hoy.slice(0, 8) + "01";
    const fechaDesdeGrafico = new Date(`${hoy}T00:00:00.000Z`);
    fechaDesdeGrafico.setUTCDate(fechaDesdeGrafico.getUTCDate() - 6);
    const desdeGrafico = fechaDesdeGrafico.toISOString().slice(0, 10);
    const [ventasHoy, ventasMes, notasHoy, notasMes, notasRecientes, cartera, existencias, actividadDiaria, recientes, principales, ventasPorMedioPago, mototaxis, garantias] = await Promise.all([
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(eq(ingresos.fecha, hoy), comprobantesVenta)),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(eq(ingresos.fecha, hoy), eq(ingresos.tipoComprobante, "NOTA_VENTA"))),
      db.select({ operaciones: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), eq(ingresos.tipoComprobante, "NOTA_VENTA"))),
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, cliente: ingresos.clienteNombre, medioPago: ingresos.medioPago, total: ingresos.total }).from(ingresos).where(eq(ingresos.tipoComprobante, "NOTA_VENTA")).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(6),
      db.select({ activos: sql<number>`count(*)::int` }).from(clientes).innerJoin(personas, eq(clientes.personaId, personas.id)).where(and(eq(clientes.activo, true), eq(personas.activo, true))),
      db.select({ productos: sql<number>`count(*)::int`, sinStock: sql<number>`count(*) filter (where coalesce(${saldosStock.cantidad}, 0) <= 0)::int` }).from(productos).leftJoin(saldosStock, eq(productos.id, saldosStock.productoId)).where(eq(productos.activo, true)),
      db.select({ fecha: ingresos.fecha, operaciones: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeGrafico), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresos.fecha).orderBy(asc(ingresos.fecha)),
      db.select({ id: ingresos.id, codigo: ingresos.codigo, fecha: ingresos.fecha, cliente: ingresos.clienteNombre, medioPago: ingresos.medioPago, estado: ingresos.estado, total: ingresos.total }).from(ingresos).where(comprobantesVenta).orderBy(desc(ingresos.fecha), desc(ingresos.creadoEn)).limit(6),
      db.select({ descripcion: ingresosDetalle.descripcion, tipo: ingresosDetalle.tipo, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})::numeric(16,3)`, total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)` }).from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresosDetalle.descripcion, ingresosDetalle.tipo).orderBy(desc(sql`sum(${ingresosDetalle.total})`)).limit(5),
      db.select({ medioPago: ingresos.medioPago, operaciones: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` }).from(ingresos).where(and(gte(ingresos.fecha, desdeMes), lte(ingresos.fecha, hoy), comprobantesVenta)).groupBy(ingresos.medioPago).orderBy(desc(sql`sum(${ingresos.total})`)),
      db.select({ estado: unidadesMototaxis.estado, unidades: sql<number>`count(*)::int`, costoAdquisicion: sql<string>`coalesce(sum(${unidadesMototaxis.costoAdquisicion}),0)::numeric(14,2)` }).from(unidadesMototaxis).groupBy(unidadesMototaxis.estado),
      db.select({ reclamos: sql<number>`count(*)::int`, proveedor: sql<string>`coalesce(sum(${reclamosGarantiaMototaxis.importeProveedor}),0)::numeric(14,2)`, empresa: sql<string>`coalesce(sum(${reclamosGarantiaMototaxis.importeEmpresa}),0)::numeric(14,2)` }).from(reclamosGarantiaMototaxis),
    ]);
    const dias = Array.from({ length: 7 }, (_, indice) => {
      const fecha = new Date(`${desdeGrafico}T00:00:00.000Z`);
      fecha.setUTCDate(fecha.getUTCDate() + indice);
      const iso = fecha.toISOString().slice(0, 10);
      const fila = actividadDiaria.find((item) => item.fecha === iso);
      return { fecha: iso, operaciones: Number(fila?.operaciones ?? 0), total: fila?.total ?? "0.00" };
    });
    return {
      generadoPara: hoy,
      ventasHoy: { operaciones: Number(ventasHoy[0]?.operaciones ?? 0), total: ventasHoy[0]?.total ?? "0.00" },
      ventasMes: { operaciones: Number(ventasMes[0]?.operaciones ?? 0), total: ventasMes[0]?.total ?? "0.00" },
      notasInternas: { hoy: { operaciones: Number(notasHoy[0]?.operaciones ?? 0), total: notasHoy[0]?.total ?? "0.00" }, mes: { operaciones: Number(notasMes[0]?.operaciones ?? 0), total: notasMes[0]?.total ?? "0.00" }, recientes: notasRecientes.map((nota) => ({ ...nota, cliente: nota.cliente || "Cliente varios" })) },
      clientesActivos: Number(cartera[0]?.activos ?? 0),
      inventario: { productosActivos: Number(existencias[0]?.productos ?? 0), productosSinStock: Number(existencias[0]?.sinStock ?? 0) },
      inventarioMototaxis: { unidades: mototaxis.reduce((total, fila) => total + Number(fila.unidades), 0), porEstado: mototaxis, reclamosGarantia: { cantidad: Number(garantias[0]?.reclamos ?? 0), proveedor: garantias[0]?.proveedor ?? "0.00", empresa: garantias[0]?.empresa ?? "0.00" } },
      ventasUltimosSieteDias: dias,
      ventasPorMedioPago: ventasPorMedioPago.map((pago) => ({ ...pago, operaciones: Number(pago.operaciones) })),
      ventasRecientes: recientes.map((venta) => ({ ...venta, cliente: venta.cliente || "Cliente varios" })),
      principalesArticulos: principales,
    };
  }

  async ingresos(rango: RangoFechas) {
    const condicion = and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), comprobantesVenta);
    const [resumen, pagos, productosMasVendidos, porDia, notasInternas] = await Promise.all([
      db.select({
        ventas: sql<number>`count(*)::int`,
        subtotal: sql<string>`coalesce(sum(${ingresos.subtotal}), 0)::numeric(16,2)`,
        total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)`,
      }).from(ingresos).where(condicion),
      db.select({ medioPago: ingresos.medioPago, ventas: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` })
        .from(ingresos).where(condicion).groupBy(ingresos.medioPago).orderBy(desc(sql`sum(${ingresos.total})`)),
      db.select({
        descripcion: ingresosDetalle.descripcion,
        tipo: ingresosDetalle.tipo,
        unidades: sql<string>`sum(${ingresosDetalle.cantidad})::numeric(16,3)`,
        ventas: sql<number>`count(distinct ${ingresosDetalle.ingresoId})::int`,
        total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)`,
      }).from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).where(condicion)
        .groupBy(ingresosDetalle.descripcion, ingresosDetalle.tipo).orderBy(desc(sql`sum(${ingresosDetalle.total})`)).limit(10),
      db.select({ fecha: ingresos.fecha, ventas: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` })
        .from(ingresos).where(condicion).groupBy(ingresos.fecha).orderBy(asc(ingresos.fecha)),
      db.select({ notas: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${ingresos.total}),0)::numeric(16,2)`, productos: sql<number>`count(*) filter (where exists (select 1 from ingresos_detalle d where d.ingreso_id = ${ingresos.id} and d.tipo = 'PRODUCTO'))::int`, serviciosOMototaxis: sql<number>`count(*) filter (where exists (select 1 from ingresos_detalle d where d.ingreso_id = ${ingresos.id} and d.tipo in ('SERVICIO','MOTOTAXI')))::int` })
        .from(ingresos).where(and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), eq(ingresos.tipoComprobante, "NOTA_VENTA"))),
    ]);
    const totales = resumen[0] ?? { ventas: 0, subtotal: "0.00", total: "0.00" };
    return {
      rango,
      resumen: { ventas: Number(totales.ventas), subtotal: totales.subtotal, total: totales.total, promedio: totales.ventas ? (Number(totales.total) / Number(totales.ventas)).toFixed(2) : "0.00" },
      notasInternas: notasInternas[0] ?? { notas: 0, total: "0.00", productos: 0, serviciosOMototaxis: 0 },
      porMedioPago: pagos,
      productosMasVendidos,
      porDia,
    };
  }

  async inventario(rango: RangoFechas) {
    const inicioPeriodo = new Date(`${rango.desde}T05:00:00.000Z`);
    const finPeriodo = new Date(`${rango.hasta}T05:00:00.000Z`);
    finPeriodo.setUTCDate(finPeriodo.getUTCDate() + 1);
    const movimientos = db.select({
      productoId: movimientosStock.productoId,
      entradas: sql<string>`coalesce(sum(case when ${movimientosStock.tipo} = 'ENTRADA' or (${movimientosStock.tipo} = 'AJUSTE' and ${movimientosStock.sentido} = 'INGRESO') then ${movimientosStock.cantidadBase} else 0 end), 0)::numeric(18,3)`,
      salidas: sql<string>`coalesce(sum(case when ${movimientosStock.tipo} = 'SALIDA' or (${movimientosStock.tipo} = 'AJUSTE' and ${movimientosStock.sentido} = 'RETIRO') then ${movimientosStock.cantidadBase} else 0 end), 0)::numeric(18,3)`,
    }).from(movimientosStock)
      .where(and(gte(movimientosStock.creadoEn, inicioPeriodo), lt(movimientosStock.creadoEn, finPeriodo)))
      .groupBy(movimientosStock.productoId).as("movimientos_periodo");
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
    }).from(productos)
      .innerJoin(marcasProductos, eq(productos.marcaId, marcasProductos.id))
      .innerJoin(productosPresentaciones, and(eq(productosPresentaciones.productoId, productos.id), eq(productosPresentaciones.esBase, true)))
      .innerJoin(unidadesMedida, eq(productosPresentaciones.unidadMedidaCodigo, unidadesMedida.codigo))
      .leftJoin(categoriasProductos, eq(productos.categoriaId, categoriasProductos.id))
      .leftJoin(saldosStock, eq(productos.id, saldosStock.productoId))
      .leftJoin(movimientos, eq(productos.id, movimientos.productoId))
      .where(eq(productos.activo, true)).orderBy(asc(productos.nombre));
    return {
      rango,
      resumen: {
        productos: items.length,
        productosConStock: items.filter((item) => Number(item.stockActual) > 0).length,
        sinStock: items.filter((item) => Number(item.stockActual) <= 0).length,
        productosConMovimiento: items.filter((item) => Number(item.entradasPeriodo) > 0 || Number(item.salidasPeriodo) > 0).length,
      },
      items,
    };
  }
}

