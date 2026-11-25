import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { GuardiaSesion } from "../autenticacion/guardia-sesion";
import { GuardiaPermiso } from "../autenticacion/guardia-permiso";
import { RequiereCualquieraPermiso } from "../autenticacion/permisos";
import type { UsuarioAutenticado } from "../autenticacion/usuario-actual";
import { ServicioMototaxis } from "./mototaxis.service";

type SolicitudAutenticada = FastifyRequest & { usuario: UsuarioAutenticado };

@Controller("personas/proveedores")
@UseGuards(GuardiaSesion, GuardiaPermiso)
export class ControladorDirectorioProveedores {
  constructor(private readonly mototaxis: ServicioMototaxis) {}

  @Get()
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INVENTARIO.CREAR")
  listar(@Query("busqueda") busqueda?: string) { return this.mototaxis.listarProveedores(busqueda); }

  @Get("listado")
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INVENTARIO.CREAR")
  listarDirectorio(@Query("pagina") pagina?: string, @Query("porPagina") porPagina?: string, @Query("busqueda") busqueda?: string) { return this.mototaxis.listarDirectorioProveedores(pagina, porPagina, busqueda); }

  @Get(":id/ficha")
  @RequiereCualquieraPermiso("PERSONAS.LEER", "INVENTARIO.CREAR")
  ficha(@Param("id") id: string, @Req() solicitud: SolicitudAutenticada) {
    return this.mototaxis.obtenerFichaProveedor(id, solicitud.usuario.permisos ?? []);
  }

  @Post()
  @RequiereCualquieraPermiso("PERSONAS.CREAR", "INVENTARIO.CREAR")
  crear(@Body() datos: unknown) { return this.mototaxis.crearProveedor(datos); }
}
