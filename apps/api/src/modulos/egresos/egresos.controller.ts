import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioEgresos } from "./egresos.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("egresos")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorEgresos {
  constructor(private readonly egresos: ServicioEgresos) {}

  @Get()
  @RequierePermiso("EGRESOS.LEER")
  listar(@Query("tipo") tipo?: string, @Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) {
    return this.egresos.listar({ tipo, pagina, porPagina, busqueda });
  }

  @Post()
  @RequierePermiso("EGRESOS.CREAR")
  crear(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new BadRequestException("Los datos del egreso no son válidos.");
    return this.egresos.crear(datos, solicitud.usuario.id);
  }

  @Post(":id/pagos")
  @RequierePermiso("EGRESOS.CREAR")
  registrarPago(@Param("id") id: string, @Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    if (typeof datos !== "object" || datos === null || Array.isArray(datos)) throw new BadRequestException("Los datos del pago no son válidos.");
    return this.egresos.registrarPago(id, datos, solicitud.usuario.id);
  }

}
