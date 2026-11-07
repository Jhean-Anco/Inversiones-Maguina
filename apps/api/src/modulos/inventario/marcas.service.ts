import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { db, marcasProductos, modelosMototaxis, productos } from "@magina/database";
import { asc, eq } from "drizzle-orm";

export type UsoMarca = "REPUESTOS" | "MOTOTAXIS" | "AMBOS";
type DatosMarca = { nombre?: unknown; descripcion?: unknown; uso?: unknown; activo?: unknown };
const textoOpcional = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : null;
const usosMarca = ["REPUESTOS", "MOTOTAXIS", "AMBOS"] as const;

@Injectable()
export class ServicioMarcas {
  listar() {
    return db.select().from(marcasProductos).orderBy(asc(marcasProductos.nombre));
  }

  async crear(datos: DatosMarca) {
    const nombre = this.validarNombre(datos.nombre);
    const uso = this.validarUso(datos.uso, "REPUESTOS");
    try {
      const [marca] = await db.insert(marcasProductos).values({ nombre, uso, descripcion: textoOpcional(datos.descripcion) }).returning();
      return marca;
    } catch (error) { this.manejarDuplicado(error); }
  }

  async actualizar(id: string, datos: DatosMarca) {
    const nombre = datos.nombre === undefined ? undefined : this.validarNombre(datos.nombre);
    const uso = datos.uso === undefined ? undefined : this.validarUso(datos.uso);
    if (uso) await this.validarCambioUso(id, uso);
    try {
      const [marca] = await db.update(marcasProductos).set({
        ...(nombre === undefined ? {} : { nombre }),
        ...(datos.descripcion === undefined ? {} : { descripcion: textoOpcional(datos.descripcion) }),
        ...(uso === undefined ? {} : { uso }),
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

  private validarUso(valor: unknown, predeterminado?: UsoMarca): UsoMarca {
    if (valor === undefined && predeterminado) return predeterminado;
    if (typeof valor !== "string" || !usosMarca.includes(valor as UsoMarca)) throw new BadRequestException("Selecciona si la marca corresponde a repuestos, mototaxis o ambos.");
    return valor as UsoMarca;
  }

  private async validarCambioUso(id: string, uso: UsoMarca) {
    const [producto, modelo] = await Promise.all([
      db.select({ id: productos.id }).from(productos).where(eq(productos.marcaId, id)).limit(1),
      db.select({ id: modelosMototaxis.id }).from(modelosMototaxis).where(eq(modelosMototaxis.marcaId, id)).limit(1),
    ]);
    const conservaRepuestos = uso === "REPUESTOS" || uso === "AMBOS";
    const conservaMototaxis = uso === "MOTOTAXIS" || uso === "AMBOS";
    if (producto.length && !conservaRepuestos || modelo.length && !conservaMototaxis) {
      throw new ConflictException("Esta marca ya tiene registros asociados en otra área. Elige «Ambos» para conservarlos.");
    }
  }

  private manejarDuplicado(error: unknown): never {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
      throw new ConflictException("Ya existe una marca con ese nombre.");
    }
    throw error;
  }
}
