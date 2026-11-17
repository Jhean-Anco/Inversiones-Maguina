import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CatalogosProducto, CodigoProducto, DatosProducto, PrecioProducto, PresentacionProducto, Producto } from "../services/inventario/productos.service";

type Propiedades = {
  producto?: Producto | null;
  catalogos: CatalogosProducto;
  alGuardar: (datos: DatosProducto) => Promise<boolean>;
  alCrearMarca: (nombre: string) => Promise<{ id: string; nombre: string; advertencia?: string }>;
  alCrearCategoria: (nombre: string) => Promise<{ id: string; nombre: string; advertencia?: string }>;
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
  const [ficha, setFicha] = useState<Array<{ id: string; clave: string; valor: string }>>([]);
  const [codigos, setCodigos] = useState<Array<{ clave: string; tipo: CodigoProducto["tipo"]; codigo: string }>>([]);
  const [presentaciones, setPresentaciones] = useState<Array<PresentacionProducto & { clave: string }>>([]);
  const [precios, setPrecios] = useState<Array<PrecioProducto & { clave: string }>>([]);
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
    setCodigos((producto?.codigos ?? []).map((item) => ({ ...item, clave: item.id ?? claveLocal() })));
    const adicionales = (producto?.presentaciones ?? []).filter((item) => !item.esBase).map((item) => ({ ...item, clave: item.clave ?? item.id ?? claveLocal() }));
    setPresentaciones(adicionales);
    const presentacionBaseId = producto?.presentaciones.find((presentacion) => presentacion.esBase)?.id;
    setPrecios((producto?.precios ?? []).map((item) => ({ ...item, clave: item.id ?? claveLocal(), presentacionClave: item.presentacionId === presentacionBaseId ? "base" : item.presentacionId ?? item.presentacionClave })));
    if (!producto && generalId) setPrecios([{ clave: claveLocal(), presentacionClave: "base", tipoListaPrecioId: generalId, precio: "", cantidadMinima: "1" }]);
    setMarcaNueva(""); setErrorLocal(""); setCategoriaModalAbierto(false); setCategoriaNueva("");
  }, [producto?.id, generalId]);

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
  function agregarPrecio() {
    setPrecios((actual) => [...actual, { clave: claveLocal(), presentacionClave: "base", tipoListaPrecioId: generalId, precio: "", cantidadMinima: "1" }]);
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
    try { await alGuardar(datos); }
    finally { setGuardando(false); }
  }

  const tienePrecioGeneral = precios.some((precio) => precio.presentacionClave === "base" && precio.tipoListaPrecioId === generalId && precio.precio.trim() !== "");

  return {
    nombre, setNombre, descripcion, setDescripcion, categoriaId, setCategoriaId,
    marcaId, setMarcaId, unidadBaseCodigo, setUnidadBaseCodigo, stockMinimo, setStockMinimo,
    afectacionIgv, setAfectacionIgv, activo, setActivo,
    ficha, setFicha, codigos, setCodigos, presentaciones, setPresentaciones, precios, setPrecios,
    marcaNueva, setMarcaNueva, marcaModalAbierto, setMarcaModalAbierto,
    creandoMarca, categoriaModalAbierto, setCategoriaModalAbierto, categoriaNueva, setCategoriaNueva,
    creandoCategoria,
    errorLocal, setErrorLocal, guardando, modoEdicion: Boolean(producto), tienePrecioGeneral,
    agregarPresentacion, agregarPrecio, crearMarca, crearCategoria, guardar,
  };
}
