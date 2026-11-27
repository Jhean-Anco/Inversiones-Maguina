import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { comprobantesRelacionados, db, ingresos, ingresosDetalle } from "@magina/database";
import { and, asc, eq } from "drizzle-orm";
import { ServicioEmpresa } from "../empresa/empresa.service";
import { documentoDesdeTrama, documentoNotaVenta } from "./construir-documento";
import { evaluarImpresionElectronica } from "./impresion.politica";
import type { DocumentoImprimible } from "./representacion-impresa";

const uuidValido = (valor: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

/** "B001-000012" del comprobante de origen según la trama enviada a NubeFact; si no existe, su código interno. */
export function codigoOrigen(datosNubefact: unknown, codigoInterno: string) {
  const solicitud = (datosNubefact as { solicitud?: { serie?: unknown; numero?: unknown } } | null)?.solicitud;
  const numero = Number(solicitud?.numero);
  return typeof solicitud?.serie === "string" && Number.isInteger(numero) ? `${solicitud.serie}-${String(numero).padStart(6, "0")}` : codigoInterno;
}

@Injectable()
export class ServicioImpresion {
  constructor(private readonly empresa: ServicioEmpresa) {}

  async comprobante(ingresoId: string): Promise<DocumentoImprimible> {
    if (!uuidValido(ingresoId)) throw new BadRequestException("El comprobante no es válido.");
    const [venta] = await db.select().from(ingresos).where(eq(ingresos.id, ingresoId)).limit(1);
    if (!venta) throw new NotFoundException("No se encontró el comprobante.");
    const emisor = await this.empresa.obtener();
    const condicionPago = venta.condicionPago === "CREDITO" ? "CREDITO" : "CONTADO";
    if (venta.tipoComprobante === "NOTA_VENTA") {
      const detalles = await db.select().from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, venta.id)).orderBy(asc(ingresosDetalle.creadoEn), asc(ingresosDetalle.id));
      return documentoNotaVenta({
        emisor, codigo: venta.codigo, fecha: venta.fecha, creadoEn: venta.creadoEn, condicionPago,
        cliente: { tipoDocumento: venta.clienteTipoDocumento, numeroDocumento: venta.clienteNumeroDocumento, nombre: venta.clienteNombre, direccion: venta.clienteDireccion },
        medioPago: venta.medioPago, subtotal: venta.subtotal, igv: venta.igv, tasaIgv: venta.tasaIgv, total: venta.total, observacion: venta.observacion,
        detalles: detalles.map((d) => ({ codigo: d.codigoProducto, descripcion: d.descripcion, unidad: d.unidadMedidaCodigo, cantidad: d.cantidad, precioUnitario: d.precioUnitario, descuento: d.descuento, total: d.total })),
        datosNubefact: venta.datosNubefact,
      });
    }
    const advertencias = evaluarImpresionElectronica(venta.estado, venta.datosNubefact);
    const documento = documentoDesdeTrama({
      tipo: venta.tipoComprobante === "FACTURA" ? "FACTURA" : "BOLETA", emisor, rucRespaldo: venta.rucEmisor, datosNubefact: venta.datosNubefact,
      creadoEn: venta.creadoEn, condicionPago, medioPago: venta.medioPago, tasaIgv: venta.tasaIgv,
    });
    return { ...documento, advertencias: [...advertencias, ...documento.advertencias] };
  }

  async nota(ingresoId: string, notaId: string): Promise<DocumentoImprimible> {
    if (!uuidValido(ingresoId) || !uuidValido(notaId)) throw new BadRequestException("Los identificadores del comprobante no son válidos.");
    const [fila] = await db.select({ nota: comprobantesRelacionados, origen: ingresos }).from(comprobantesRelacionados)
      .innerJoin(ingresos, eq(ingresos.id, comprobantesRelacionados.ingresoOrigenId))
      .where(and(eq(comprobantesRelacionados.id, notaId), eq(comprobantesRelacionados.ingresoOrigenId, ingresoId))).limit(1);
    if (!fila) throw new NotFoundException("No se encontró la nota.");
    const advertencias = evaluarImpresionElectronica(fila.nota.estado, fila.nota.datosNubefact);
    const documento = documentoDesdeTrama({
      tipo: fila.nota.tipoComprobante === "NOTA_DEBITO" ? "NOTA_DEBITO" : "NOTA_CREDITO", emisor: await this.empresa.obtener(), rucRespaldo: fila.origen.rucEmisor,
      datosNubefact: fila.nota.datosNubefact, creadoEn: fila.nota.creadoEn, condicionPago: "CONTADO", medioPago: null, tasaIgv: fila.origen.tasaIgv,
      documentoModificado: { serieNumero: codigoOrigen(fila.origen.datosNubefact, fila.origen.codigo), motivo: fila.nota.motivo },
    });
    return { ...documento, advertencias: [...advertencias, ...documento.advertencias] };
  }
}
