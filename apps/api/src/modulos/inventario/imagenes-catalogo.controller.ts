import { Controller, Delete, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequierePermiso } from "../autenticacion/permisos";
import { ServicioImagenesCatalogo } from "./imagenes-catalogo.service";

@Controller("inventario/imagenes")
export class ControladorImagenesCatalogo {
  constructor(private readonly imagenes: ServicioImagenesCatalogo) {}

  @Post(":tipo/:id")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequierePermiso("INVENTARIO.EDITAR")
  subir(@Param("tipo") tipo: string, @Param("id") id: string, @Req() solicitud: FastifyRequest) {
    return this.imagenes.guardar(tipo, id, solicitud);
  }

  @Delete("productos/:id/:idImagen")
  @UseGuards(GuardiaSesion, GuardiaPermiso)
  @RequierePermiso("INVENTARIO.EDITAR")
  eliminarProducto(@Param("id") id: string, @Param("idImagen") idImagen: string) {
    return this.imagenes.eliminarImagenProducto(id, idImagen);
  }

  @Get(":tipo/:archivo")
  async consultar(@Param("tipo") tipo: string, @Param("archivo") archivo: string, @Res() respuesta: FastifyReply) {
    const imagen = await this.imagenes.leer(tipo, archivo);
    return respuesta
      .type(imagen.tipoContenido)
      .header("Cache-Control", "public, max-age=31536000, immutable")
      .send(imagen.contenido);
  }
}
