import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequiereCualquieraPermiso, RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioEmpresa } from "./empresa.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("empresa")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorEmpresa {
  constructor(private readonly empresa: ServicioEmpresa) {}

  @Get()
  @RequiereCualquieraPermiso("INGRESOS.LEER", "FINANZAS.ADMINISTRAR")
  async obtener() { return { empresa: await this.empresa.obtener() }; }

  @Put()
  @RequierePermiso("FINANZAS.ADMINISTRAR")
  async guardar(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) { return { empresa: await this.empresa.guardar(datos, solicitud.usuario.id) }; }
}
