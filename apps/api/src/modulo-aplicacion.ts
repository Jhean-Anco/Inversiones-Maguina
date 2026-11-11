import { Controller, Get, Module } from "@nestjs/common";
import { ModuloAutenticacion } from "./modulos/autenticacion/autenticacion.module";
import { ModuloInventario } from "./modulos/inventario/inventario.module";
import { ModuloIngresos } from "./modulos/ingresos/ingresos.module";
import { ModuloReportes } from "./modulos/reportes/reportes.module";
import { ModuloEgresos } from "./modulos/egresos/egresos.module";
import { ModuloMototaxis } from "./modulos/mototaxis/mototaxis.module";
import { ModuloFinanzas } from "./modulos/finanzas/finanzas.module";
import { ModuloPersonas } from "./modulos/personas/personas.module";
import { ModuloAlmacenamiento } from "./modulos/almacenamiento/almacenamiento.module";
import { ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { db } from "@magina/database";

@Controller("health")
class ControladorSalud {
  @Get()
  async consultar() {
    try {
      await db.execute(sql`select 1`);
      return { estado: "ok", servicio: "api", baseDatos: "ok" };
    } catch {
      throw new ServiceUnavailableException({ estado: "no_disponible", servicio: "api", baseDatos: "no_disponible" });
    }
  }
}

@Module({
  imports: [ModuloAutenticacion, ModuloPersonas, ModuloAlmacenamiento, ModuloInventario, ModuloIngresos, ModuloReportes, ModuloEgresos, ModuloMototaxis, ModuloFinanzas],
  controllers: [ControladorSalud],
})
export class ModuloAplicacion {}
