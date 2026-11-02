import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { db, marcasProductos } from "@magina/database";
import { asc, eq } from "drizzle-orm";

type DatosMarca = { nombre?: unknown; descripcion?: unknown; activo?: unknown };
const textoOpcional = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : null;

@Injectable()
export class ServicioMarcas {
  listar() {
    return db.select().from(marcasProductos).orderBy(asc(marcasProductos.nombre));
  }

  async crear(datos: DatosMarca) {
    const nombre = this.validarNombre(datos.nombre);
    try {
      const [marca] = await db.insert(marcasProductos).values({ nombre, descripcion: textoOpcional(datos.descripcion) }).returning();
      return marca;
    } catch (error) { this.manejarDuplicado(error); }
  }

  async actualizar(id: string, datos: DatosMarca) {
    const nombre = datos.nombre === undefined ? undefined : this.validarNombre(datos.nombre);
    try {
      const [marca] = await db.update(marcasProductos).set({
        ...(nombre === undefined ? {} : { nombre }),
        ...(datos.descripcion === undefined ? {} : { descripcion: textoOpcional(datos.descripcion) }),
        ...(typeof datos.activo === "boolean" ? { activo: datos.activo } : {}),
      }).where(eq(marcasProductos.id, id)).returning();
      if (!marca) throw new NotFoundException("No se encontró la marca.");
      return marca;
    } catch (error) { this.manejarDuplicado(error); }
  }

  private validarNombre(valor: unknown) {
    if (typeof valor !== "string" || valor.trim().length < 2 || valor.trim().length > 100) {
      throw new BadRequestException("El nombre debe tener entre 2 y 100 caracteres.");
    }
    return valor.trim();
  }

  private manejarDuplicado(error: unknown): never {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictException("Ya existe una marca con ese nombre.");
    }
    throw error;
  }
}
