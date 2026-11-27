import { Injectable } from "@nestjs/common";
import { configuracionEmpresa, db } from "@magina/database";
import { eq } from "drizzle-orm";
import type { EmisorImpresion } from "../impresion/representacion-impresa";
import { datosEmpresaDesdeEntorno, validarDatosEmpresa } from "./empresa.validacion";

@Injectable()
export class ServicioEmpresa {
  /** Datos del emisor: la fila guardada o, si no existe, las variables `EMPRESA_*`; null si no hay ninguna. */
  async obtener(): Promise<EmisorImpresion | null> {
    const [fila] = await db.select().from(configuracionEmpresa).where(eq(configuracionEmpresa.id, 1)).limit(1);
    if (!fila) return datosEmpresaDesdeEntorno();
    return {
      ruc: fila.ruc, razonSocial: fila.razonSocial, nombreComercial: fila.nombreComercial, direccion: fila.direccion,
      telefono: fila.telefono, correo: fila.correo, sitioWeb: fila.sitioWeb, mensajePie: fila.mensajePie,
      urlConsultaComprobantes: fila.urlConsultaComprobantes,
    };
  }

  async guardar(entrada: unknown, usuarioId: string): Promise<EmisorImpresion> {
    const datos = validarDatosEmpresa(entrada);
    await db.insert(configuracionEmpresa).values({ id: 1, ...datos, actualizadoPor: usuarioId })
      .onConflictDoUpdate({ target: configuracionEmpresa.id, set: { ...datos, actualizadoPor: usuarioId, actualizadoEn: new Date() } });
    return datos;
  }
}
