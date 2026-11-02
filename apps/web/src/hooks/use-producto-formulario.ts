import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CatalogosProducto, CodigoProducto, DatosProducto, PrecioProducto, PresentacionProducto, Producto } from "../services/inventario/productos.service";

type Propiedades = {
  producto?: Producto | null;
  catalogos: CatalogosProducto;
  alGuardar: (datos: DatosProducto, imagenesNuevas: File[], imagenesEliminadas: string[]) => Promise<boolean>;
  alCrearMarca: (nombre: string, imagen: File) => Promise<{ id: string; nombre: string; advertencia?: string }>;
  alCrearCategoria: (nombre: string, imagen: File) => Promise<{ id: string; nombre: string; advertencia?: string }>;
};

const claveLocal = () => globalThis.crypto?.randomUUID?.() ?? `presentacion-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useProductoFormulario({ producto, catalogos, alGuardar, alCrearMarca, alCrearCategoria }: Propiedades) {
  const generalId = useMemo(() => catalogos.tiposListasPrecio.find((tipo) => tipo.codigo === "GENERAL")?.id ?? "", [catalogos.tiposListasPrecio]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [unidadBaseCodigo, setUnidadBaseCodigo] = useState("NIU");
  const [stockMinimo, setStockMinimo] = useState("0");
  const [afectacionIgv, setAfectacionIgv] = useState<"GRAVADO" | "EXONERADO" | "INAFECTO">("GRAVADO");
  const [activo, setActivo] = useState(true);
  const [imagenesNuevas, setImagenesNuevas] = useState<File[]>([]);
  const [imagenesEliminadas, setImagenesEliminadas] = useState<string[]>([]);
  const [vistasPreviasImagenes, setVistasPreviasImagenes] = useState<string[]>([]);
  const [ficha, setFicha] = useState<Array<{ clave: string; valor: string }>>([]);
  const [codigos, setCodigos] = useState<Array<{ clave: string; tipo: CodigoProducto["tipo"]; codigo: string }>>([]);
  const [presentaciones, setPresentaciones] = useState<Array<PresentacionProducto & { clave: string }>>([]);
  const [precios, setPrecios] = useState<Array<PrecioProducto & { clave: string }>>([]);
  const [marcaNueva, setMarcaNueva] = useState("");
  const [marcaModalAbierto, setMarcaModalAbierto] = useState(false);
  const [marcaNuevaImagen, setMarcaNuevaImagen] = useState<File>();
  const [vistaPreviaMarca, setVistaPreviaMarca] = useState("");
  const [creandoMarca, setCreandoMarca] = useState(false);
  const [categoriaModalAbierto, setCategoriaModalAbierto] = useState(false);
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [categoriaNuevaImagen, setCategoriaNuevaImagen] = useState<File>();
  const [vistaPreviaCategoria, setVistaPreviaCategoria] = useState("");
  const [creandoCategoria, setCreandoCategoria] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setNombre(producto?.nombre ?? ""); setDescripcion(producto?.descripcion ?? "");
    setCategoriaId(producto?.categoriaId ?? "");
    setMarcaId(producto?.marcaId ?? "");
    setUnidadBaseCodigo(producto?.unidadBaseCodigo ?? "NIU"); setStockMinimo(producto?.stockMinimo ?? "0"); setAfectacionIgv(producto?.afectacionIgv ?? (producto?.afectoIgv === false ? "INAFECTO" : "GRAVADO"));
    setActivo(producto?.activo ?? true); setImagenesNuevas([]); setImagenesEliminadas([]);
    setFicha(Object.entries(producto?.fichaTecnica ?? {}).map(([clave, valor]) => ({ clave, valor: String(valor ?? "") })));
    setCodigos((producto?.codigos ?? []).map((item) => ({ ...item, clave: item.id ?? claveLocal() })));
    const adicionales = (producto?.presentaciones ?? []).filter((item) => !item.esBase).map((item) => ({ ...item, clave: item.clave ?? item.id ?? claveLocal() }));
    setPresentaciones(adicionales);
    const presentacionBaseId = producto?.presentaciones.find((presentacion) => presentacion.esBase)?.id;
    setPrecios((producto?.precios ?? []).map((item) => ({ ...item, clave: item.id ?? claveLocal(), presentacionClave: item.presentacionId === presentacionBaseId ? "base" : item.presentacionId ?? item.presentacionClave })));
    if (!producto && generalId) setPrecios([{ clave: claveLocal(), presentacionClave: "base", tipoListaPrecioId: generalId, precio: "", cantidadMinima: "1" }]);
    setMarcaNueva(""); setErrorLocal(""); setCategoriaModalAbierto(false); setCategoriaNueva(""); setCategoriaNuevaImagen(undefined);
  }, [producto?.id, generalId]);

  useEffect(() => {
    const temporales = imagenesNuevas.map((imagen) => URL.createObjectURL(imagen));
    setVistasPreviasImagenes(temporales);
    return () => temporales.forEach((temporal) => URL.revokeObjectURL(temporal));
  }, [imagenesNuevas]);

  useEffect(() => {
    if (!marcaNuevaImagen) { setVistaPreviaMarca(""); return; }
    const temporal = URL.createObjectURL(marcaNuevaImagen); setVistaPreviaMarca(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [marcaNuevaImagen]);

  useEffect(() => {
    if (!categoriaNuevaImagen) { setVistaPreviaCategoria(""); return; }
    const temporal = URL.createObjectURL(categoriaNuevaImagen); setVistaPreviaCategoria(temporal);
    return () => URL.revokeObjectURL(temporal);
  }, [categoriaNuevaImagen]);

  async function crearMarca() {
    if (marcaNueva.trim().length < 2) { setErrorLocal("Escribe el nombre de la marca."); return; }
    if (!marcaNuevaImagen) { setErrorLocal("Selecciona la imagen de la marca."); return; }
    setCreandoMarca(true); setErrorLocal("");
    try { const marca = await alCrearMarca(marcaNueva, marcaNuevaImagen); setMarcaId(marca.id); setMarcaNueva(""); setMarcaNuevaImagen(undefined); setMarcaModalAbierto(false); if (marca.advertencia) setErrorLocal(marca.advertencia); }
    catch (problema) { setErrorLocal(problema instanceof Error ? problema.message : "No se pudo crear la marca."); }
    finally { setCreandoMarca(false); }
  }

  function seleccionarCategoriaImagen(archivo?: File) {
    if (!archivo) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      setErrorLocal("Usa una imagen JPG, PNG o WebP de máximo 5 MB.");
      return;
    }
    setErrorLocal("");
    setCategoriaNuevaImagen(archivo);
  }

  async function crearCategoria() {
    if (categoriaNueva.trim().length < 2) { setErrorLocal("Escribe el nombre de la categoría."); return; }
    if (!categoriaNuevaImagen) { setErrorLocal("Selecciona la imagen de la categoría."); return; }
    setCreandoCategoria(true); setErrorLocal("");
    try {
      const categoria = await alCrearCategoria(categoriaNueva, categoriaNuevaImagen);
      setCategoriaId(categoria.id); setCategoriaNueva(""); setCategoriaNuevaImagen(undefined); setCategoriaModalAbierto(false);
      if (categoria.advertencia) setErrorLocal(categoria.advertencia);
    } catch (problema) {
      setErrorLocal(problema instanceof Error ? problema.message : "No se pudo crear la categoría.");
    } finally { setCreandoCategoria(false); }
  }

  function agregarPresentacion() {
    setPresentaciones((actual) => [...actual, { clave: claveLocal(), unidadMedidaCodigo: "BX", nombre: "Caja", factorAUnidadBase: "12", seCompra: true, seVende: false }]);
  }
  function agregarPrecio() {
    setPrecios((actual) => [...actual, { clave: claveLocal(), presentacionClave: "base", tipoListaPrecioId: generalId, precio: "", cantidadMinima: "1" }]);
  }

  function seleccionarImagenes(archivos?: FileList | null) {
    if (!archivos?.length) return;
    const nuevas = Array.from(archivos);
    const actuales = (producto?.imagenes?.length ?? 0) - imagenesEliminadas.length + imagenesNuevas.length;
    const disponibles = Math.max(0, 5 - actuales);
    if (nuevas.length > disponibles) { setErrorLocal(`Cada producto admite hasta cinco imágenes. Puedes agregar ${disponibles} más.`); return; }
    const invalida = nuevas.find((archivo) => !["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024);
    if (invalida) { setErrorLocal("Cada imagen debe ser JPG, PNG o WebP y pesar como máximo 5 MB."); return; }
    setErrorLocal("");
    setImagenesNuevas((actuales) => [...actuales, ...nuevas]);
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
      codigos: codigos.filter((item) => item.codigo.trim()).map(({ tipo, codigo }) => ({ tipo, codigo: codigo.trim() })),
      presentaciones: presentaciones.map(({ clave, unidadMedidaCodigo: codigoUnidad, nombre: nombrePresentacion, factorAUnidadBase, seCompra, seVende }) => ({ clave, unidadMedidaCodigo: codigoUnidad, nombre: nombrePresentacion, factorAUnidadBase, seCompra, seVende })),
      precios: precios.filter((item) => item.precio !== "").map(({ presentacionClave, tipoListaPrecioId, precio, cantidadMinima, vigenteDesde, vigenteHasta }) => ({ presentacionClave, tipoListaPrecioId, precio, cantidadMinima, vigenteDesde, vigenteHasta })),
    };
    setGuardando(true);
    try { await alGuardar(datos, imagenesNuevas, imagenesEliminadas); }
    finally { setGuardando(false); }
  }

  const tienePrecioGeneral = precios.some((precio) => precio.presentacionClave === "base" && precio.tipoListaPrecioId === generalId && precio.precio.trim() !== "");

  return {
    nombre, setNombre, descripcion, setDescripcion, categoriaId, setCategoriaId,
    marcaId, setMarcaId, unidadBaseCodigo, setUnidadBaseCodigo, stockMinimo, setStockMinimo,
    afectacionIgv, setAfectacionIgv, activo, setActivo,
    imagenesNuevas, imagenesEliminadas, vistasPreviasImagenes, seleccionarImagenes,
    quitarImagenNueva: (indice: number) => setImagenesNuevas((actuales) => actuales.filter((_, i) => i !== indice)),
    quitarImagenExistente: (id: string) => setImagenesEliminadas((actuales) => [...actuales, id]),
    ficha, setFicha, codigos, setCodigos, presentaciones, setPresentaciones, precios, setPrecios,
    marcaNueva, setMarcaNueva, marcaModalAbierto, setMarcaModalAbierto, marcaNuevaImagen, setMarcaNuevaImagen, vistaPreviaMarca,
    creandoMarca, categoriaModalAbierto, setCategoriaModalAbierto, categoriaNueva, setCategoriaNueva,
    categoriaNuevaImagen, vistaPreviaCategoria, creandoCategoria, seleccionarCategoriaImagen,
    errorLocal, setErrorLocal, guardando, modoEdicion: Boolean(producto), tienePrecioGeneral,
    agregarPresentacion, agregarPrecio, crearMarca, crearCategoria, guardar,
  };
}
