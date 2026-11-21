import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ServicioProductos } from "./productos.service";
import { esCodigoEAN13Valido } from "./codigo-barras";

const categoriaId = "00000000-0000-4000-8000-000000000001";
const marcaId = "00000000-0000-4000-8000-000000000002";

function validar(datosParciales: Record<string, unknown> = {}) {
  const servicio = new ServicioProductos();
  const datos = {
    nombre: "Filtro de aceite",
    categoriaId,
    marcaId,
    unidadBaseCodigo: "NIU",
    stockMinimo: "0",
    afectacionIgv: "GRAVADO",
    fichaTecnica: {},
    codigos: [],
    presentaciones: [],
    ...datosParciales,
  };
  const validador = servicio as unknown as { validarDatos: (entrada: unknown) => { codigos: Array<{ tipo: string; codigo: string }>; fichaTecnica: Record<string, unknown>; afectacionIgv: string; activo?: boolean } };
  return validador.validarDatos(datos);
}

test("asigna un código EAN-13 interno al guardar un producto sin código de barras", () => {
  const { codigos } = validar();
  assert.equal(codigos.length, 1);
  assert.equal(codigos[0].tipo, "BARRAS");
  assert.equal(esCodigoEAN13Valido(codigos[0].codigo), true);
});

test("conserva un GTIN ingresado y no genera otro código de barras", () => {
  const gtin = "4006381333931";
  const { codigos } = validar({ codigos: [{ tipo: "GTIN", codigo: gtin }] });
  assert.deepEqual(codigos.map((codigo) => codigo.codigo), [gtin]);
});

test("valida datos continuos de ficha técnica y conserva sus tipos", () => {
  const { fichaTecnica } = validar({ fichaTecnica: { voltaje: 12, reforzado: true, compatibilidad: null } });
  assert.deepEqual(fichaTecnica, { voltaje: 12, reforzado: true, compatibilidad: null });
});

test("rechaza ficha técnica que no sea un objeto", () => {
  assert.throws(() => validar({ fichaTecnica: ["12V"] }), BadRequestException);
});

test("normaliza ficha técnica ausente y acepta solo valores simples", () => {
  assert.deepEqual(validar({ fichaTecnica: undefined }).fichaTecnica, {});
  assert.deepEqual(validar({ fichaTecnica: { acabado: "  negro  ", voltaje: 12, reforzado: false, nota: null } }).fichaTecnica,
    { acabado: "negro", voltaje: 12, reforzado: false, nota: null });
  assert.throws(() => validar({ fichaTecnica: { peso: Number.NaN } }), /debe ser texto, número o sí\/no/i);
  assert.throws(() => validar({ fichaTecnica: Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`dato${i}`, i])) }), /hasta 40/i);
});

test("valida afectación IGV y conserva el estado explícito del producto", () => {
  assert.equal(validar({ afectoIgv: true, activo: false }).afectacionIgv, "GRAVADO");
  assert.equal(validar({ afectacionIgv: undefined, afectoIgv: false, activo: true }).afectacionIgv, "INAFECTO");
  assert.equal(validar({ activo: false }).activo, false);
  assert.throws(() => validar({ afectacionIgv: "OTRO" }), /gravado, exonerado o inafecto/i);
});

test("el catálogo conserva únicamente los datos maestros del repuesto", () => {
  const producto = validar({ precios: [{ precio: "12.00" }], cantidad: 10 });
  assert.equal(Object.hasOwn(producto, "precios"), false);
  assert.equal(Object.hasOwn(producto, "cantidad"), false);
});

test("rechaza códigos externos con un tipo no permitido", () => {
  assert.throws(() => validar({ codigos: [{ tipo: "DESCONOCIDO", codigo: "X-1" }] }), /tipo de código/i);
});

test("rechaza presentaciones duplicadas y presentaciones sin uso", () => {
  assert.throws(() => validar({ presentaciones: [{ clave: "base", unidadMedidaCodigo: "NIU", nombre: "Duplicada", factorAUnidadBase: "1", seCompra: true, seVende: true }] }), /identificador diferente/i);
  assert.throws(() => validar({ presentaciones: [{ clave: "caja", unidadMedidaCodigo: "NIU", nombre: "Caja", factorAUnidadBase: "12", seCompra: false, seVende: false }] }), /debe usarse para compra o venta/i);
});
