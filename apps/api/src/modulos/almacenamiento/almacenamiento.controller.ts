import { Controller, Get, Param, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { RequiereCualquieraPermiso } from "../autenticacion/permisos";
import { ServicioAlmacenamiento } from "./almacenamiento.service";

@Controller("archivos")
export class ControladorArchivosLocales {
  constructor(private readonly almacenamiento: ServicioAlmacenamiento) {}

  @Get(":id/contenido")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequiereCualquieraPermiso("INGRESOS.LEER", "EGRESOS.LEER", "INVENTARIO.LEER", "MOTOTAXIS.LEER", "FINANZAS.LEER")
  async consultar(@Param("id") id: string, @Res() respuesta: FastifyReply) {
    const archivo = await this.almacenamiento.descargarArchivoRegistrado(id);
    return respuesta.type(archivo.mime).header("Cache-Control", "private, max-age=3600")
      .header("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`)
      .send(archivo.contenido);
  }
}
