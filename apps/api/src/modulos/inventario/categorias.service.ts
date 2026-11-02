import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { categoriasProductos, db } from "@magina/database";
import { asc, eq } from "drizzle-orm";

type DatosCategoria = { nombre?: unknown; descripcion?: unknown; activo?: unknown };
const textoOpcional = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : null;

@Injectable()
export class ServicioCategorias {
  listar() {
    return db.select().from(categoriasProductos).orderBy(asc(categoriasProductos.nombre));
  }

  async crear(datos: DatosCategoria) {
    const nombre = this.validarNombre(datos.nombre);
    try {
      const [categoria] = await db.insert(categoriasProductos)
        .values({ nombre, descripcion: textoOpcional(datos.descripcion) })
        .returning();
      return categoria;
    } catch (error) { this.manejarDuplicado(error); }
  }

  async actualizar(id: string, datos: DatosCategoria) {
    const nombre = datos.nombre === undefined ? undefined : this.validarNombre(datos.nombre);
    try {
      const [categoria] = await db.update(categoriasProductos).set({
        ...(nombre === undefined ? {} : { nombre }),
        ...(datos.descripcion === undefined ? {} : { descripcion: textoOpcional(datos.descripcion) }),
        ...(typeof datos.activo === "boolean" ? { activo: datos.activo } : {}),
      }).where(eq(categoriasProductos.id, id)).returning();
      if (!categoria) throw new NotFoundException("No se encontró la categoría.");
      return categoria;
    } catch (error) { this.manejarDuplicado(error); }
  }

  private validarNombre(valor: unknown) {
    if (typeof valor !== "string" || valor.trim().length < 2 || valor.trim().length > 100) {
      throw new BadRequestException("El nombre debe tener entre 2 y 100 caracteres.");
    }
    return valor.trim();
  }

  private manejarDuplicado(error: unknown): never {
    if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictException("Ya existe una categoría con ese nombre.");
    }
    throw error;
  }
}
