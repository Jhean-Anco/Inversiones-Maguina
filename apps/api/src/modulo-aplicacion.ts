import { Controller, Get, Module } from "@nestjs/common";
import { ModuloAutenticacion } from "./modulos/autenticacion/autenticacion.module";
import { ModuloInventario } from "./modulos/inventario/inventario.module";
import { ModuloIngresos } from "./modulos/ingresos/ingresos.module";
import { ModuloFacturacionElectronica } from "./modulos/facturacion-electronica/facturacion-electronica.module";
import { ModuloReportes } from "./modulos/reportes/reportes.module";
import { ModuloEgresos } from "./modulos/egresos/egresos.module";
import { ModuloMototaxis } from "./modulos/mototaxis/mototaxis.module";
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
  imports: [ModuloAutenticacion, ModuloInventario, ModuloIngresos, ModuloFacturacionElectronica, ModuloReportes, ModuloEgresos, ModuloMototaxis],
  controllers: [ControladorSalud],
})
export class ModuloAplicacion {}
