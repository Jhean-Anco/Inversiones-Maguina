import { Injectable } from "@nestjs/common";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, metasDashboard } from "@magina/database";
import { resolverMetas, validarGuardarMeta, validarPeriodoMeta } from "./metas.util";

@Injectable()
export class ServicioMetas {
  async obtener(periodoEntrada: unknown) {
    const periodo = validarPeriodoMeta(periodoEntrada);
    const filas = await db.select({ indicador: metasDashboard.indicador, periodo: metasDashboard.periodo, valor: metasDashboard.valor })
      .from(metasDashboard).where(or(isNull(metasDashboard.periodo), eq(metasDashboard.periodo, periodo)));
    return { periodo, metas: resolverMetas(filas, periodo) };
  }

  /** Crea, actualiza o (con `valor: null`) quita una meta, y devuelve las metas vigentes del periodo indicado. */
  async guardar(entrada: unknown, usuarioId: string, periodoVista: unknown) {
    const { indicador, periodo, valor } = validarGuardarMeta(entrada);
    if (valor === null) {
      await db.delete(metasDashboard).where(and(eq(metasDashboard.indicador, indicador), periodo === null ? isNull(metasDashboard.periodo) : eq(metasDashboard.periodo, periodo)));
    } else {
      await db.execute(sql`
        INSERT INTO metas_dashboard (indicador, periodo, valor, usuario_id) VALUES (${indicador}, ${periodo}, ${valor.toFixed(2)}, ${usuarioId})
        ON CONFLICT (indicador, coalesce(periodo, '')) DO UPDATE SET valor = EXCLUDED.valor, usuario_id = EXCLUDED.usuario_id, actualizado_en = now()`);
    }
    return this.obtener(periodoVista);
  }
}
