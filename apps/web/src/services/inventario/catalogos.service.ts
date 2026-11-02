import { solicitarApi } from "../api-cliente";
import { subirImagenCatalogo, type TipoImagenCatalogo } from "./imagenes.service";

export type RegistroCatalogo = { id: string; nombre: string; rutaImagen: string | null; activo: boolean };
export type CategoriaCatalogo = RegistroCatalogo & { creadoEn?: string };
export type MarcaCatalogo = RegistroCatalogo;

export type ServicioCatalogo<T extends RegistroCatalogo> = {
  listar(): Promise<T[]>;
  guardar(datos: { nombre: string; id?: string }): Promise<T>;
  subirImagen(id: string, imagen: File): Promise<void>;
  cambiarEstado(registro: T): Promise<void>;
};

function crearServicioCatalogo<T extends RegistroCatalogo>(ruta: string, tipoImagen: TipoImagenCatalogo): ServicioCatalogo<T> {
  return {
    listar: () => solicitarApi<T[]>(ruta),
    guardar({ nombre, id }) {
      return solicitarApi<T>(`${ruta}${id ? `/${id}` : ""}`, {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre }),
      });
    },
    subirImagen: (id, imagen) => subirImagenCatalogo(tipoImagen, id, imagen),
    async cambiarEstado(registro) {
      await solicitarApi<unknown>(`${ruta}/${registro.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !registro.activo }),
      });
    },
  };
}

export const servicioCategorias = crearServicioCatalogo<CategoriaCatalogo>("/inventario/categorias", "categorias");
export const servicioMarcas = crearServicioCatalogo<MarcaCatalogo>("/inventario/marcas", "marcas");
