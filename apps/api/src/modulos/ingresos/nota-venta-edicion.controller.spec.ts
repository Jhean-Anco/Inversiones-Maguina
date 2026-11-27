import "reflect-metadata";
import assert from "node:assert/strict";
import { test } from "node:test";
import { ControladorNotaVentaEdicion } from "./nota-venta-edicion.controller";
import type { ServicioNotaVentaEdicion } from "./nota-venta-edicion.service";

test("el controlador de edición delega con el usuario autenticado y exige permiso de registro de ventas", async () => {
  const llamadas: [string, unknown[]][] = [];
  const servicio = new Proxy({}, { get: (_objetivo, metodo: string) => (...argumentos: unknown[]) => { llamadas.push([metodo, argumentos]); return metodo; } }) as ServicioNotaVentaEdicion;
  const controlador = new ControladorNotaVentaEdicion(servicio);
  controlador.obtener("id");
  controlador.editar("id", { detalles: [] }, { usuario: { id: "usuario-1" } } as never);
  assert.deepEqual(llamadas, [["obtener", ["id"]], ["editar", ["id", { detalles: [] }, "usuario-1"]]]);
  for (const metodo of [ControladorNotaVentaEdicion.prototype.obtener, ControladorNotaVentaEdicion.prototype.editar]) {
    assert.ok(Reflect.getMetadataKeys(metodo).some((llave) => JSON.stringify(Reflect.getMetadata(llave, metodo)).includes("INGRESOS.CREAR")));
  }
});
