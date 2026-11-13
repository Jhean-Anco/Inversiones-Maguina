import assert from "node:assert/strict";
import { test } from "node:test";
import { mismoCorrelativoPropuesta, obtenerCampoPropuesta } from "./sire-propuesta.util";

test("lee encabezados descriptivos de la propuesta real de SIRE", () => {
  const fila = {
    "Tipo CP/Doc.": "01",
    "Serie del CDP": "F001",
    "Nro CP o Doc. Nro Inicial (Rango)": "00004546",
    "Nro Doc Identidad": "20123456789",
    "Apellidos Nombres/ Razón Social": "Proveedor de prueba S.A.C.",
    "Total CP": "3394.50",
    Moneda: "PEN",
  };

  assert.equal(obtenerCampoPropuesta(fila, ["Tipo CP/Doc."]), "01");
  assert.equal(obtenerCampoPropuesta(fila, ["Serie del CDP"]), "F001");
  assert.equal(obtenerCampoPropuesta(fila, ["Nro CP o Doc. Nro Inicial (Rango)" ]), "00004546");
  assert.equal(obtenerCampoPropuesta(fila, ["Nro Doc Identidad"]), "20123456789");
  assert.equal(obtenerCampoPropuesta(fila, ["Apellidos Nombres/ Razón Social"]), "Proveedor de prueba S.A.C.");
  assert.equal(obtenerCampoPropuesta(fila, ["Total CP"]), "3394.50");
  assert.equal(obtenerCampoPropuesta(fila, ["Moneda"]), "PEN");
});

test("compara ceros iniciales solo para correlativos numéricos", () => {
  assert.equal(mismoCorrelativoPropuesta("00004546", "4546"), true);
  assert.equal(mismoCorrelativoPropuesta("0000", "0"), true);
  assert.equal(mismoCorrelativoPropuesta("A004", "a004"), true);
  assert.equal(mismoCorrelativoPropuesta("A004", "004"), false);
});
