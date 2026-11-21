import { solicitarApi } from "../api-cliente";

export type UsoMarca = "REPUESTOS" | "MOTOTAXIS" | "AMBOS";
export type RegistroCatalogo = { id: string; nombre: string; activo: boolean; uso?: UsoMarca };
export type CategoriaCatalogo = RegistroCatalogo & { creadoEn?: string };
export type MarcaCatalogo = RegistroCatalogo & { uso: UsoMarca };

export type ServicioCatalogo<T extends RegistroCatalogo> = {
  listar(): Promise<T[]>;
  guardar(datos: { nombre: string; id?: string; uso?: UsoMarca }): Promise<T>;
  cambiarEstado(registro: T): Promise<void>;
};

function crearServicioCatalogo<T extends RegistroCatalogo>(ruta: string): ServicioCatalogo<T> {
  return {
    listar: () => solicitarApi<T[]>(ruta),
    guardar({ nombre, id, uso }) {
      return solicitarApi<T>(`${ruta}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, ...(uso ? { uso } : {}) }),
      });
    },
    async cambiarEstado(registro) {
      await solicitarApi<unknown>(`${ruta}/${registro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !registro.activo }),
      });
    },
  };
}

export const servicioCategorias = crearServicioCatalogo<CategoriaCatalogo>("/inventario/categorias");
export const servicioMarcas = crearServicioCatalogo<MarcaCatalogo>("/inventario/marcas");
