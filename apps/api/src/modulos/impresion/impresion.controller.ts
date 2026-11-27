import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioImpresion } from "./impresion.service";

/** Representación impresa estructurada para ticket térmico, A4 propio o ESC/POS (Bluetooth/USB). */
@Controller("impresion")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorImpresion {
  constructor(private readonly impresion: ServicioImpresion) {}

  @Get("ingresos/:id")
  @RequierePermiso("INGRESOS.LEER")
  comprobante(@Param("id") id: string) { return this.impresion.comprobante(id); }

  @Get("ingresos/:id/notas/:notaId")
  @RequierePermiso("INGRESOS.LEER")
  nota(@Param("id") id: string, @Param("notaId") notaId: string) { return this.impresion.nota(id, notaId); }
}
