import { CatalogoAdminPage } from "../../components/catalogo/catalogo-admin-page/catalogo-admin-page";
import { servicioMarcas, type MarcaCatalogo } from "../../services/inventario/catalogos.service";

export function MarcasPage() {
  return <CatalogoAdminPage<MarcaCatalogo>
    tipo="marca"
    ejemplo="Ej. Honda"
    servicio={servicioMarcas}
    mensajeCarga="No se pudo cargar el catálogo de marcas."
  />;
}
