import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import dotenv from "dotenv";
import postgres from "postgres";

const raiz = resolve(process.cwd(), "../..");
dotenv.config({ path: resolve(raiz, ".env") });

if (process.env.NODE_ENV !== "development") {
  throw new Error("La carga de datos de frontend solo se permite con NODE_ENV=development.");
}

const baseDatos = process.env.POSTGRES_DB || "magina";
const puerto = process.env.POSTGRES_PORT || "5433";
const usuario = process.env.POSTGRES_USER || "postgres";
const clave = process.env.POSTGRES_PASSWORD;
if (!clave || baseDatos !== "magina" || puerto !== "5433") {
  throw new Error("Se esperaba la PostgreSQL local de desarrollo magina publicada en el puerto 5433.");
}

const url = new URL("postgres://127.0.0.1");
url.port = puerto;
url.username = usuario;
url.password = clave;
url.pathname = `/${baseDatos}`;
const sql = postgres(url.toString(), { max: 1, connect_timeout: 5, idle_timeout: 5 });

const clientesDemo = [
  { tipo: "JURIDICA", doc: "20609999001", codigoDoc: "06", razon: "DEMO FRONTEND · Comercial Horizonte" , contacto: "Equipo de compras Horizonte", telefono: "900000101", correo: "horizonte@frontend-demo.invalid", direccion: "Dirección ficticia 101, Lima" },
  { tipo: "NATURAL", doc: "99000001", codigoDoc: "01", nombres: "DEMO FRONTEND · Andrea", paterno: "Prueba", materno: "Cliente", contacto: "Andrea Prueba Cliente", telefono: "900000102", correo: "andrea@frontend-demo.invalid", direccion: "Dirección ficticia 102, Lima" },
  { tipo: "JURIDICA", doc: "20609999002", codigoDoc: "06", razon: "DEMO FRONTEND · Taller Ruta Norte S.A.C.", contacto: "Coordinación Taller Ruta Norte", telefono: "900000103", correo: "ruta-norte@frontend-demo.invalid", direccion: "Dirección ficticia 103, Lima" },
  { tipo: "NATURAL", doc: "99000002", codigoDoc: "01", nombres: "DEMO FRONTEND · Luis Alberto", paterno: "Muestra", materno: "Diseño", contacto: "Luis Alberto Muestra Diseño", telefono: "900000104", correo: "luis@frontend-demo.invalid", direccion: "Dirección ficticia 104, Lima" },
];

const proveedoresDemo = [
  { tipo: "JURIDICA", doc: "20609999101", codigoDoc: "06", razon: "DEMO FRONTEND · Suministros Andinos S.A.C.", telefono: "900000201", correo: "andinos@frontend-demo.invalid" },
  { tipo: "JURIDICA", doc: "20609999102", codigoDoc: "06", razon: "DEMO FRONTEND · Repuestos del Pacífico S.A.C.", telefono: "900000202", correo: "pacifico@frontend-demo.invalid" },
  { tipo: "NATURAL", doc: "99000101", codigoDoc: "01", nombres: "DEMO FRONTEND · Mario", paterno: "Proveedor", materno: "Muestra", telefono: "900000203", correo: "mario@frontend-demo.invalid" },
];

const transportistasDemo = [
  { tipo: "JURIDICA", doc: "20609999201", codigoDoc: "06", razon: "DEMO FRONTEND · Transporte Vía Clara S.A.C.", telefono: "900000301", correo: "viaclara@frontend-demo.invalid" },
  { tipo: "JURIDICA", doc: "20609999202", codigoDoc: "06", razon: "DEMO FRONTEND · Logística Costa Sur S.A.C.", telefono: "900000302", correo: "costasur@frontend-demo.invalid" },
];

const conductoresDemo = [
  { doc: "99000201", nombres: "DEMO FRONTEND · Camila", paterno: "Conducción", materno: "Muestra", licencia: "Q0000201", telefono: "900000401" },
  { doc: "99000202", nombres: "DEMO FRONTEND · Diego", paterno: "Conducción", materno: "Prueba", licencia: "Q0000202", telefono: "900000402" },
  { doc: "99000203", nombres: "DEMO FRONTEND · Valeria", paterno: "Chofer", materno: "Ejemplo", licencia: "Q0000203", telefono: "900000403" },
  { doc: "99000204", nombres: "DEMO FRONTEND · Martín", paterno: "Transportista", materno: "Muestra", licencia: "Q0000204", telefono: "900000404" },
];

// Suficiente variedad para paginación, búsqueda y filtros en el entorno local.
// Los identificadores y contactos son ficticios y usan dominios/números reservados.
for (let i = 5; i <= 12; i += 1) {
  const n = String(i).padStart(2, "0");
  clientesDemo.push({ tipo: i % 2 ? "NATURAL" : "JURIDICA", doc: i % 2 ? `990000${String(100 + i)}` : `20609999${String(200 + i).padStart(3, "0")}`, codigoDoc: i % 2 ? "01" : "06", ...(i % 2 ? { nombres: `DEMO FRONTEND Cliente ${n}`, paterno: "Muestra", materno: "Local" } : { razon: `DEMO FRONTEND Comercio ${n} S.A.C.` }), contacto: `Contacto de muestra ${n}`, telefono: `900001${String(i).padStart(3, "0")}`, correo: `cliente${n}@frontend-demo.invalid`, direccion: `Direccion ficticia ${n}, Lima` });
  proveedoresDemo.push({ tipo: "JURIDICA", doc: `20609998${String(i).padStart(3, "0")}`, codigoDoc: "06", razon: `DEMO FRONTEND Proveedor ${n} S.A.C.`, telefono: `900002${String(i).padStart(3, "0")}`, correo: `proveedor${n}@frontend-demo.invalid` });
  transportistasDemo.push({ tipo: "JURIDICA", doc: `20609997${String(i).padStart(3, "0")}`, codigoDoc: "06", razon: `DEMO FRONTEND Transporte ${n} S.A.C.`, telefono: `900003${String(i).padStart(3, "0")}`, correo: `transporte${n}@frontend-demo.invalid` });
  conductoresDemo.push({ doc: `990003${String(i).padStart(2, "0")}`, nombres: `DEMO FRONTEND Conductor ${n}`, paterno: "Muestra", materno: "Local", licencia: `Q00003${String(i).padStart(2, "0")}`, telefono: `900004${String(i).padStart(3, "0")}` });
}

function fechaDemo(diasAntes = 0) {
  const fecha = new Date();
  fecha.setUTCDate(fecha.getUTCDate() - diasAntes);
  return fecha.toISOString().slice(0, 10);
}

async function asegurarPersona(tx, registro) {
  const [tipoPersona] = await tx`select id from tipos_persona where codigo = ${registro.tipo}`;
  const [tipoDocumento] = await tx`select id from tipos_documento where codigo = ${registro.codigoDoc}`;
  if (!tipoPersona || !tipoDocumento) throw new Error(`Falta el catálogo de persona/documento ${registro.tipo}/${registro.codigoDoc}.`);

  let [persona] = await tx`select id from personas where tipo_documento_id = ${tipoDocumento.id} and numero_documento = ${registro.doc}`;
  if (!persona) {
    [persona] = await tx`
      insert into personas (tipo_persona_id, nombres, apellido_paterno, apellido_materno, razon_social, tipo_documento_id, numero_documento)
      values (${tipoPersona.id}, ${registro.nombres ?? null}, ${registro.paterno ?? null}, ${registro.materno ?? null}, ${registro.razon ?? null}, ${tipoDocumento.id}, ${registro.doc})
      on conflict (tipo_documento_id, numero_documento) do nothing returning id`;
    if (!persona) [persona] = await tx`select id from personas where tipo_documento_id = ${tipoDocumento.id} and numero_documento = ${registro.doc}`;
  }

  await tx`insert into personas_documentos (persona_id, tipo_documento_id, numero_documento)
    values (${persona.id}, ${tipoDocumento.id}, ${registro.doc}) on conflict do nothing`;

  const [tipoTelefono] = await tx`select id from tipos_contacto where codigo = 'TELEFONO_MOVIL'`;
  const [tipoCorreo] = await tx`select id from tipos_contacto where codigo = 'CORREO_ELECTRONICO'`;
  if (registro.telefono) await tx`insert into personas_contactos (persona_id, tipo_contacto_id, valor, etiqueta, es_principal)
    select ${persona.id}, ${tipoTelefono.id}, ${registro.telefono}, 'DEMO FRONTEND', true
    where not exists (select 1 from personas_contactos where persona_id = ${persona.id} and tipo_contacto_id = ${tipoTelefono.id} and valor = ${registro.telefono})
    on conflict do nothing`;
  if (registro.correo) await tx`insert into personas_contactos (persona_id, tipo_contacto_id, valor, etiqueta, es_principal)
    select ${persona.id}, ${tipoCorreo.id}, ${registro.correo}, 'DEMO FRONTEND', true
    where not exists (select 1 from personas_contactos where persona_id = ${persona.id} and tipo_contacto_id = ${tipoCorreo.id} and valor = ${registro.correo})
    on conflict do nothing`;
  return persona.id;
}

async function asegurarCodigo(tx, tabla, codigo) {
  const [fila] = await tx`select id from ${tx(tabla)} where codigo = ${codigo}`;
  return fila?.id ?? null;
}

const resumen = await sql.begin(async (tx) => {
  const [usuarioDemo] = await tx`select id from usuarios order by creado_en asc limit 1`;
  if (!usuarioDemo) throw new Error("No hay un usuario local para vincular los registros de desarrollo.");

  const personasCliente = [];
  for (const registro of clientesDemo) {
    const personaId = await asegurarPersona(tx, registro);
    await tx`insert into clientes (persona_id, nombre_comercial, contacto_nombre, correo, telefono, direccion_fiscal, direccion_entrega, observacion)
      values (${personaId}, ${registro.razon ?? null}, ${registro.contacto}, ${registro.correo}, ${registro.telefono}, ${registro.direccion}, ${registro.direccion}, 'DEMO FRONTEND: dato ficticio local para edición de interfaz')
      on conflict (persona_id) do nothing`;
    personasCliente.push(personaId);
  }

  const personasProveedor = [];
  for (const registro of proveedoresDemo) {
    const personaId = await asegurarPersona(tx, registro);
    await tx`insert into proveedores (persona_id, nombre_comercial, observacion)
      values (${personaId}, ${registro.razon ?? null}, 'DEMO FRONTEND: dato ficticio local para edición de interfaz')
      on conflict (persona_id) do nothing`;
    personasProveedor.push(personaId);
  }

  for (const registro of transportistasDemo) {
    const personaId = await asegurarPersona(tx, registro);
    await tx`insert into transportistas (persona_id) values (${personaId}) on conflict (persona_id) do nothing`;
  }

  for (const registro of conductoresDemo) {
    const personaId = await asegurarPersona(tx, { ...registro, tipo: "NATURAL", codigoDoc: "01" });
    await tx`insert into conductores (persona_id, numero_licencia, telefono)
      values (${personaId}, ${registro.licencia}, ${registro.telefono}) on conflict (persona_id) do nothing`;
  }

  const detallesDemo = (descripcion, cantidad, precio) => [{ tipo: "SERVICIO", descripcion, nombreVisible: descripcion, cantidad: String(cantidad), precioUnitario: String(precio), descuento: "0.00", afectacionIgv: "GRAVADO" }];
  const ordenesDemo = [
    ["DEMO-OS-001", 0, "ABC-101", "Mantenimiento preventivo de unidad", "ABIERTA", 8, 2, 180],
    ["DEMO-OS-002", 1, "DEMO-VEH-02", "Diagnóstico de sistema eléctrico", "EN_PROCESO", 5, 1, 240],
    ["DEMO-OS-003", 2, "DEF-303", "Revisión de transmisión y frenos", "ESPERANDO_REPUESTOS", 3, 1, 320],
    ["DEMO-OS-004", 3, "DEMO-VEH-04", "Inspección general de mototaxi", "COMPLETADA", 12, 4, 150],
  ];
  for (let i = 5; i <= 12; i += 1) ordenesDemo.push([`DEMO-OS-${String(i).padStart(3, "0")}`, (i - 1) % clientesDemo.length, `DEMO-VEH-${String(i).padStart(2, "0")}`, `Servicio de muestra ${String(i).padStart(2, "0")}`, ["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"][i % 4], i, 1, 160 + i * 25]);
  for (const [codigo, clienteIndice, placa, motivo, estado, dias, diasAcabado, precio] of ordenesDemo) {
    if (await asegurarCodigo(tx, "ordenes_servicio", codigo)) continue;
    await tx`insert into ordenes_servicio (codigo, cliente_id, vehiculo_placa, motivo, detalles, estado, fecha_recepcion, fecha_acabado, clave_emision, usuario_id)
      values (${codigo}, ${personasCliente[clienteIndice]}, ${placa}, ${`DEMO FRONTEND · ${motivo}`}, ${tx.json(detallesDemo(motivo, 1, precio))}, ${estado}, ${fechaDemo(dias)}, ${fechaDemo(Math.max(0, dias - diasAcabado))}, ${randomUUID()}, ${usuarioDemo.id})`;
  }

  const cotizacionesDemo = [
    ["DEMO-COT-001", 0, "Propuesta de mantenimiento preventivo", "BORRADOR", 8, 10, 410],
    ["DEMO-COT-002", 1, "Servicio de diagnóstico eléctrico", "ENVIADA", 6, 15, 620],
    ["DEMO-COT-003", 2, "Repuestos y mano de obra", "ACEPTADA", 4, 14, 890],
    ["DEMO-COT-004", 3, "Revisión integral de unidad", "RECHAZADA", 2, 12, 530],
  ];
  for (let i = 5; i <= 12; i += 1) cotizacionesDemo.push([`DEMO-COT-${String(i).padStart(3, "0")}`, (i - 1) % clientesDemo.length, `Propuesta de muestra ${String(i).padStart(2, "0")}`, ["BORRADOR", "ENVIADA", "ACEPTADA", "RECHAZADA"][i % 4], i, 14, 300 + i * 45]);
  for (const [codigo, clienteIndice, descripcion, estado, dias, vigencia, precio] of cotizacionesDemo) {
    if (await asegurarCodigo(tx, "cotizaciones", codigo)) continue;
    await tx`insert into cotizaciones (codigo, cliente_id, detalles, observacion, estado, fecha, vigente_hasta, clave_emision, usuario_id)
      values (${codigo}, ${personasCliente[clienteIndice]}, ${tx.json(detallesDemo(descripcion, 1, precio))}, 'DEMO FRONTEND: propuesta ficticia local', ${estado}, ${fechaDemo(dias)}, ${fechaDemo(Math.max(0, dias - vigencia))}, ${randomUUID()}, ${usuarioDemo.id})`;
  }

  const idModelo = (await tx`select id from modelos_mototaxis where activo = true order by creado_en asc limit 1`)[0]?.id;
  if (idModelo) {
    const codigoCompra = "DEMO-FE-CM-001";
    let idCompra = await asegurarCodigo(tx, "compras_mototaxis", codigoCompra);
    if (!idCompra) {
      const [compraCreada] = await tx`insert into compras_mototaxis (codigo, proveedor_persona_id, fecha, documento_tipo, documento_numero, total, observacion, usuario_id)
        values (${codigoCompra}, ${personasProveedor[0]}, ${fechaDemo(7)}, 'OTRO', 'DEMO-FE-DOC-001', 19600, 'DEMO FRONTEND: compra ficticia, no corresponde a una operación real', ${usuarioDemo.id}) returning id`;
      idCompra = compraCreada.id;
      const [detalle] = await tx`insert into compras_mototaxis_detalle (compra_id, modelo_id, orden, cantidad, costo_unitario)
        values (${idCompra}, ${idModelo}, 1, 2, 9800) returning id`;
      for (let indice = 1; indice <= 2; indice += 1) {
        const codigoUnidad = `DEMO-FE-UNI-00${indice}`;
        let unidadId = await asegurarCodigo(tx, "unidades_mototaxis", codigoUnidad);
        if (!unidadId) {
          const [unidadCreada] = await tx`insert into unidades_mototaxis (codigo, compra_detalle_id, modelo_id, vin, numero_motor, numero_chasis, anio_modelo, color, costo_adquisicion)
            values (${codigoUnidad}, ${detalle.id}, ${idModelo}, ${`DEMOFE2026000000${indice}`}, ${`DEMO-FE-MOTOR-00${indice}`}, ${`DEMO-FE-CHASIS-00${indice}`}, 2026, ${indice === 1 ? "Azul" : "Rojo"}, 9800) returning id`;
          unidadId = unidadCreada.id;
        }
        const [movimiento] = await tx`select id from movimientos_mototaxis where unidad_id = ${unidadId} and observacion = ${`DEMO FRONTEND seed: recepción de ${codigoUnidad}`}`;
        if (!movimiento) await tx`insert into movimientos_mototaxis (unidad_id, tipo, estado_nuevo, motivo, observacion, usuario_id)
          values (${unidadId}, 'RECEPCION', 'DISPONIBLE', 'COMPRA', ${`DEMO FRONTEND seed: recepción de ${codigoUnidad}`}, ${usuarioDemo.id})`;
        const [garantia] = await tx`select id from garantias_mototaxis where unidad_id = ${unidadId}`;
        if (!garantia) await tx`insert into garantias_mototaxis (unidad_id, proveedor_persona_id, porcentaje_proveedor, meses_vigencia, inicia_en, termina_en, alcance, exclusiones)
          values (${unidadId}, ${personasProveedor[0]}, 80, 12, ${fechaDemo(7)}, ${fechaDemo(-358)}, 'DEMO FRONTEND: cobertura ficticia de motor y transmisión', 'DEMO FRONTEND: exclusiones de muestra')`;
      }
      const [pago] = await tx`select id from pagos_compras_mototaxis where compra_id = ${idCompra}`;
      if (!pago) await tx`insert into pagos_compras_mototaxis (compra_id, fecha_pago, importe_pagado, medio_pago, clave_idempotencia, usuario_id)
        values (${idCompra}, ${fechaDemo(7)}, 19600, 'TRANSFERENCIA', ${randomUUID()}, ${usuarioDemo.id})`;
    }
  }

  // Amplía compras/unidades con detalle, pago, recepción y garantía coherentes.
  if (idModelo) for (let i = 2; i <= 10; i += 1) {
    const n = String(i).padStart(3, "0");
    const codigoCompra = `DEMO-FE-CM-${n}`;
    let [compra] = await tx`select id from compras_mototaxis where codigo = ${codigoCompra}`;
    if (!compra) [compra] = await tx`insert into compras_mototaxis (codigo, proveedor_persona_id, fecha, documento_tipo, documento_numero, total, observacion, usuario_id)
      values (${codigoCompra}, ${personasProveedor[(i - 1) % personasProveedor.length]}, ${fechaDemo(i)}, 'OTRO', ${`DEMO-FE-DOC-${n}`}, 9800, 'DEMO FRONTEND: compra ficticia local', ${usuarioDemo.id}) returning id`;
    let [detalle] = await tx`select id from compras_mototaxis_detalle where compra_id = ${compra.id} order by orden limit 1`;
    if (!detalle) [detalle] = await tx`insert into compras_mototaxis_detalle (compra_id, modelo_id, orden, cantidad, costo_unitario) values (${compra.id}, ${idModelo}, 1, 1, 9800) returning id`;
    let codigoUnidad = `DEMO-FE-UNI-${n}`;
    let [unidad] = await tx`select id from unidades_mototaxis where codigo = ${codigoUnidad}`;
    if (unidad) {
      const [origenUnidad] = await tx`select compra_detalle_id from unidades_mototaxis where id=${unidad.id}`;
      if (origenUnidad.compra_detalle_id !== detalle.id) {
        codigoUnidad = `DEMO-FE-UNI-ALT-${n}`;
        [unidad] = await tx`select id from unidades_mototaxis where codigo = ${codigoUnidad}`;
      }
    }
    if (!unidad) [unidad] = await tx`insert into unidades_mototaxis (codigo, compra_detalle_id, modelo_id, vin, numero_motor, numero_chasis, anio_modelo, color, costo_adquisicion)
      values (${codigoUnidad}, ${detalle.id}, ${idModelo}, ${`DEMOFE2026${String(i + (codigoUnidad.includes("ALT") ? 100 : 0)).padStart(8, "0")}`}, ${`DEMO-FE-MOTOR-${codigoUnidad.includes("ALT") ? "ALT-" : ""}${n}`}, ${`DEMO-FE-CHASIS-${codigoUnidad.includes("ALT") ? "ALT-" : ""}${n}`}, 2026, ${["Azul", "Rojo", "Negro", "Blanco"][i % 4]}, 9800) returning id`;
    const obsMovimiento = `DEMO FRONTEND seed: recepcion de ${codigoUnidad}`;
    const [movimiento] = await tx`select id from movimientos_mototaxis where unidad_id = ${unidad.id} and observacion = ${obsMovimiento}`;
    if (!movimiento) await tx`insert into movimientos_mototaxis (unidad_id, tipo, estado_nuevo, motivo, observacion, usuario_id) values (${unidad.id}, 'RECEPCION', 'DISPONIBLE', 'COMPRA', ${obsMovimiento}, ${usuarioDemo.id})`;
    const [garantia] = await tx`select id from garantias_mototaxis where unidad_id = ${unidad.id}`;
    if (!garantia) await tx`insert into garantias_mototaxis (unidad_id, proveedor_persona_id, porcentaje_proveedor, meses_vigencia, inicia_en, termina_en, alcance, exclusiones)
      values (${unidad.id}, ${personasProveedor[(i - 1) % personasProveedor.length]}, 80, 12, ${fechaDemo(i)}, ${fechaDemo(i - 365)}, 'DEMO FRONTEND: cobertura ficticia de muestra', 'DEMO FRONTEND: exclusiones de muestra')`;
    const [pago] = await tx`select id from pagos_compras_mototaxis where compra_id = ${compra.id}`;
    if (!pago) await tx`insert into pagos_compras_mototaxis (compra_id, fecha_pago, importe_pagado, medio_pago, clave_idempotencia, usuario_id) values (${compra.id}, ${fechaDemo(i)}, 9800, 'TRANSFERENCIA', ${randomUUID()}, ${usuarioDemo.id})`;
  }

  // Amplía el catálogo del inventario y mantiene unidades disponibles en varios modelos.
  // En una base recién migrada aún no hay modelos: se omite la ampliación en vez de consultar con un id indefinido.
  const [marcaMotoDemo] = idModelo ? await tx`select marca_id from modelos_mototaxis where id=${idModelo}` : [];
  const modelosMotoDemo = [idModelo];
  if (marcaMotoDemo) for (let i = 2; i <= 12; i += 1) {
    const n = String(i).padStart(3, "0");
    const codigo = `DEMO-FE-MOD-${n}`;
    let [modelo] = await tx`select id from modelos_mototaxis where codigo=${codigo}`;
    if (!modelo) [modelo] = await tx`insert into modelos_mototaxis (codigo, marca_id, nombre, version, precio_venta, categoria_vehicular, fabricante, pais_fabricacion, marca_motor, modelo_motor, tipo_mototaxi, tipo_motor, tipo_refrigeracion, colores_disponibles, cilindrada_cc, combustible, transmision, carroceria, capacidad_asientos, capacidad_carga_kg, especificaciones_adicionales, activo)
      values (${codigo}, ${marcaMotoDemo.marca_id}, ${`DEMO FRONTEND Modelo utilitario ${n}`}, 'Edicion local', 14500, 'L5', 'Fabricante ficticio', 'Peru', 'DEMO MOTOR', ${`DM-${n}`}, 'PASAJERO', '4_TIEMPOS', 'AIRE', ARRAY['Azul','Rojo','Negro'], 200, 'GASOLINA', 'MANUAL', 'METALICA', 3, 500, 'Ficha ficticia para visualizar el catalogo local.', true) returning id`;
    modelosMotoDemo.push(modelo.id);
  }
  const codigoCompraFlota = "DEMO-FE-CM-011";
  let [compraFlota] = await tx`select id from compras_mototaxis where codigo=${codigoCompraFlota}`;
  if (!compraFlota && modelosMotoDemo.length >= 12) [compraFlota] = await tx`insert into compras_mototaxis (codigo, proveedor_persona_id, fecha, documento_tipo, documento_numero, total, observacion, usuario_id)
    values (${codigoCompraFlota}, ${personasProveedor[0]}, ${fechaDemo(3)}, 'OTRO', 'DEMO-FE-DOC-011', 117600, 'DEMO FRONTEND: flota ficticia local para inventario y ventas de interfaz', ${usuarioDemo.id}) returning id`;
  if (compraFlota) {
    for (let i = 0; i < 12; i += 1) {
      const n = String(i + 1).padStart(3, "0");
      const [detalle] = await tx`select id from compras_mototaxis_detalle where compra_id=${compraFlota.id} and orden=${i + 1}`;
      let detalleCompra = detalle;
      if (!detalleCompra) [detalleCompra] = await tx`insert into compras_mototaxis_detalle (compra_id, modelo_id, orden, cantidad, costo_unitario) values (${compraFlota.id}, ${modelosMotoDemo[i]}, ${i + 1}, 1, 9800) returning id`;
      const codigoUnidad = `DEMO-FE-UNI-VTA-${n}`;
      let [unidad] = await tx`select id from unidades_mototaxis where codigo=${codigoUnidad}`;
      if (!unidad) [unidad] = await tx`insert into unidades_mototaxis (codigo, compra_detalle_id, modelo_id, vin, numero_motor, numero_chasis, anio_modelo, color, costo_adquisicion)
        values (${codigoUnidad}, ${detalleCompra.id}, ${modelosMotoDemo[i]}, ${`DEMOFEVTA2026${n}`}, ${`DEMO-FE-VTA-MOTOR-${n}`}, ${`DEMO-FE-VTA-CHASIS-${n}`}, 2026, ${["Azul", "Rojo", "Negro", "Blanco"][i % 4]}, 9800) returning id`;
      const observacion = `DEMO FRONTEND seed: ingreso flota ${codigoUnidad}`;
      const [movimiento] = await tx`select id from movimientos_mototaxis where unidad_id=${unidad.id} and observacion=${observacion}`;
      if (!movimiento) await tx`insert into movimientos_mototaxis (unidad_id, tipo, estado_nuevo, motivo, observacion, usuario_id) values (${unidad.id}, 'RECEPCION', 'DISPONIBLE', 'COMPRA', ${observacion}, ${usuarioDemo.id})`;
      const [garantia] = await tx`select id from garantias_mototaxis where unidad_id=${unidad.id}`;
      if (!garantia) await tx`insert into garantias_mototaxis (unidad_id, proveedor_persona_id, porcentaje_proveedor, meses_vigencia, inicia_en, termina_en, alcance, exclusiones)
        values (${unidad.id}, ${personasProveedor[0]}, 80, 12, ${fechaDemo(3)}, ${fechaDemo(-362)}, 'DEMO FRONTEND: cobertura de flota ficticia', 'DEMO FRONTEND: exclusiones de muestra')`;
    }
    const [pagoFlota] = await tx`select id from pagos_compras_mototaxis where compra_id=${compraFlota.id}`;
    if (!pagoFlota) await tx`insert into pagos_compras_mototaxis (compra_id, fecha_pago, importe_pagado, medio_pago, clave_idempotencia, usuario_id) values (${compraFlota.id}, ${fechaDemo(3)}, 117600, 'TRANSFERENCIA', ${randomUUID()}, ${usuarioDemo.id})`;
  }

  const [idModeloDemo] = await tx`select id from modelos_mototaxis where activo = true order by creado_en asc limit 1`;
  if (idModeloDemo) for (let i = 1; i <= 12; i += 1) {
    const codigo = `DEMO-FE-AJ-${String(i).padStart(3, "0")}`;
    if (!(await asegurarCodigo(tx, "ajustes_inventario_mototaxis", codigo))) await tx`insert into ajustes_inventario_mototaxis (codigo, modelo_id, cantidad_sistema, cantidad_contada, motivo, observacion, usuario_id)
      values (${codigo}, ${idModeloDemo.id}, ${10 + i}, ${10 + i}, 'Conteo de muestra', 'DEMO FRONTEND: conteo local sin diferencia', ${usuarioDemo.id})`;
  }
  if (idModeloDemo && !(await asegurarCodigo(tx, "ajustes_inventario_mototaxis", "DEMO-FE-AJ-001"))) {
    await tx`insert into ajustes_inventario_mototaxis (codigo, modelo_id, cantidad_sistema, cantidad_contada, motivo, observacion, usuario_id)
      values ('DEMO-FE-AJ-001', ${idModeloDemo.id}, 2, 2, 'Revisión de muestra', 'DEMO FRONTEND: conteo de muestra sin diferencia', ${ (await tx`select id from usuarios order by creado_en asc limit 1`)[0].id })`;
  }

  const [garantiaDemo] = await tx`select id, unidad_id from garantias_mototaxis where alcance like 'DEMO FRONTEND:%' order by inicia_en limit 1`;
  const [reclamoDemo] = await tx`select id from reclamos_garantia_mototaxis where descripcion_falla like 'DEMO FRONTEND:%' limit 1`;
  if (garantiaDemo && !reclamoDemo) await tx`insert into reclamos_garantia_mototaxis (garantia_id, fecha, descripcion_falla, costo_total, porcentaje_proveedor_aplicado, importe_proveedor, importe_empresa, estado, usuario_id)
    values (${garantiaDemo.id}, ${fechaDemo(2)}, 'DEMO FRONTEND: simulación visual de una falla menor', 500, 80, 400, 100, 'ABIERTO', (select id from usuarios order by creado_en asc limit 1))`;
  const garantiasDemo = await tx`select id from garantias_mototaxis where alcance like 'DEMO FRONTEND:%' order by inicia_en limit 12`;
  const estadosReclamo = ["ABIERTO", "ENVIADO", "APROBADO", "RECHAZADO", "RESUELTO"];
  for (let i = 1; i < garantiasDemo.length && i < 12; i += 1) {
    const descripcion = `DEMO FRONTEND: reclamo de muestra ${String(i + 1).padStart(2, "0")}`;
    const [existente] = await tx`select id from reclamos_garantia_mototaxis where descripcion_falla = ${descripcion}`;
    if (!existente) await tx`insert into reclamos_garantia_mototaxis (garantia_id, fecha, descripcion_falla, costo_total, porcentaje_proveedor_aplicado, importe_proveedor, importe_empresa, estado, usuario_id)
      values (${garantiasDemo[i].id}, ${fechaDemo(i + 1)}, ${descripcion}, 500, 80, 400, 100, ${estadosReclamo[i % estadosReclamo.length]}, ${usuarioDemo.id})`;
  }

  const guiasDemo = [
    ["TDEM", 990001],
    ["TDEM", 990002],
    ...Array.from({ length: 10 }, (_, indice) => ["TDEM", 990003 + indice]),
  ];
  for (const [serie, numero] of guiasDemo) {
    const [guia] = await tx`select id from guias_remision where tipo = 'REMITENTE' and serie = ${serie} and numero = ${numero}`;
    if (!guia) await tx`insert into guias_remision (tipo, fecha, serie, numero, estado, datos_nubefact, usuario_id)
      values ('REMITENTE', ${fechaDemo(numero === 990001 ? 6 : 1)}, ${serie}, ${numero}, 'NUBEFACT_PENDIENTE', ${tx.json({ demoFrontend: true, respuesta: { sunat_description: "DEMO FRONTEND: registro local sin envío a NubeFact" } })}, (select id from usuarios order by creado_en asc limit 1))`;
  }

  // Amplía el catálogo de repuestos y crea una presentación, precio y stock por producto.
  const [catalogoDemo] = await tx`select c.id as categoria_id, m.id as marca_id, l.id as lista_id
    from categorias_productos c cross join marcas_productos m cross join tipos_listas_precio l
    where c.activo=true and m.activo=true and m.uso in ('REPUESTOS','AMBOS') and l.codigo='GENERAL' and l.activo=true
    order by c.creado_en, m.creado_en limit 1`;
  const [unidadDemo] = await tx`select codigo from unidades_medida where codigo='NIU' and activo=true`;
  if (catalogoDemo && unidadDemo) for (let i = 1; i <= 10; i += 1) {
    const n = String(i).padStart(3, "0");
    const codigo = `DEMO-FE-REP-${n}`;
    let [producto] = await tx`select id, codigo_interno, nombre from productos where codigo_interno=${codigo}`;
    if (!producto) [producto] = await tx`insert into productos (codigo_interno, nombre, descripcion, categoria_id, marca_id, unidad_base_codigo, stock_minimo, afectacion_igv, afecto_igv, ficha_tecnica, activo)
      values (${codigo}, ${`DEMO FRONTEND Repuesto de muestra ${n}`}, 'Producto ficticio local para explorar inventario y filtros.', ${catalogoDemo.categoria_id}, ${catalogoDemo.marca_id}, ${unidadDemo.codigo}, 1, 'GRAVADO', true, ${tx.json({ demoFrontend: true })}, true) returning id, codigo_interno, nombre`;
    let [presentacion] = await tx`select id from productos_presentaciones where producto_id=${producto.id} and es_base=true`;
    if (!presentacion) [presentacion] = await tx`insert into productos_presentaciones (producto_id, unidad_medida_codigo, nombre, factor_a_unidad_base, se_compra, se_vende, es_base, activo)
      values (${producto.id}, ${unidadDemo.codigo}, 'Unidad', 1, true, true, true, true) returning id`;
    const [precio] = await tx`select id from precios_productos where producto_id=${producto.id} and presentacion_id=${presentacion.id} and tipo_lista_precio_id=${catalogoDemo.lista_id}`;
    if (!precio) await tx`insert into precios_productos (producto_id, presentacion_id, tipo_lista_precio_id, precio, cantidad_minima, activo)
      values (${producto.id}, ${presentacion.id}, ${catalogoDemo.lista_id}, ${35 + i * 4}, 1, true)`;
    const codigoEntrada = `DEMO-FE-REPIN-${n}`;
    let [entrada] = await tx`select id from entradas_stock where codigo=${codigoEntrada}`;
    if (!entrada) {
      const cantidad = 3;
      const costo = 20 + i;
      const total = cantidad * costo;
      [entrada] = await tx`insert into entradas_stock (codigo, fecha, tipo_documento, numero_documento, proveedor, proveedor_tipo_persona, proveedor_tipo_documento, proveedor_numero_documento, proveedor_direccion, observacion, total_documento, total, usuario_id)
        values (${codigoEntrada}, ${fechaDemo(i)}, 'OTRO', ${`DEMO-FE-REP-DOC-${n}`}, 'DEMO FRONTEND Proveedor de repuestos', 'JURIDICA', 'EXT', ${`DEMO-FE-PROV-${n}`}, 'Dirección ficticia de proveedor', 'DEMO FRONTEND: stock inicial ficticio de repuesto', ${total}, ${total}, ${usuarioDemo.id}) returning id`;
      const [docDetalle] = await tx`insert into entradas_stock_documento_detalle (entrada_id, orden, codigo, descripcion, unidad, cantidad, costo_unitario, descuento, subtotal, total)
        values (${entrada.id}, 1, ${codigo}, ${producto.nombre}, 'Unidad', ${cantidad}, ${costo}, 0, ${total}, ${total}) returning id`;
      const [detalle] = await tx`insert into entradas_stock_detalle (entrada_id, detalle_documento_id, producto_id, presentacion_id, codigo_producto, nombre_producto, presentacion, unidad_medida_codigo, cantidad, factor_a_unidad_base, cantidad_base, costo_unitario, subtotal)
        values (${entrada.id}, ${docDetalle.id}, ${producto.id}, ${presentacion.id}, ${codigo}, ${producto.nombre}, 'Unidad', ${unidadDemo.codigo}, ${cantidad}, 1, ${cantidad}, ${costo}, ${total}) returning id`;
      await tx`insert into saldos_stock (producto_id, cantidad) values (${producto.id}, ${cantidad}) on conflict (producto_id) do update set cantidad=saldos_stock.cantidad+excluded.cantidad, actualizado_en=now()`;
      await tx`insert into movimientos_stock (producto_id, tipo, origen_tipo, origen_id, origen_detalle_id, cantidad_base, costo_unitario_base, observacion, usuario_id)
        values (${producto.id}, 'ENTRADA', 'ENTRADA_STOCK', ${entrada.id}, ${detalle.id}, ${cantidad}, ${costo}, 'DEMO FRONTEND: stock inicial de muestra', ${usuarioDemo.id})`;
    }
  }

  // Ocho entradas compartidas para ampliar el historial del kardex.
  const [productoDemo] = await tx`select p.id, p.codigo_interno, p.nombre, pp.id as presentacion_id, pp.nombre as presentacion,
      pp.unidad_medida_codigo, pp.factor_a_unidad_base
    from productos p join productos_presentaciones pp on pp.producto_id=p.id
    where p.activo=true and pp.activo=true and pp.se_compra=true order by p.creado_en, pp.creado_en limit 1`;
  if (productoDemo) for (let i = 3; i <= 10; i += 1) {
    const n = String(i).padStart(3, "0");
    const codigo = `DEMO-FE-ENT-${n}`;
    let [entrada] = await tx`select id from entradas_stock where codigo=${codigo}`;
    if (entrada) continue;
    const cantidad = 2;
    const costo = 25 + i;
    const total = cantidad * costo;
    const factor = Number(productoDemo.factor_a_unidad_base);
    const cantidadBase = cantidad * factor;
    [entrada] = await tx`insert into entradas_stock (codigo, fecha, tipo_documento, numero_documento, proveedor, proveedor_tipo_persona, proveedor_tipo_documento, proveedor_numero_documento, proveedor_direccion, observacion, total_documento, total, usuario_id)
      values (${codigo}, ${fechaDemo(i)}, 'OTRO', ${`DEMO-FE-DOC-${n}`}, ${`DEMO FRONTEND Proveedor ${n}`}, 'JURIDICA', 'RUC', ${`20609998${String(i).padStart(3, "0")}`}, 'Dirección ficticia de proveedor', 'DEMO FRONTEND: entrada local de muestra', ${total}, ${total}, ${usuarioDemo.id}) returning id`;
    const [detalleDoc] = await tx`insert into entradas_stock_documento_detalle (entrada_id, orden, codigo, descripcion, unidad, cantidad, costo_unitario, descuento, subtotal, total)
      values (${entrada.id}, 1, ${productoDemo.codigo_interno}, ${productoDemo.nombre}, ${productoDemo.presentacion}, ${cantidad}, ${costo}, 0, ${total}, ${total}) returning id`;
    const [detalle] = await tx`insert into entradas_stock_detalle (entrada_id, detalle_documento_id, producto_id, presentacion_id, codigo_producto, nombre_producto, presentacion, unidad_medida_codigo, cantidad, factor_a_unidad_base, cantidad_base, costo_unitario, subtotal)
      values (${entrada.id}, ${detalleDoc.id}, ${productoDemo.id}, ${productoDemo.presentacion_id}, ${productoDemo.codigo_interno}, ${productoDemo.nombre}, ${productoDemo.presentacion}, ${productoDemo.unidad_medida_codigo}, ${cantidad}, ${factor}, ${cantidadBase}, ${costo}, ${total}) returning id`;
    await tx`insert into saldos_stock (producto_id, cantidad) values (${productoDemo.id}, ${cantidadBase}) on conflict (producto_id) do update set cantidad=saldos_stock.cantidad+excluded.cantidad, actualizado_en=now()`;
    await tx`insert into movimientos_stock (producto_id, tipo, origen_tipo, origen_id, origen_detalle_id, cantidad_base, costo_unitario_base, observacion, usuario_id)
      values (${productoDemo.id}, 'ENTRADA', 'ENTRADA_STOCK', ${entrada.id}, ${detalle.id}, ${cantidadBase}, ${Number((costo / factor).toFixed(6))}, 'DEMO FRONTEND: kardex de muestra', ${usuarioDemo.id})`;
  }

  // Ventas de servicio internas (NOTA_VENTA); no son comprobantes electrónicos.
  for (let i = 1; i <= 6; i += 1) {
    const codigo = `DEMO-FE-VTA-${String(i).padStart(3, "0")}`;
    const [existente] = await tx`select id from ingresos where codigo=${codigo}`;
    if (existente) continue;
    const clienteId = personasCliente[(i - 1) % personasCliente.length];
    const [personaCliente] = await tx`select p.nombres, p.apellido_paterno, p.apellido_materno, p.razon_social, p.numero_documento, td.codigo as documento_codigo
      from personas p join tipos_documento td on td.id=p.tipo_documento_id where p.id=${clienteId}`;
    const nombre = personaCliente.razon_social ?? [personaCliente.nombres, personaCliente.apellido_paterno, personaCliente.apellido_materno].filter(Boolean).join(" ");
    const [venta] = await tx`insert into ingresos (codigo, fecha, tipo_comprobante, cliente_tipo_documento, cliente_numero_documento, cliente_nombre, cliente_direccion, cliente_id, medio_pago, condicion_pago, cuotas_pago, importe_pago_inicial, observacion, datos_nubefact, subtotal, tasa_igv, igv, total, estado, usuario_id)
      values (${codigo}, ${fechaDemo(i)}, 'NOTA_VENTA', ${personaCliente.documento_codigo}, ${personaCliente.numero_documento}, ${nombre}, 'Dirección ficticia demo', ${clienteId}, 'EFECTIVO', 'CONTADO', '[]'::jsonb, 0, 'DEMO FRONTEND: venta interna de servicio para pruebas de interfaz; sin emisión externa', ${tx.json({ demoFrontend: true })}, 100, 18, 18, 118, 'REGISTRADO', ${usuarioDemo.id}) returning id`;
    await tx`insert into ingresos_detalle (ingreso_id, tipo, descripcion, cantidad, precio_unitario, descuento, afectacion_igv, afecto_igv, subtotal, igv, total)
      values (${venta.id}, 'SERVICIO', ${`DEMO FRONTEND: servicio de muestra ${String(i).padStart(2, "0")}`}, 1, 100, 0, 'GRAVADO', true, 100, 18, 118)`;
    await tx`insert into ingresos_pagos (ingreso_id, fecha_pago, importe_aplicado, es_pago_inicial, importe_recibido, medio_pago, referencia_pago, observacion, usuario_id, clave_idempotencia)
      values (${venta.id}, ${fechaDemo(i)}, 118, false, 118, 'EFECTIVO', ${codigo}, 'DEMO FRONTEND: pago ficticio local', ${usuarioDemo.id}, ${randomUUID()})`;
  }

  // Diez ventas internas de unidades disponibles para poblar el filtro MOTOTAXIS.
  for (let i = 1; i <= 10; i += 1) {
    const n = String(i).padStart(3, "0");
    const codigo = `DEMO-FE-VMT-${n}`;
    const [existente] = await tx`select id from ingresos where codigo=${codigo}`;
    if (existente) continue;
    const codigoUnidad = `DEMO-FE-UNI-VTA-${n}`;
    const [unidad] = await tx`select u.id, u.codigo, u.vin, u.estado, u.numero_motor, u.numero_chasis, m.nombre as modelo, m.version, b.nombre as marca
      from unidades_mototaxis u join modelos_mototaxis m on m.id=u.modelo_id join marcas_productos b on b.id=m.marca_id where u.codigo=${codigoUnidad}`;
    if (!unidad || unidad.estado !== "DISPONIBLE") continue;
    const clienteId = personasCliente[(i - 1) % personasCliente.length];
    const [cliente] = await tx`select p.nombres, p.apellido_paterno, p.apellido_materno, p.razon_social, p.numero_documento,
      case td.codigo when '01' then 'DNI' when '06' then 'RUC' when '04' then 'CE' when '07' then 'PASAPORTE' else td.codigo end as documento
      from personas p join tipos_documento td on td.id=p.tipo_documento_id where p.id=${clienteId}`;
    const nombreCliente = cliente.razon_social ?? [cliente.nombres, cliente.apellido_paterno, cliente.apellido_materno].filter(Boolean).join(" ");
    const precio = 14500;
    const idempotencia = randomUUID();
    const [venta] = await tx`insert into ingresos (codigo, fecha, tipo_comprobante, cliente_tipo_documento, cliente_numero_documento, cliente_nombre, cliente_direccion, cliente_id, medio_pago, condicion_pago, cuotas_pago, importe_pago_inicial, observacion, datos_nubefact, clave_idempotencia, subtotal, tasa_igv, igv, total, estado, usuario_id)
      values (${codigo}, ${fechaDemo(i)}, 'NOTA_VENTA', ${cliente.documento}, ${cliente.numero_documento}, ${nombreCliente}, 'Direccion ficticia demo', ${clienteId}, 'TRANSFERENCIA', 'CONTADO', '[]'::jsonb, 0, 'DEMO FRONTEND: venta interna de mototaxi ficticia; no emitida a proveedor externo', ${tx.json({ demoFrontend: true })}, ${idempotencia}, ${precio}, 18, 0, ${precio}, 'REGISTRADO', ${usuarioDemo.id}) returning id`;
    const descripcion = `${unidad.marca} ${unidad.modelo}${unidad.version ? ` ${unidad.version}` : ""} - ${unidad.codigo}`;
    const [detalle] = await tx`insert into ingresos_detalle (ingreso_id, tipo, mototaxi_unidad_id, codigo_producto, descripcion, presentacion, cantidad, precio_unitario, descuento, afectacion_igv, afecto_igv, subtotal, igv, total)
      values (${venta.id}, 'MOTOTAXI', ${unidad.id}, ${unidad.codigo}, ${descripcion}, ${unidad.vin ? `VIN ${unidad.vin}` : null}, 1, ${precio}, 0, 'GRAVADO', true, ${precio}, 0, ${precio}) returning id`;
    await tx`insert into ingresos_pagos (ingreso_id, fecha_pago, importe_aplicado, es_pago_inicial, importe_recibido, medio_pago, referencia_pago, observacion, usuario_id, clave_idempotencia)
      values (${venta.id}, ${fechaDemo(i)}, ${precio}, false, ${precio}, 'TRANSFERENCIA', ${codigo}, 'DEMO FRONTEND: pago ficticio local', ${usuarioDemo.id}, ${randomUUID()})`;
    await tx`update unidades_mototaxis set estado='VENDIDA' where id=${unidad.id} and estado='DISPONIBLE'`;
    const [movimiento] = await tx`insert into movimientos_mototaxis (unidad_id, tipo, estado_anterior, estado_nuevo, motivo, observacion, usuario_id)
      values (${unidad.id}, 'VENTA', 'DISPONIBLE', 'VENDIDA', 'VENTA', ${`Venta ${codigo}`}, ${usuarioDemo.id}) returning id`;
    await tx`insert into movimientos_mototaxis_ventas (movimiento_id, venta_detalle_id) values (${movimiento.id}, ${detalle.id})`;
  }

  // Gastos operativos locales con su pago enlazado para mostrar estado y saldo.
  for (let i = 1; i <= 8; i += 1) {
    const codigo = `DEMO-FE-EGR-${String(i).padStart(3, "0")}`;
    const [existente] = await tx`select id from egresos_registros where codigo=${codigo}`;
    if (existente) continue;
    const monto = 40 + i * 5;
    const [egreso] = await tx`insert into egresos_registros (codigo, tipo, fecha, categoria, concepto, beneficiario, moneda, medio_pago, monto, observacion, usuario_id)
      values (${codigo}, 'GASTO_OPERATIVO', ${fechaDemo(i)}, 'Servicios de muestra', ${`DEMO FRONTEND: gasto operativo ${String(i).padStart(2, "0")}`}, ${`DEMO FRONTEND Beneficiario ${String(i).padStart(2, "0")}`}, 'PEN', 'EFECTIVO', ${monto}, 'DEMO FRONTEND: gasto ficticio local para pruebas', ${usuarioDemo.id}) returning id`;
    await tx`insert into egresos_pagos (egreso_id, fecha_pago, importe_pagado, medio_pago, clave_idempotencia, usuario_id)
      values (${egreso.id}, ${fechaDemo(i)}, ${monto}, 'EFECTIVO', ${randomUUID()}, ${usuarioDemo.id})`;
  }

  const conteos = await tx`
    select
      (select count(*)::int from clientes where observacion like 'DEMO FRONTEND:%') as clientes,
      (select count(*)::int from proveedores where observacion like 'DEMO FRONTEND:%') as proveedores,
      (select count(*)::int from conductores c join personas p on p.id=c.persona_id where p.nombres like 'DEMO FRONTEND%') as conductores,
      (select count(*)::int from transportistas t join personas p on p.id=t.persona_id where p.razon_social like 'DEMO FRONTEND%') as transportistas,
      (select count(*)::int from ordenes_servicio where codigo like 'DEMO-OS-%') as ordenes,
      (select count(*)::int from cotizaciones where codigo like 'DEMO-COT-%') as cotizaciones,
      (select count(*)::int from compras_mototaxis where codigo like 'DEMO-FE-%') as comprasMototaxis,
      (select count(*)::int from unidades_mototaxis where codigo like 'DEMO-FE-UNI-%') as unidadesMototaxis,
      (select count(*)::int from garantias_mototaxis where alcance like 'DEMO FRONTEND:%') as garantias,
      (select count(*)::int from reclamos_garantia_mototaxis where descripcion_falla like 'DEMO FRONTEND:%') as reclamos,
      (select count(*)::int from guias_remision where datos_nubefact->>'demoFrontend' = 'true') as guias,
      (select count(*)::int from ingresos where codigo like 'DEMO-FE-VTA-%') as ventas,
      (select count(*)::int from entradas_stock where codigo like 'DEMO-FE-ENT-%') as entradasStock,
      (select count(*)::int from egresos_registros where codigo like 'DEMO-FE-EGR-%') as egresos`;
  return conteos[0];
});

await sql.end();
console.log(`Datos locales de frontend listos: ${JSON.stringify(resumen)}`);
