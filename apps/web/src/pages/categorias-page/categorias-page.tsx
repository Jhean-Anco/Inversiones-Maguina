import { CatalogoAdminPage } from "../../components/catalogo/catalogo-admin-page/catalogo-admin-page";
import { servicioCategorias, type CategoriaCatalogo } from "../../services/inventario/catalogos.service";

export function CategoriasPage() {
  return <CatalogoAdminPage<CategoriaCatalogo>
    tipo="categoria"
    ejemplo="Ej. Sistema de frenos"
    servicio={servicioCategorias}
    mensajeCarga="No se pudo cargar el catálogo de categorías."
  />;
}
