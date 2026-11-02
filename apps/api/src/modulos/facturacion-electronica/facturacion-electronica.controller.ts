import { Body, Controller, Get, Put, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequierePermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioEmisorFacturacion } from "./emisor.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("facturacion-electronica/emisor")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorEmisorFacturacion {
  constructor(private readonly emisor: ServicioEmisorFacturacion) {}

  @Get()
  @RequierePermiso("FACTURACION.LEER")
  obtener() { return this.emisor.obtener(); }

  @Put()
  @RequierePermiso("FACTURACION.EMISOR_CONFIGURAR")
  guardar(@Body() datos: unknown, @Req() solicitud: SolicitudAutenticada) {
    return this.emisor.guardar(datos, solicitud.usuario.id);
  }
}

@Controller("facturacion-electronica/comprobantes")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorComprobantesFacturacion {
  constructor(private readonly emisor: ServicioEmisorFacturacion) {}

  @Get()
  @RequierePermiso("FACTURACION.LEER")
  listar(@Query("pagina") pagina?: string, @Query("busqueda") busqueda?: string) {
    return this.emisor.listarComprobantes({ pagina, busqueda });
  }
}

