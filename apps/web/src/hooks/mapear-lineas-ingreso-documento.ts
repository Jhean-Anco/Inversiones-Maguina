import { servicioIngresos } from "../services/ingresos.service";
import type { AfectacionIgv, LineaCarrito } from "../types/nuevo-ingreso";

type OrigenDocumentoIngreso = "orden" | "cotización";

const nuevaClave = () => globalThis.crypto?.randomUUID?.() ?? "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (caracter) => {
  const aleatorio = (Math.random() * 16) | 0;
  return (caracter === "x" ? aleatorio : (aleatorio & 3) | 8).toString(16);
});

function normalizarAfectacionIgv(valor: unknown): AfectacionIgv {
  return valor === "EXONERADO" || valor === "INAFECTO" ? valor : "GRAVADO";
}

export async function mapearLineasIngresoDocumento(detalles: Record<string, unknown>[], origen: OrigenDocumentoIngreso): Promise<LineaCarrito[]> {
  return Promise.all(detalles.map(async (entrada) => {
    const cantidad = String(entrada.cantidad ?? "1");
    const descuento = String(entrada.descuento ?? "0.00");
    const afectacionIgv = normalizarAfectacionIgv(entrada.afectacionIgv);

    if (entrada.tipo === "SERVICIO") {
      return {
        clave: nuevaClave(),
        tipo: "SERVICIO",
        descripcion: String(entrada.descripcion ?? entrada.nombreVisible ?? "Servicio"),
        cantidad,
        precio: Number(entrada.precioUnitario ?? 0).toFixed(2),
        descuento,
        afectacionIgv,
      };
    }
    if (entrada.tipo !== "PRODUCTO") {
      throw new Error(`La ${origen} contiene una línea que no se puede cargar en venta de repuestos.`);
    }

    const nombre = String(entrada.nombreVisible ?? "").split(" · ")[0].slice(0, 100);
    const presentacionId = String(entrada.presentacionId ?? "");
    const productos = await servicioIngresos.buscarProductos(nombre);
    const producto = productos.find((opcion) => opcion.presentacionId === presentacionId);
    if (!producto) {
      throw new Error(`No se encontró en el inventario la presentación de ${String(entrada.nombreVisible ?? "un repuesto")}. Revisa esa línea antes de emitir.`);
    }

    return {
      clave: nuevaClave(),
      tipo: "PRODUCTO",
      producto: { ...producto, precio: String(entrada.precioUnitario ?? producto.precio) },
      cantidad,
      descuento,
      afectacionIgv,
    };
  }));
}
