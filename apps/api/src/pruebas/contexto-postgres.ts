/**
 * Utilidades compartidas por las pruebas de integración con PostgreSQL.
 * Solo se importan desde archivos `*.integration.spec.ts`; nunca desde código productivo.
 */
import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import * as argon2 from "argon2";
import * as baseDatos from "@magina/database";

type PaqueteBaseDatos = typeof baseDatos;

/** Rechaza cualquier base que no sea la instancia local desechable `magina_test` con credenciales ficticias. */
export function validarBaseDePruebas() {
  assert.equal(process.env.NODE_ENV, "test", "La integración exige NODE_ENV=test.");
  const valor = process.env.DATABASE_URL;
  assert.ok(valor, "La integración exige DATABASE_URL explícita.");
  const url = new URL(valor);
  assert.ok(["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname), "PostgreSQL debe ser local.");
  assert.equal(url.pathname, "/magina_test");
  assert.equal(url.username, "ci");
  assert.equal(url.password, "ci-only-password");
}

export function fechaHoyPeru() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Lima" });
}

/** Suma días a una fecha civil AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number) {
  const valor = new Date(`${fecha}T00:00:00.000Z`);
  valor.setUTCDate(valor.getUTCDate() + dias);
  return valor.toISOString().slice(0, 10);
}

export function dniAleatorio() {
  return String(randomInt(10_000_000, 99_999_999));
}

/** RUC sintético con dígito verificador correcto (prefijo 20 = persona jurídica). */
export function rucAleatorio(prefijo: "10" | "15" | "17" | "20" = "20") {
  const base = `${prefijo}${String(randomInt(0, 100_000_000)).padStart(8, "0")}`;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0);
  const resto = 11 - (suma % 11);
  return `${base}${resto === 10 ? 0 : resto === 11 ? 1 : resto}`;
}

export type UsuarioPrueba = { id: string; personaId: string; nombreUsuario: string; correo: string; contrasena: string };

/**
 * Crea usuarios, roles y catálogos sintéticos y registra lo creado para borrarlo al final.
 * Todo lo que crean los servicios a nombre de los usuarios de prueba se elimina en `limpiar()`.
 */
export class ContextoPostgres {
  readonly sufijo = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  readonly usuarios: string[] = [];
  readonly personas: string[] = [];
  readonly roles: string[] = [];
  readonly categorias: string[] = [];
  readonly marcas: string[] = [];
  readonly cuentas: string[] = [];
  readonly archivos: string[] = [];
  readonly listasPrecio: string[] = [];
  readonly tiposDocumento: string[] = [];

  private constructor(readonly modulo: PaqueteBaseDatos) {}

  static async crear() {
    validarBaseDePruebas();
    return new ContextoPostgres(baseDatos);
  }

  get db(): PaqueteBaseDatos["db"] { return this.modulo.db; }
  get sql(): PaqueteBaseDatos["clientePostgres"] { return this.modulo.clientePostgres; }

  async idCatalogo(tabla: "tipos_documento" | "tipos_persona" | "tipos_listas_precio", codigo: string) {
    const [fila] = await this.sql.unsafe<{ id: string }[]>(`SELECT id FROM ${tabla} WHERE codigo = $1 LIMIT 1`, [codigo]);
    assert.ok(fila, `Falta el catálogo ${tabla}.${codigo} creado por las migraciones.`);
    return fila.id;
  }

  /** Persona natural con DNI aleatorio. */
  async crearPersonaNatural(datos: { nombres?: string; apellidoPaterno?: string; activo?: boolean } = {}) {
    const [fila] = await this.sql.unsafe<{ id: string; numero_documento: string }[]>(
      `INSERT INTO personas (tipo_persona_id, tipo_documento_id, numero_documento, nombres, apellido_paterno, activo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, numero_documento`,
      [await this.idCatalogo("tipos_persona", "NATURAL"), await this.idCatalogo("tipos_documento", "01"), dniAleatorio(),
        datos.nombres ?? `QA ${this.sufijo}`, datos.apellidoPaterno ?? "Pruebas", datos.activo ?? true],
    );
    this.personas.push(fila.id);
    return { id: fila.id, numeroDocumento: fila.numero_documento };
  }

  /** Usuario activo con un rol propio que concede exactamente los permisos indicados. */
  async crearUsuario(permisos: string[], opciones: { activo?: boolean; personaActiva?: boolean; cesado?: boolean; rolActivo?: boolean } = {}): Promise<UsuarioPrueba> {
    const persona = await this.crearPersonaNatural({ activo: opciones.personaActiva ?? true });
    await this.sql.unsafe("INSERT INTO trabajadores (persona_id, fecha_ingreso, fecha_cese) VALUES ($1, $2, $3)",
      [persona.id, "2024-01-01", opciones.cesado ? "2024-06-01" : null]);
    const clave = `${this.sufijo.toLowerCase()}${this.usuarios.length}`;
    const contrasena = `Clave-${randomUUID()}`;
    const [usuario] = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO usuarios (trabajador_id, nombre_usuario, correo, contrasena_hash, activo, requiere_cambio_contrasena)
       VALUES ($1, $2, $3, $4, $5, false) RETURNING id`,
      [persona.id, `qa_${clave}`, `qa-${clave}@example.invalid`, await argon2.hash(contrasena), opciones.activo ?? true],
    );
    this.usuarios.push(usuario.id);
    const [rol] = await this.sql.unsafe<{ id: string }[]>(
      "INSERT INTO roles (codigo, nombre, activo) VALUES ($1, $2, $3) RETURNING id",
      [`QA_${clave.toUpperCase()}`, `Rol QA ${clave}`, opciones.rolActivo ?? true],
    );
    this.roles.push(rol.id);
    if (permisos.length) {
      await this.sql.unsafe(
        "INSERT INTO roles_permisos (rol_id, permiso_id) SELECT $1, id FROM permisos WHERE codigo = ANY($2::text[])",
        [rol.id, permisos],
      );
    }
    await this.sql.unsafe("INSERT INTO usuarios_roles (usuario_id, rol_id) VALUES ($1, $2)", [usuario.id, rol.id]);
    return { id: usuario.id, personaId: persona.id, nombreUsuario: `qa_${clave}`, correo: `qa-${clave}@example.invalid`, contrasena };
  }

  async crearCategoria(nombre = `QA categoría ${this.sufijo} ${this.categorias.length}`) {
    const [fila] = await this.sql.unsafe<{ id: string }[]>("INSERT INTO categorias_productos (nombre) VALUES ($1) RETURNING id", [nombre]);
    this.categorias.push(fila.id);
    return fila.id;
  }

  async crearMarca(uso: "REPUESTOS" | "MOTOTAXIS" | "AMBOS", nombre = `QA marca ${this.sufijo} ${this.marcas.length}`) {
    const [fila] = await this.sql.unsafe<{ id: string }[]>("INSERT INTO marcas_productos (nombre, uso) VALUES ($1, $2) RETURNING id", [nombre, uso]);
    this.marcas.push(fila.id);
    return fila.id;
  }

  async crearCuenta(usuarioId: string, datos: { tipo?: string; moneda?: string; activa?: boolean; saldoInicial?: string; fechaSaldoInicial?: string; numeroCuenta?: string; entidad?: string } = {}) {
    const [fila] = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO cuentas_financieras (tipo, nombre, entidad, moneda, activa, saldo_inicial, fecha_saldo_inicial, numero_cuenta, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [datos.tipo ?? "EFECTIVO", `QA cuenta ${this.sufijo} ${this.cuentas.length}`, datos.entidad ?? null, datos.moneda ?? "PEN", datos.activa ?? true,
        datos.saldoInicial ?? null, datos.fechaSaldoInicial ?? null, datos.numeroCuenta ?? null, usuarioId],
    );
    this.cuentas.push(fila.id);
    return fila.id;
  }

  /** Producto con presentación base NIU, sin precio y con el saldo indicado. */
  async crearProducto(datos: { categoriaId: string; marcaId: string; stock?: number; stockMinimo?: string; nombre?: string; activo?: boolean }) {
    const codigo = `QA-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const [producto] = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO productos (codigo_interno, nombre, categoria_id, marca_id, unidad_base_codigo, afectacion_igv, afecto_igv, stock_minimo, activo)
       VALUES ($1, $2, $3, $4, 'NIU', 'GRAVADO', true, $5, $6) RETURNING id`,
      [codigo, datos.nombre ?? `Producto sintético ${codigo}`, datos.categoriaId, datos.marcaId, datos.stockMinimo ?? "0", datos.activo ?? true],
    );
    const [presentacion] = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO productos_presentaciones (producto_id, unidad_medida_codigo, nombre, factor_a_unidad_base, se_compra, se_vende, es_base)
       VALUES ($1, 'NIU', 'Unidad base', 1, true, true, true) RETURNING id`,
      [producto.id],
    );
    if (datos.stock !== undefined) await this.sql.unsafe("INSERT INTO saldos_stock (producto_id, cantidad) VALUES ($1, $2)", [producto.id, datos.stock]);
    return { productoId: producto.id, presentacionId: presentacion.id, codigo };
  }

  /** Venta registrada directamente en PostgreSQL (sin emisión) para escenarios de lectura y garantías. */
  async crearVenta(usuarioId: string, datos: { fecha?: string; tipoComprobante?: "BOLETA" | "FACTURA" | "NOTA_VENTA"; estado?: string; total?: string; cuentaFinancieraId?: string; detalles?: Array<{ tipo: "MOTOTAXI" | "SERVICIO"; modeloId?: string; cantidad?: number; descripcion?: string }> } = {}) {
    const total = datos.total ?? "118.00";
    const [ingreso] = await this.sql.unsafe<{ id: string }[]>(
      `INSERT INTO ingresos (codigo, fecha, tipo_comprobante, estado, medio_pago, subtotal, igv, total, usuario_id, cliente_nombre)
       VALUES ($1, $2, $3, $4, 'EFECTIVO', $5, $6, $7, $8, $9) RETURNING id`,
      [`QA-V-${randomUUID().slice(0, 8)}`, datos.fecha ?? fechaHoyPeru(), datos.tipoComprobante ?? "BOLETA", datos.estado ?? "EMITIDO",
        (Number(total) / 1.18).toFixed(2), (Number(total) - Number(total) / 1.18).toFixed(2), total, usuarioId, `Cliente QA ${this.sufijo}`],
    );
    const detalles: string[] = [];
    for (const detalle of datos.detalles ?? [{ tipo: "SERVICIO" as const }]) {
      const [fila] = await this.sql.unsafe<{ id: string }[]>(
        `INSERT INTO ingresos_detalle (ingreso_id, tipo, descripcion, cantidad, precio_unitario, afecto_igv, subtotal, igv, total, mototaxi_modelo_id)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7, $8, $9) RETURNING id`,
        [ingreso.id, detalle.tipo, detalle.descripcion ?? `Línea QA ${this.sufijo}`, detalle.cantidad ?? 1, total,
          (Number(total) / 1.18).toFixed(2), (Number(total) - Number(total) / 1.18).toFixed(2), total, detalle.modeloId ?? null],
      );
      detalles.push(fila.id);
    }
    if (datos.cuentaFinancieraId) {
      await this.sql.unsafe(
        `INSERT INTO ingresos_pagos (ingreso_id, fecha_pago, importe_aplicado, importe_recibido, medio_pago, usuario_id, clave_idempotencia, cuenta_financiera_id)
         VALUES ($1, $2, $3, $3, 'EFECTIVO', $4, $5, $6)`,
        [ingreso.id, datos.fecha ?? fechaHoyPeru(), total, usuarioId, randomUUID(), datos.cuentaFinancieraId],
      );
    }
    return { ingresoId: ingreso.id, detalles };
  }

  /** Borra en orden de dependencias todo lo creado por los usuarios, personas y catálogos de este contexto. */
  async limpiar() {
    const u = this.usuarios;
    const m = this.marcas;
    const p = this.personas;
    const c = this.categorias;
    const ejecutar = (consulta: string, parametros: unknown[] = [u]) => this.sql.unsafe(consulta, parametros as never[]);
    const ingresosDeUsuarios = "SELECT id FROM ingresos WHERE usuario_id = ANY($1::uuid[])";
    const modelos = "SELECT id FROM modelos_mototaxis WHERE marca_id = ANY($1::uuid[])";
    const comprasDeUsuarios = "SELECT id FROM compras_mototaxis WHERE usuario_id = ANY($1::uuid[])";
    const productosDelContexto = "SELECT id FROM productos WHERE categoria_id = ANY($1::uuid[]) OR marca_id = ANY($2::uuid[])";
    await ejecutar("DELETE FROM reclamos_garantia_mototaxis WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar(`DELETE FROM garantias_ventas_mototaxis WHERE ingreso_detalle_id IN (SELECT id FROM ingresos_detalle WHERE ingreso_id IN (${ingresosDeUsuarios}))`);
    await ejecutar(`DELETE FROM comprobantes_relacionados_detalle WHERE comprobante_relacionado_id IN (SELECT id FROM comprobantes_relacionados WHERE usuario_id = ANY($1::uuid[]))`);
    await ejecutar("DELETE FROM comprobantes_relacionados WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar(`DELETE FROM ingresos_pagos WHERE usuario_id = ANY($1::uuid[]) OR ingreso_id IN (${ingresosDeUsuarios})`);
    await ejecutar("DELETE FROM ordenes_servicio WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar(`DELETE FROM movimientos_stock WHERE producto_id IN (${productosDelContexto})`, [c, m]);
    await ejecutar("DELETE FROM movimientos_stock WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar(`DELETE FROM ingresos WHERE id IN (${ingresosDeUsuarios})`);
    await ejecutar(`DELETE FROM garantias_mototaxis WHERE proveedor_persona_id = ANY($2::uuid[]) OR compra_detalle_id IN (SELECT id FROM compras_mototaxis_detalle WHERE compra_id IN (${comprasDeUsuarios}))`, [u, p]);
    await ejecutar(`DELETE FROM pagos_compras_mototaxis WHERE usuario_id = ANY($1::uuid[]) OR compra_id IN (${comprasDeUsuarios})`);
    await ejecutar(`DELETE FROM movimientos_mototaxis WHERE unidad_id IN (SELECT id FROM unidades_mototaxis WHERE modelo_id IN (${modelos}))`, [m]);
    await ejecutar(`DELETE FROM unidades_mototaxis WHERE modelo_id IN (${modelos})`, [m]);
    await ejecutar(`DELETE FROM compras_mototaxis_detalle WHERE compra_id IN (${comprasDeUsuarios})`);
    await ejecutar("DELETE FROM compras_mototaxis WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM ajustes_inventario_mototaxis WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM movimientos_modelos_mototaxis WHERE usuario_id = ANY($1::uuid[]) OR modelo_id IN (SELECT id FROM modelos_mototaxis WHERE marca_id = ANY($2::uuid[]))", [u, m]);
    await ejecutar(`DELETE FROM precios_modelos_mototaxis WHERE modelo_id IN (${modelos})`, [m]);
    await ejecutar(`DELETE FROM garantias_modelos_mototaxis WHERE modelo_id IN (${modelos})`, [m]);
    await ejecutar("DELETE FROM modelos_mototaxis WHERE marca_id = ANY($1::uuid[])", [m]);
    await ejecutar("DELETE FROM egresos_pagos WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM egresos_registros WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM entradas_stock WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar(`DELETE FROM saldos_stock WHERE producto_id IN (${productosDelContexto})`, [c, m]);
    await ejecutar(`DELETE FROM productos WHERE id IN (${productosDelContexto})`, [c, m]);
    await ejecutar("DELETE FROM metas_dashboard WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM cuentas_financieras WHERE usuario_id = ANY($1::uuid[]) OR id = ANY($2::uuid[])", [u, this.cuentas]);
    await ejecutar("DELETE FROM archivos_locales WHERE id = ANY($1::uuid[])", [this.archivos]);
    await ejecutar("DELETE FROM tipos_listas_precio WHERE id = ANY($1::uuid[])", [this.listasPrecio]);
    await ejecutar("DELETE FROM proveedores WHERE persona_id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM conductores WHERE persona_id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM transportistas WHERE persona_id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM clientes WHERE persona_id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM usuarios_roles WHERE usuario_id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM usuarios WHERE id = ANY($1::uuid[])");
    await ejecutar("DELETE FROM roles WHERE id = ANY($1::uuid[])", [this.roles]);
    await ejecutar("DELETE FROM trabajadores WHERE persona_id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM personas WHERE id = ANY($1::uuid[])", [p]);
    await ejecutar("DELETE FROM tipos_documento WHERE id = ANY($1::uuid[]) AND NOT EXISTS (SELECT 1 FROM personas WHERE tipo_documento_id = tipos_documento.id)", [this.tiposDocumento]);
    await ejecutar("DELETE FROM categorias_productos WHERE id = ANY($1::uuid[])", [c]);
    await ejecutar("DELETE FROM marcas_productos WHERE id = ANY($1::uuid[])", [m]);
  }

  async cerrar() {
    try {
      await this.limpiar();
    } finally {
      await this.modulo.cerrarBaseDatos();
    }
  }
}
