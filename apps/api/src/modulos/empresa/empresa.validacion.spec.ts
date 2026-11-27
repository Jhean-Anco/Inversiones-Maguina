import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { test } from "node:test";
import { datosEmpresaDesdeEntorno, validarDatosEmpresa } from "./empresa.validacion";

const base = { ruc: "20100066603", razonSocial: "  inversiones   maguiña s.a.c. ", direccion: "Av. Principal 123", correo: "VENTAS@Demo.PE", urlConsultaComprobantes: "https://consulta.demo.pe/cpe" };

test("normaliza los datos válidos del emisor", () => {
  assert.deepEqual(validarDatosEmpresa({ ...base, telefono: "  ", nombreComercial: "Maguiña", sitioWeb: "www.demo.pe", mensajePie: "Gracias" }), {
    ruc: "20100066603", razonSocial: "INVERSIONES MAGUIÑA S.A.C.", nombreComercial: "Maguiña", direccion: "Av. Principal 123", telefono: null,
    correo: "ventas@demo.pe", sitioWeb: "www.demo.pe", mensajePie: "Gracias", urlConsultaComprobantes: "https://consulta.demo.pe/cpe",
  });
  assert.equal(validarDatosEmpresa({ ...base, correo: null, urlConsultaComprobantes: "" }).urlConsultaComprobantes, null);
});

test("rechaza datos inválidos con mensajes claros", () => {
  const rechaza = (entrada: unknown, mensaje: RegExp) => assert.throws(() => validarDatosEmpresa(entrada), (error) => error instanceof BadRequestException && mensaje.test(error.message));
  rechaza(null, /Envía los datos/);
  rechaza([], /Envía los datos/);
  rechaza({ ...base, ruc: "" }, /Ingresa el ruc/);
  rechaza({ ...base, ruc: "20100066604" }, /RUC no es válido/);
  rechaza({ ...base, ruc: 20100066603 }, /RUC no es válido/);
  rechaza({ ...base, razonSocial: "x".repeat(201) }, /máximo 200/);
  rechaza({ ...base, direccion: undefined }, /dirección fiscal/);
  rechaza({ ...base, correo: "no-es-correo" }, /correo no es válido/);
  rechaza({ ...base, urlConsultaComprobantes: "http://consulta.demo.pe" }, /HTTPS/);
  rechaza({ ...base, urlConsultaComprobantes: "https://user:pw@consulta.demo.pe" }, /HTTPS/);
  rechaza({ ...base, urlConsultaComprobantes: "no es url" }, /dirección web válida/);
});

test("toma los datos del emisor de las variables EMPRESA_* y los valida", () => {
  assert.equal(datosEmpresaDesdeEntorno({}), null);
  assert.equal(datosEmpresaDesdeEntorno({ EMPRESA_RUC: "  " }), null);
  const datos = datosEmpresaDesdeEntorno({ EMPRESA_RUC: "20100066603", EMPRESA_RAZON_SOCIAL: "Demo sac", EMPRESA_DIRECCION: "Av. Uno 1", EMPRESA_TELEFONO: "999", EMPRESA_MENSAJE_PIE: "Gracias" });
  assert.equal(datos?.razonSocial, "DEMO SAC");
  assert.equal(datos?.telefono, "999");
  assert.equal(datos?.mensajePie, "Gracias");
  assert.throws(() => datosEmpresaDesdeEntorno({ EMPRESA_RUC: "20100066603" }), /Datos de empresa del entorno inválidos/);
  assert.throws(() => datosEmpresaDesdeEntorno({ EMPRESA_RUC: "1", EMPRESA_RAZON_SOCIAL: "X", EMPRESA_DIRECCION: "Y" }), /RUC no es válido/);
});
