import { solicitarApi } from "../api-cliente";

export type TipoImagenCatalogo = "categorias" | "marcas" | "productos";

export async function subirImagenCatalogo(tipo: TipoImagenCatalogo, idRegistro: string, archivo: File): Promise<void> {
  const datos = new FormData();
  datos.append("imagen", archivo);
  await solicitarApi<unknown>(`/inventario/imagenes/${tipo}/${idRegistro}`, {
    method: "POST",
    body: datos,
  });
}

export async function eliminarImagenProducto(idProducto: string, idImagen: string): Promise<void> {
  await solicitarApi<unknown>(`/inventario/imagenes/productos/${idProducto}/${idImagen}`, { method: "DELETE" });
}
