import { useEffect, useState, type FormEvent } from "react";
import type { CatalogosProducto, CodigoProducto, DatosProducto, PresentacionProducto, Producto } from "../services/inventario/productos.service";

type Propiedades = {
  producto?: Producto | null;
  catalogos: CatalogosProducto;
  alGuardar: (datos: DatosProducto) => Promise<boolean>;
  alCrearMarca: (nombre: string) => Promise<{ id: string; nombre: string; advertencia?: string }>;
  alCrearCategoria: (nombre: string) => Promise<{ id: string; nombre: string; advertencia?: string }>;
  /** Alta rápida: precarga el nombre o el código de barras buscado. */
  valoresIniciales?: { nombre?: string; codigoBarras?: string };
};

const claveLocal = () => globalThis.crypto?.randomUUID?.() ?? `presentacion-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useProductoFormulario({ producto, valoresIniciales, alGuardar, alCrearMarca, alCrearCategoria }: Propiedades) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [unidadBaseCodigo, setUnidadBaseCodigo] = useState("NIU");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [afectacionIgv, setAfectacionIgv] = useState<"GRAVADO" | "EXONERADO" | "INAFECTO">("GRAVADO");
  const [activo, setActivo] = useState(true);
  const [ficha, setFicha] = useState<Array<{ id: string; clave: string; valor: string }>>([]);
  const [codigos, setCodigos] = useState<Array<{ clave: string; tipo: CodigoProducto["tipo"]; codigo: string }>>([]);
  const [presentaciones, setPresentaciones] = useState<Array<PresentacionProducto & { clave: string }>>([]);
  const [marcaNueva, setMarcaNueva] = useState("");
  const [marcaModalAbierto, setMarcaModalAbierto] = useState(false);
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [categoriaModalAbierto, setCategoriaModalAbierto] = useState(false);
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(producto?.nombre ?? ""); setDescripcion(producto?.descripcion ?? "");
    setCategoriaId(producto?.categoriaId ?? "");
    setMarcaId(producto?.marcaId ?? "");
    setUnidadBaseCodigo(producto?.unidadBaseCodigo ?? "NIU"); setStockMinimo(producto?.stockMinimo ?? "0"); setAfectacionIgv(producto?.afectacionIgv ?? (producto?.afectoIgv === false ? "INAFECTO" : "GRAVADO"));
    setActivo(producto?.activo ?? true);
    setFicha(Object.entries(producto?.fichaTecnica ?? {}).map(([clave, valor]) => ({ id: claveLocal(), clave, valor: String(valor ?? "") })));
    setCodigos((producto?.codigos ?? []).filter((item) => item.tipo !== "FABRICANTE").map((item) => ({ ...item, tipo: "BARRAS" as const, clave: item.id ?? claveLocal() })));
    const adicionales = (producto?.presentaciones ?? []).filter((item) => !item.esBase).map((item) => ({ ...item, clave: item.clave ?? item.id ?? claveLocal() }));
    setPresentaciones(adicionales);
    setMarcaNueva(""); setErrorLocal(""); setCategoriaModalAbierto(false); setCategoriaNueva("");
    if (!producto && valoresIniciales?.nombre) setNombre(valoresIniciales.nombre);
    if (!producto && valoresIniciales?.codigoBarras) setCodigos([{ clave: claveLocal(), tipo: "BARRAS", codigo: valoresIniciales.codigoBarras }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- los valores iniciales solo se aplican al abrir
  }, [producto]);

  async function crearMarca() {
    if (marcaNueva.trim().length < 2) { setErrorLocal("Escribe el nombre de la marca."); return; }
    setCreandoMarca(true); setErrorLocal("");
    try { const marca = await alCrearMarca(marcaNueva); setMarcaId(marca.id); setMarcaNueva(""); setMarcaModalAbierto(false); if (marca.advertencia) setErrorLocal(marca.advertencia); }
    catch (problema) { setErrorLocal(problema instanceof Error ? problema.message : "No se pudo crear la marca."); }
    finally { setCreandoMarca(false); }
  }

  async function crearCategoria() {
    if (categoriaNueva.trim().length < 2) { setErrorLocal("Escribe el nombre de la categoría."); return; }
    setCreandoCategoria(true); setErrorLocal("");
    try {
      const categoria = await alCrearCategoria(categoriaNueva);
      setCategoriaId(categoria.id); setCategoriaNueva(""); setCategoriaModalAbierto(false);
      if (categoria.advertencia) setErrorLocal(categoria.advertencia);
    } catch (problema) {
      setErrorLocal(problema instanceof Error ? problema.message : "No se pudo crear la categoría.");
    } finally { setCreandoCategoria(false); }
  }

  function agregarPresentacion() {
    setPresentaciones((actual) => [...actual, { clave: claveLocal(), unidadMedidaCodigo: "BX", nombre: "Caja", factorAUnidadBase: "12", seCompra: true, seVende: false }]);
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); setErrorLocal("");
    if (!marcaId) { setErrorLocal("Selecciona o crea la marca del producto."); return; }
    const fichaTecnica = Object.fromEntries(ficha.filter((par) => par.clave.trim()).map((par) => {
      const valor = par.valor.trim();
      if (valor === "true" || valor === "false") return [par.clave.trim(), valor === "true"];
      if (valor !== "" && Number.isFinite(Number(valor))) return [par.clave.trim(), Number(valor)];
      return [par.clave.trim(), valor || null];
    }));
    const datos: DatosProducto = {
      nombre, descripcion: descripcion.trim() || null, categoriaId, marcaId, unidadBaseCodigo, stockMinimo,
      afectacionIgv, afectoIgv: afectacionIgv === "GRAVADO",
      fichaTecnica, activo,
      codigos: codigos.filter((item) => item.codigo.trim()).map(({ codigo }) => ({ tipo: "BARRAS" as const, codigo: codigo.trim() })),
      presentaciones: presentaciones.map(({ clave, unidadMedidaCodigo: codigoUnidad, nombre: nombrePresentacion, factorAUnidadBase, seCompra, seVende }) => ({ clave, unidadMedidaCodigo: codigoUnidad, nombre: nombrePresentacion, factorAUnidadBase, seCompra, seVende })),
    };
    setGuardando(true);
    try { await alGuardar(datos); }
    finally { setGuardando(false); }
  }


  return {
    nombre, setNombre, descripcion, setDescripcion, categoriaId, setCategoriaId,
    marcaId, setMarcaId, unidadBaseCodigo, setUnidadBaseCodigo, stockMinimo, setStockMinimo,
    afectacionIgv, setAfectacionIgv, activo, setActivo,
    ficha, setFicha, codigos, setCodigos, presentaciones, setPresentaciones,
    marcaNueva, setMarcaNueva, marcaModalAbierto, setMarcaModalAbierto,
    creandoMarca, categoriaModalAbierto, setCategoriaModalAbierto, categoriaNueva, setCategoriaNueva,
    creandoCategoria,
    errorLocal, setErrorLocal, guardando, modoEdicion: Boolean(producto),
    agregarPresentacion, crearMarca, crearCategoria, guardar,
  };
}
