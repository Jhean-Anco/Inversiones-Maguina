import { useState } from "react";
import { ProductoFormulario } from "./producto-formulario/producto-formulario";
import { Dialogo } from "../ui/dialogo/dialogo";
import { servicioIngresos, type ProductoParaIngreso } from "../../services/ingresos.service";
import { servicioProductos, type CatalogosProducto, type DatosProducto } from "../../services/inventario/productos.service";

type Props = {
  /** Texto buscado: si parece un código de barras se precarga como código, si no como nombre. */
  busqueda: string;
  alCrear: (producto: ProductoParaIngreso) => void;
  alError: (mensaje: string) => void;
};

const pareceCodigoBarras = (texto: string) => /^\d{6,14}$/.test(texto);

/** Registro rápido de un repuesto desde la búsqueda de un documento (orden, cotización): lo crea y lo agrega al detalle. */
export function useAltaRapidaRepuesto({ busqueda, alCrear, alError }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [catalogos, setCatalogos] = useState<CatalogosProducto | null>(null);
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState("");
  const [valoresIniciales, setValoresIniciales] = useState<{ nombre?: string; codigoBarras?: string }>({});

  async function abrir() {
    const consulta = busqueda.trim();
    setValoresIniciales(pareceCodigoBarras(consulta) ? { codigoBarras: consulta } : { nombre: consulta });
    setAbierto(true); setErrorCarga("");
    if (catalogos) return;
    setCargando(true);
    try { setCatalogos(await servicioProductos.catalogos()); }
    catch (problema) { setErrorCarga(problema instanceof Error ? problema.message : "No se pudieron cargar los datos para registrar el repuesto."); }
    finally { setCargando(false); }
  }

  async function guardar(datos: DatosProducto) {
    try {
      const { producto } = await servicioProductos.guardar(datos);
      setAbierto(false);
      const coincidencias = await servicioIngresos.buscarProductos(producto.codigoInterno);
      const creado = coincidencias.find((item) => item.codigo === producto.codigoInterno) ?? (coincidencias.length === 1 ? coincidencias[0] : null);
      if (creado) alCrear(creado);
      else alError(`Repuesto ${producto.nombre} registrado. Búscalo para agregarlo a la orden.`);
      return true;
    } catch (problema) {
      alError(problema instanceof Error ? problema.message : "No se pudo registrar el repuesto.");
      return false;
    }
  }

  const cerrar = () => setAbierto(false);
  const dialogo = !abierto ? null
    : cargando || (!catalogos && !errorCarga) ? <Dialogo titulo="Preparando el registro del repuesto" ancho="sm" onCerrar={cerrar}><p className="m-0 text-sm text-[#52697d]">Cargando categorías, marcas y unidades…</p></Dialogo>
    : catalogos ? <ProductoFormulario catalogos={catalogos} producto={null} error="" valoresIniciales={valoresIniciales} alCerrar={cerrar} alGuardar={guardar}
        alCrearMarca={async (nombre) => { const r = await servicioProductos.crearMarca(nombre); return { ...r.marca, advertencia: r.advertencia }; }}
        alCrearCategoria={async (nombre) => { const r = await servicioProductos.crearCategoria(nombre); return { ...r.categoria, advertencia: r.advertencia }; }} />
    : <Dialogo titulo="No se pudo preparar el registro" ancho="sm" onCerrar={cerrar}><p className="m-0 text-sm text-[#52697d]">{errorCarga}</p><button type="button" className="erp-btn erp-btn--primary erp-btn--lg mt-4" onClick={() => void abrir()}>Reintentar</button></Dialogo>;

  return { abrir, dialogo };
}
