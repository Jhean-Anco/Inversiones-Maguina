import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequiereCualquieraPermiso } from "../autenticacion/permisos";
import { consultarIdentidadPeru } from "../../utilidades/consulta-identidad-peru";

@Controller("personas/consulta-identidad")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorConsultaIdentidad {
  @Get()
  @RequiereCualquieraPermiso("PERSONAS.CREAR", "INGRESOS.CREAR", "MOTOTAXIS.CREAR", "INVENTARIO.CREAR", "EGRESOS.CREAR")
  consultar(@Query("tipoDocumento") tipoDocumento?: string, @Query("numeroDocumento") numeroDocumento?: string) {
    return consultarIdentidadPeru(tipoDocumento, numeroDocumento);
  }
}
