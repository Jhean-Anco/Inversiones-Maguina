import assert from "node:assert/strict";
import test from "node:test";
import { ServicioProductos } from "./productos.service";
import { esCodigoEAN13Valido } from "./codigo-barras";

const categoriaId = "00000000-0000-4000-8000-000000000001";
const marcaId = "00000000-0000-4000-8000-000000000002";
const listaId = "00000000-0000-4000-8000-000000000003";

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
    precios: [{ presentacionClave: "base", tipoListaPrecioId: listaId, precio: "12.00", cantidadMinima: "1" }],
    ...datosParciales,
  };
  const validador = servicio as unknown as { validarDatos: (entrada: unknown) => { codigos: Array<{ tipo: string; codigo: string }> } };
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
