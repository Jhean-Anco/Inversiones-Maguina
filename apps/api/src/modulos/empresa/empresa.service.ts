import { Injectable } from "@nestjs/common";
import { configuracionEmpresa, db } from "@magina/database";
import { eq } from "drizzle-orm";
import type { EmisorImpresion } from "../impresion/representacion-impresa";
import { datosEmpresaDesdeEntorno, validarDatosEmpresa } from "./empresa.validacion";

@Injectable()
export class ServicioEmpresa {
  /** Datos del emisor: la fila guardada completada con `EMPRESA_*`; null si no hay ninguna. */
  async obtener(): Promise<EmisorImpresion | null> {
    const [fila] = await db.select().from(configuracionEmpresa).where(eq(configuracionEmpresa.id, 1)).limit(1);
    const entorno = datosEmpresaDesdeEntorno();
    if (!fila) return entorno;
    return {
      // Las variables de despliegue completan filas antiguas o incompletas. Los valores
      // guardados desde Configuración siguen teniendo prioridad cuando están definidos.
      ruc: fila.ruc.trim() ? fila.ruc : entorno?.ruc ?? fila.ruc,
      razonSocial: fila.razonSocial.trim() ? fila.razonSocial : entorno?.razonSocial ?? fila.razonSocial,
      nombreComercial: fila.nombreComercial?.trim() ? fila.nombreComercial : entorno?.nombreComercial ?? null,
      direccion: fila.direccion.trim() ? fila.direccion : entorno?.direccion ?? fila.direccion,
      telefono: fila.telefono?.trim() ? fila.telefono : entorno?.telefono ?? null,
      correo: fila.correo?.trim() ? fila.correo : entorno?.correo ?? null,
      sitioWeb: fila.sitioWeb?.trim() ? fila.sitioWeb : entorno?.sitioWeb ?? null,
      mensajePie: fila.mensajePie?.trim() ? fila.mensajePie : entorno?.mensajePie ?? null,
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
