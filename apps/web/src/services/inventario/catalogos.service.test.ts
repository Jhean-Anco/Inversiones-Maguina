import { describe } from "vitest";
import { servicioCategorias, servicioMarcas } from "./catalogos.service";
import { probarSolicitudes } from "../../test/solicitudes";

const json = "POST" as const;

describe("servicios de catálogos de inventario", () => {
  probarSolicitudes([
    { nombre: "listar categorías", llamar: () => servicioCategorias.listar(), url: "/inventario/categorias" },
    { nombre: "crear categoría", llamar: () => servicioCategorias.guardar({ nombre: "Filtros" }), url: "/inventario/categorias", metodo: json, cuerpo: { nombre: "Filtros" } },
    { nombre: "renombrar categoría", llamar: () => servicioCategorias.guardar({ nombre: "Frenos", id: "c1" }), url: "/inventario/categorias/c1", metodo: "PATCH", cuerpo: { nombre: "Frenos" } },
    { nombre: "crear marca con uso", llamar: () => servicioMarcas.guardar({ nombre: "Bajaj", uso: "MOTOTAXIS" }), url: "/inventario/marcas", metodo: json, cuerpo: { nombre: "Bajaj", uso: "MOTOTAXIS" } },
    { nombre: "desactivar marca activa", llamar: () => servicioMarcas.cambiarEstado({ id: "m1", nombre: "Bajaj", activo: true, uso: "AMBOS" }), url: "/inventario/marcas/m1", metodo: "PATCH", cuerpo: { activo: false }, esperado: undefined },
    { nombre: "activar categoría inactiva", llamar: () => servicioCategorias.cambiarEstado({ id: "c1", nombre: "Filtros", activo: false }), url: "/inventario/categorias/c1", metodo: "PATCH", cuerpo: { activo: true }, esperado: undefined },
  ]);
});
