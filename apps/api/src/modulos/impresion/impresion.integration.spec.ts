import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { eq, inArray } from "drizzle-orm";
import { ServicioEmpresa } from "../empresa/empresa.service";
import { ControladorEmpresa } from "../empresa/empresa.controller";
import { ControladorImpresion } from "./impresion.controller";
import { ServicioImpresion } from "./impresion.service";

const url = new URL(process.env.DATABASE_URL ?? "postgres://invalido");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(url.pathname, "/magina_test");
assert.equal(url.username, "ci");

type Paquete = typeof import("@magina/database");
let esquema: Paquete;
let db: Paquete["db"];
let usuarioId: string;
const ingresoIds: string[] = [];
const notaIds: string[] = [];
let personaId: string;
const empresa = new ServicioEmpresa();
const impresion = new ServicioImpresion(empresa);

async function crearIngreso(valores: Partial<Paquete["ingresos"]["$inferInsert"]>) {
  const [fila] = await db.insert(esquema.ingresos).values({
    codigo: `QA-IMP-${randomUUID().slice(0, 12)}`, fecha: "2026-11-25", tipoComprobante: "BOLETA", medioPago: "EFECTIVO",
    subtotal: "100.00", igv: "18.00", total: "118.00", usuarioId, estado: "EMITIDO", ...valores,
  }).returning({ id: esquema.ingresos.id });
  ingresoIds.push(fila.id);
  return fila.id;
}

before(async () => {
  esquema = await import("@magina/database");
  db = esquema.db;
  await db.delete(esquema.configuracionEmpresa);
  const [tipoNatural] = await db.select({ id: esquema.tiposPersona.id }).from(esquema.tiposPersona).where(eq(esquema.tiposPersona.codigo, "NATURAL")).limit(1);
  const [tipoDni] = await db.select({ id: esquema.tiposDocumento.id }).from(esquema.tiposDocumento).where(eq(esquema.tiposDocumento.codigo, "01")).limit(1);
  const sufijo = randomUUID().replaceAll("-", "").slice(0, 10);
  const [persona] = await db.insert(esquema.personas).values({
    tipoPersonaId: tipoNatural.id, tipoDocumentoId: tipoDni.id, numeroDocumento: String(BigInt(`0x${sufijo.slice(0, 8)}`) % 100_000_000n).padStart(8, "0"),
    nombres: `QA Impresion ${sufijo}`, apellidoPaterno: "Pruebas",
  }).returning({ id: esquema.personas.id });
  personaId = persona.id;
  await db.insert(esquema.trabajadores).values({ personaId, fechaIngreso: "2026-01-01" });
  const [usuario] = await db.insert(esquema.usuarios).values({
    trabajadorId: personaId, nombreUsuario: `qa_imp_${sufijo}`, correo: `qa-imp-${sufijo}@example.invalid`, contrasenaHash: "hash-ficticio", requiereCambioContrasena: false,
  }).returning({ id: esquema.usuarios.id });
  usuarioId = usuario.id;
});

after(async () => {
  if (notaIds.length) await db.delete(esquema.comprobantesRelacionados).where(inArray(esquema.comprobantesRelacionados.id, notaIds));
  if (ingresoIds.length) await db.delete(esquema.ingresos).where(inArray(esquema.ingresos.id, ingresoIds));
  await db.delete(esquema.configuracionEmpresa);
  await db.delete(esquema.usuarios).where(eq(esquema.usuarios.id, usuarioId));
  await db.delete(esquema.trabajadores).where(eq(esquema.trabajadores.personaId, personaId));
  await db.delete(esquema.personas).where(eq(esquema.personas.id, personaId));
  await esquema.cerrarBaseDatos();
});

test("configura los datos de la empresa y los expone por el controlador", async () => {
  const controlador = new ControladorEmpresa(empresa);
  assert.deepEqual(await controlador.obtener(), { empresa: null });
  Object.assign(process.env, { EMPRESA_RUC: "20100066603", EMPRESA_RAZON_SOCIAL: "Entorno SAC", EMPRESA_DIRECCION: "Jr. Env 3" });
  try { assert.equal((await controlador.obtener()).empresa?.razonSocial, "ENTORNO SAC"); }
  finally { for (const n of ["EMPRESA_RUC", "EMPRESA_RAZON_SOCIAL", "EMPRESA_DIRECCION"]) delete process.env[n]; }
  const guardado = await controlador.guardar({ ruc: "20100066603", razonSocial: "Demo SAC", direccion: "Av. Uno 1" }, { usuario: { id: usuarioId } } as never);
  assert.equal(guardado.empresa.razonSocial, "DEMO SAC");
  await empresa.guardar({ ruc: "20100066603", razonSocial: "Demo Actualizada SAC", direccion: "Av. Dos 2", urlConsultaComprobantes: "https://cpe.demo.pe" }, usuarioId);
  const leido = await empresa.obtener();
  assert.equal(leido?.razonSocial, "DEMO ACTUALIZADA SAC");
  assert.equal(leido?.urlConsultaComprobantes, "https://cpe.demo.pe/");
  const [fila] = await db.select().from(esquema.configuracionEmpresa);
  assert.equal(fila.actualizadoPor, usuarioId);
  await assert.rejects(() => empresa.guardar({ ruc: "1" }, usuarioId), BadRequestException);
});

test("imprime una boleta emitida con hash, QR y datos del emisor", async () => {
  const id = await crearIngreso({
    datosNubefact: {
      solicitud: { serie: "B001", numero: 45, fecha_de_emision: "25-11-2026", cliente_tipo_de_documento: 1, cliente_numero_de_documento: "45678912", cliente_denominacion: "ANA", total: 118, total_igv: 18, total_gravada: 100, items: [{ descripcion: "Filtro", cantidad: 1, precio_unitario: 118, total: 118 }] },
      respuesta: { aceptada_por_sunat: true, codigo_hash: "HASH==", cadena_para_codigo_qr: "QR|" },
    },
  });
  const documento = await new ControladorImpresion(impresion).comprobante(id);
  assert.equal(documento.serieNumero, "B001-000045");
  assert.equal(documento.emisor?.ruc, "20100066603");
  assert.equal(documento.hash, "HASH==");
  assert.deepEqual(documento.advertencias, []);
});

test("imprime una nota de venta con sus líneas registradas", async () => {
  const id = await crearIngreso({ tipoComprobante: "NOTA_VENTA", subtotal: "50.00", igv: "0.00", total: "50.00", clienteNombre: "Cliente Mostrador", clienteTipoDocumento: "DNI", clienteNumeroDocumento: "12345678" });
  await db.insert(esquema.ingresosDetalle).values({ ingresoId: id, tipo: "SERVICIO", descripcion: "Cambio de aceite", cantidad: "1", precioUnitario: "50", afectoIgv: false, afectacionIgv: "INAFECTO", subtotal: "50.00", igv: "0.00", total: "50.00" });
  const documento = await impresion.comprobante(id);
  assert.equal(documento.tipo, "NOTA_VENTA");
  assert.equal(documento.items[0].descripcion, "Cambio de aceite");
  assert.equal(documento.cliente.tipoDocumento, "DNI");
});

test("bloquea comprobantes rechazados y valida identificadores", async () => {
  const rechazado = await crearIngreso({ estado: "ERROR_NUBEFACT", datosNubefact: { solicitud: { serie: "B001", numero: 46 }, respuesta: { errors: "Documento inválido" } } });
  await assert.rejects(() => impresion.comprobante(rechazado), ConflictException);
  await assert.rejects(() => impresion.comprobante("no-uuid"), BadRequestException);
  await assert.rejects(() => impresion.comprobante(randomUUID()), NotFoundException);
});

test("imprime notas de crédito con referencia al comprobante modificado", async () => {
  const origen = await crearIngreso({ tipoComprobante: "FACTURA", estado: "EMITIDO", datosNubefact: { solicitud: { serie: "F001", numero: 9 }, respuesta: { aceptada_por_sunat: true } } });
  const id = randomUUID();
  notaIds.push(id);
  await db.insert(esquema.comprobantesRelacionados).values({
    id, ingresoOrigenId: origen, tipoComprobante: "NOTA_CREDITO", codigoMotivo: 7, motivo: "Devolución por ítem", fecha: "2026-11-26", serie: "FC01", numero: 1,
    subtotal: "10.00", igv: "1.80", total: "11.80", estado: "EMITIDO", usuarioId,
    datosNubefact: { solicitud: { serie: "FC01", numero: 1, fecha_de_emision: "26-11-2026", total: 11.8, total_igv: 1.8 }, respuesta: { aceptada_por_sunat: true, codigo_hash: "H" } },
  });
  const documento = await new ControladorImpresion(impresion).nota(origen, id);
  assert.equal(documento.titulo, "NOTA DE CRÉDITO ELECTRÓNICA");
  assert.deepEqual(documento.documentoModificado, { serieNumero: "F001-000009", motivo: "Devolución por ítem" });
  await assert.rejects(() => impresion.nota(origen, "x"), BadRequestException);
  await assert.rejects(() => impresion.nota(randomUUID(), id), NotFoundException);
});
