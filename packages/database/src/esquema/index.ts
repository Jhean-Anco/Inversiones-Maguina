import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  timestamp,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const fechaCreacion = () => timestamp("creado_en", { withTimezone: true, precision: 3 }).notNull().defaultNow();
const fechaActualizacion = () => timestamp("actualizado_en", { withTimezone: true, precision: 3 }).notNull().defaultNow().$onUpdate(() => new Date());

export const tiposDocumento = pgTable("tipos_documento", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  longitudMinima: integer("longitud_minima"),
  longitudMaxima: integer("longitud_maxima"),
  soloNumeros: boolean("solo_numeros").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const tiposPersona = pgTable("tipos_persona", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nombre: varchar("nombre", { length: 80 }).notNull().unique(),
  descripcion: varchar("descripcion", { length: 240 }),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const personas = pgTable("personas", {
  id: uuid("id").defaultRandom().primaryKey(),
  tipoPersonaId: uuid("tipo_persona_id").notNull().references(() => tiposPersona.id, { onDelete: "restrict" }),
  nombres: varchar("nombres", { length: 120 }),
  apellidoPaterno: varchar("apellido_paterno", { length: 120 }),
  apellidoMaterno: varchar("apellido_materno", { length: 120 }),
  razonSocial: varchar("razon_social", { length: 180 }),
  tipoDocumentoId: uuid("tipo_documento_id").notNull().references(() => tiposDocumento.id, { onDelete: "restrict" }),
  numeroDocumento: varchar("numero_documento", { length: 30 }).notNull(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  uniqueIndex("personas_documento_unico").on(tabla.tipoDocumentoId, tabla.numeroDocumento),
  index("personas_nombre_idx").on(tabla.apellidoPaterno, tabla.apellidoMaterno, tabla.nombres),
  check("personas_nombre_o_razon_social_ck", sql`(
    (${tabla.nombres} IS NOT NULL AND ${tabla.apellidoPaterno} IS NOT NULL AND ${tabla.razonSocial} IS NULL)
    OR (${tabla.razonSocial} IS NOT NULL AND ${tabla.nombres} IS NULL AND ${tabla.apellidoPaterno} IS NULL AND ${tabla.apellidoMaterno} IS NULL)
  )`),
]);

export const personasDocumentos = pgTable("personas_documentos", {
  id: uuid("id").defaultRandom().primaryKey(),
  personaId: uuid("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  tipoDocumentoId: uuid("tipo_documento_id").notNull().references(() => tiposDocumento.id, { onDelete: "restrict" }),
  numeroDocumento: varchar("numero_documento", { length: 30 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  uniqueIndex("personas_documentos_identidad_unico").on(tabla.tipoDocumentoId, tabla.numeroDocumento),
  uniqueIndex("personas_documentos_persona_tipo_unico").on(tabla.personaId, tabla.tipoDocumentoId),
  index("personas_documentos_persona_idx").on(tabla.personaId),
]);

export const clientes = pgTable("clientes", {
  personaId: uuid("persona_id").primaryKey().references(() => personas.id, { onDelete: "restrict" }),
  nombreComercial: varchar("nombre_comercial", { length: 180 }),
  contactoNombre: varchar("contacto_nombre", { length: 180 }),
  correo: varchar("correo", { length: 254 }),
  telefono: varchar("telefono", { length: 30 }),
  direccionFiscal: varchar("direccion_fiscal", { length: 240 }),
  direccionEntrega: varchar("direccion_entrega", { length: 240 }),
  observacion: text("observacion"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [index("clientes_activo_idx").on(tabla.activo)]);

export const tiposContacto = pgTable("tipos_contacto", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const personasContactos = pgTable("personas_contactos", {
  id: uuid("id").defaultRandom().primaryKey(),
  personaId: uuid("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  tipoContactoId: uuid("tipo_contacto_id").notNull().references(() => tiposContacto.id, { onDelete: "restrict" }),
  valor: varchar("valor", { length: 254 }).notNull(),
  etiqueta: varchar("etiqueta", { length: 80 }),
  esPrincipal: boolean("es_principal").notNull().default(false),
  verificadoEn: timestamp("verificado_en", { withTimezone: true, precision: 3 }),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  index("personas_contactos_persona_tipo_idx").on(tabla.personaId, tabla.tipoContactoId),
  index("personas_contactos_tipo_valor_idx").on(tabla.tipoContactoId, tabla.valor),
  uniqueIndex("persona_contacto_principal_unico").on(tabla.personaId, tabla.tipoContactoId).where(sql`${tabla.esPrincipal}`),
]);

export const cargos = pgTable("cargos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 30 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  descripcion: varchar("descripcion", { length: 240 }),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const trabajadores = pgTable("trabajadores", {
  personaId: uuid("persona_id").primaryKey().references(() => personas.id, { onDelete: "restrict" }),
  codigoTrabajador: varchar("codigo_trabajador", { length: 30 }).unique(),
  cargoId: uuid("cargo_id").references(() => cargos.id, { onDelete: "restrict" }),
  fechaIngreso: date("fecha_ingreso").notNull(),
  fechaCese: date("fecha_cese"),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [check("trabajadores_fechas_ck", sql`${tabla.fechaCese} IS NULL OR ${tabla.fechaCese} >= ${tabla.fechaIngreso}`)]);

export const usuarios = pgTable("usuarios", {
  id: uuid("id").defaultRandom().primaryKey(),
  trabajadorId: uuid("trabajador_id").notNull().unique().references(() => trabajadores.personaId, { onDelete: "restrict" }),
  nombreUsuario: varchar("nombre_usuario", { length: 60 }).notNull(),
  correo: varchar("correo", { length: 254 }).notNull(),
  contrasenaHash: varchar("contrasena_hash", { length: 255 }).notNull(),
  activo: boolean("activo").notNull().default(true),
  requiereCambioContrasena: boolean("requiere_cambio_contrasena").notNull().default(true),
  ultimoAccesoEn: timestamp("ultimo_acceso_en", { withTimezone: true, precision: 3 }),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  uniqueIndex("usuarios_nombre_usuario_lower_unico").on(sql`lower(${tabla.nombreUsuario})`),
  uniqueIndex("usuarios_correo_lower_unico").on(sql`lower(${tabla.correo})`),
]);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  nombre: varchar("nombre", { length: 80 }).notNull().unique(),
  descripcion: varchar("descripcion", { length: 240 }),
  esSistema: boolean("es_sistema").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
});

export const permisos = pgTable("permisos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 100 }).notNull().unique(),
  modulo: varchar("modulo", { length: 60 }).notNull(),
  accion: varchar("accion", { length: 60 }).notNull(),
  descripcion: varchar("descripcion", { length: 240 }),
  creadoEn: fechaCreacion(),
}, (tabla) => [uniqueIndex("permisos_modulo_accion_unico").on(tabla.modulo, tabla.accion)]);

export const usuariosRoles = pgTable("usuarios_roles", {
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "cascade" }),
  rolId: uuid("rol_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
  asignadoEn: timestamp("asignado_en", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  asignadoPorUsuarioId: uuid("asignado_por_usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
}, (tabla) => [primaryKey({ columns: [tabla.usuarioId, tabla.rolId] })]);

export const rolesPermisos = pgTable("roles_permisos", {
  rolId: uuid("rol_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
  permisoId: uuid("permiso_id").notNull().references(() => permisos.id, { onDelete: "cascade" }),
  asignadoEn: timestamp("asignado_en", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (tabla) => [primaryKey({ columns: [tabla.rolId, tabla.permisoId] })]);

export const categoriasProductos = pgTable("categorias_productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: varchar("descripcion", { length: 240 }),
  rutaImagen: text("ruta_imagen"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [uniqueIndex("categorias_productos_nombre_lower_unico").on(sql`lower(${tabla.nombre})`)]);

export const marcasProductos = pgTable("marcas_productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  descripcion: varchar("descripcion", { length: 240 }),
  rutaImagen: text("ruta_imagen"),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [uniqueIndex("marcas_productos_nombre_lower_unico").on(sql`lower(${tabla.nombre})`)]);

export const unidadesMedida = pgTable("unidades_medida", {
  codigo: varchar("codigo", { length: 3 }).primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const tiposListasPrecio = pgTable("tipos_listas_precio", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull().unique(),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
});

export const productos = pgTable("productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigoInterno: varchar("codigo_interno", { length: 40 }).notNull().unique(),
  nombre: varchar("nombre", { length: 180 }).notNull(),
  descripcion: text("descripcion"),
  categoriaId: uuid("categoria_id").notNull().references(() => categoriasProductos.id, { onDelete: "restrict" }),
  marcaId: uuid("marca_id").notNull().references(() => marcasProductos.id, { onDelete: "restrict" }),
  unidadBaseCodigo: varchar("unidad_base_codigo", { length: 3 }).notNull().references(() => unidadesMedida.codigo, { onDelete: "restrict" }),
  stockMinimo: numeric("stock_minimo", { precision: 18, scale: 3 }).notNull().default("0"),
  afectacionIgv: varchar("afectacion_igv", { length: 20 }).notNull().default("GRAVADO"),
  afectoIgv: boolean("afecto_igv").notNull().default(true),
  rutaImagen: text("ruta_imagen"),
  fichaTecnica: jsonb("ficha_tecnica").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  index("productos_nombre_idx").on(tabla.nombre),
  index("productos_categoria_marca_idx").on(tabla.categoriaId, tabla.marcaId),
  check("productos_afectacion_igv_ck", sql`${tabla.afectacionIgv} IN ('GRAVADO', 'EXONERADO', 'INAFECTO')`),
]);

export const productosImagenes = pgTable("productos_imagenes", {
  id: uuid("id").defaultRandom().primaryKey(),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "cascade" }),
  rutaImagen: text("ruta_imagen").notNull(),
  orden: integer("orden").notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  uniqueIndex("productos_imagenes_producto_orden_unico").on(tabla.productoId, tabla.orden),
  index("productos_imagenes_producto_idx").on(tabla.productoId),
  check("productos_imagenes_orden_ck", sql`${tabla.orden} BETWEEN 1 AND 5`),
]);

export const productosCodigos = pgTable("productos_codigos", {
  id: uuid("id").defaultRandom().primaryKey(),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  codigo: varchar("codigo", { length: 100 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  uniqueIndex("productos_codigos_tipo_codigo_unico").on(tabla.tipo, sql`lower(${tabla.codigo})`),
  index("productos_codigos_producto_idx").on(tabla.productoId),
]);

export const productosPresentaciones = pgTable("productos_presentaciones", {
  id: uuid("id").defaultRandom().primaryKey(),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "cascade" }),
  unidadMedidaCodigo: varchar("unidad_medida_codigo", { length: 3 }).notNull().references(() => unidadesMedida.codigo, { onDelete: "restrict" }),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  factorAUnidadBase: numeric("factor_a_unidad_base", { precision: 14, scale: 6 }).notNull(),
  seCompra: boolean("se_compra").notNull().default(false),
  seVende: boolean("se_vende").notNull().default(true),
  esBase: boolean("es_base").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  index("productos_presentaciones_producto_idx").on(tabla.productoId),
  uniqueIndex("productos_presentaciones_base_unica").on(tabla.productoId).where(sql`${tabla.esBase}`),
  check("productos_presentaciones_factor_positivo_ck", sql`${tabla.factorAUnidadBase} > 0`),
  check("productos_presentaciones_rol_ck", sql`${tabla.seCompra} OR ${tabla.seVende}`),
]);

export const preciosProductos = pgTable("precios_productos", {
  id: uuid("id").defaultRandom().primaryKey(),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "cascade" }),
  presentacionId: uuid("presentacion_id").notNull().references(() => productosPresentaciones.id, { onDelete: "cascade" }),
  tipoListaPrecioId: uuid("tipo_lista_precio_id").notNull().references(() => tiposListasPrecio.id, { onDelete: "restrict" }),
  precio: numeric("precio", { precision: 12, scale: 2 }).notNull(),
  cantidadMinima: numeric("cantidad_minima", { precision: 14, scale: 3 }).notNull().default("1"),
  vigenteDesde: timestamp("vigente_desde", { withTimezone: true, precision: 3 }),
  vigenteHasta: timestamp("vigente_hasta", { withTimezone: true, precision: 3 }),
  activo: boolean("activo").notNull().default(true),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  index("precios_productos_consulta_idx").on(tabla.productoId, tabla.tipoListaPrecioId, tabla.activo),
  check("precios_productos_precio_no_negativo_ck", sql`${tabla.precio} >= 0`),
  check("precios_productos_cantidad_positiva_ck", sql`${tabla.cantidadMinima} > 0`),
  check("precios_productos_vigencia_ck", sql`${tabla.vigenteHasta} IS NULL OR ${tabla.vigenteDesde} IS NULL OR ${tabla.vigenteHasta} > ${tabla.vigenteDesde}`),
]);

export const entradasStock = pgTable("entradas_stock", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  rucEmisor: varchar("ruc_emisor", { length: 11 }),
  fecha: date("fecha").notNull(),
  tipoDocumento: varchar("tipo_documento", { length: 30 }).notNull(),
  numeroDocumento: varchar("numero_documento", { length: 60 }),
  medioPago: varchar("medio_pago", { length: 30 }),
  montoPagado: numeric("monto_pagado", { precision: 14, scale: 2 }),
  proveedor: varchar("proveedor", { length: 180 }),
  proveedorTipoPersona: varchar("proveedor_tipo_persona", { length: 20 }),
  proveedorTipoDocumento: varchar("proveedor_tipo_documento", { length: 10 }),
  proveedorNumeroDocumento: varchar("proveedor_numero_documento", { length: 100 }),
  proveedorDireccion: varchar("proveedor_direccion", { length: 250 }),
  observacion: text("observacion"),
  totalDocumento: numeric("total_documento", { precision: 14, scale: 2 }),
  evidenciaRuta: varchar("evidencia_ruta", { length: 260 }),
  evidenciaNombre: varchar("evidencia_nombre", { length: 255 }),
  evidenciaMime: varchar("evidencia_mime", { length: 100 }),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("entradas_stock_fecha_idx").on(tabla.fecha),
  index("entradas_stock_ruc_emisor_fecha_idx").on(tabla.rucEmisor, tabla.fecha),
  index("entradas_stock_proveedor_idx").on(tabla.proveedor),
  index("entradas_stock_proveedor_documento_idx").on(tabla.proveedorTipoDocumento, tabla.proveedorNumeroDocumento),
  check("entradas_stock_proveedor_persona_ck", sql`${tabla.proveedorTipoPersona} IS NULL OR ${tabla.proveedorTipoPersona} IN ('NATURAL', 'JURIDICA')`),
  check("entradas_stock_ruc_emisor_ck", sql`${tabla.rucEmisor} IS NULL OR ${tabla.rucEmisor} ~ '^[0-9]{11}$'`),
  check("entradas_stock_proveedor_documento_tipo_ck", sql`${tabla.proveedorTipoDocumento} IS NULL OR ${tabla.proveedorTipoDocumento} IN ('DNI', 'RUC', 'EXT')`),
  check("entradas_stock_proveedor_documento_numero_ck", sql`${tabla.proveedorNumeroDocumento} IS NULL OR (${tabla.proveedorTipoDocumento} = 'DNI' AND ${tabla.proveedorNumeroDocumento} ~ '^[0-9]{8}$') OR (${tabla.proveedorTipoDocumento} = 'RUC' AND ${tabla.proveedorNumeroDocumento} ~ '^[0-9]{11}$') OR (${tabla.proveedorTipoDocumento} = 'EXT' AND length(trim(${tabla.proveedorNumeroDocumento})) BETWEEN 1 AND 100)`),
  check("entradas_stock_proveedor_juridico_ruc_ck", sql`${tabla.proveedorTipoPersona} IS DISTINCT FROM 'JURIDICA' OR ${tabla.proveedorTipoDocumento} IN ('RUC', 'EXT')`),
  check("entradas_stock_total_no_negativo_ck", sql`${tabla.total} >= 0`),
  check("entradas_stock_pago_ck", sql`${tabla.montoPagado} IS NULL OR (${tabla.montoPagado} >= 0 AND ${tabla.montoPagado} <= coalesce(${tabla.totalDocumento}, ${tabla.total}))`),
  check("entradas_stock_medio_pago_ck", sql`${tabla.medioPago} IS NULL OR ${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
]);

export const pagosEntradasStock = pgTable("pagos_entradas_stock", {
  id: uuid("id").defaultRandom().primaryKey(),
  entradaId: uuid("entrada_id").notNull().references(() => entradasStock.id, { onDelete: "cascade" }),
  fechaPago: date("fecha_pago", { mode: "string" }).notNull(),
  importePagado: numeric("importe_pagado", { precision: 14, scale: 2 }).notNull(),
  medioPago: varchar("medio_pago", { length: 30 }).notNull(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  clasificadoPorUsuarioId: uuid("clasificado_por_usuario_id").references(() => usuarios.id, { onDelete: "restrict" }),
  clasificadoEn: timestamp("clasificado_en", { withTimezone: true, precision: 3 }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("pagos_entradas_stock_entrada_fecha_idx").on(tabla.entradaId, tabla.fechaPago),
  check("pagos_entradas_stock_importes_ck", sql`${tabla.importePagado} > 0`),
  check("pagos_entradas_stock_medio_ck", sql`${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
]);

export const entradasStockDocumentoDetalle = pgTable("entradas_stock_documento_detalle", {
  id: uuid("id").defaultRandom().primaryKey(),
  entradaId: uuid("entrada_id").notNull().references(() => entradasStock.id, { onDelete: "cascade" }),
  orden: integer("orden").notNull(),
  codigo: varchar("codigo", { length: 100 }),
  descripcion: varchar("descripcion", { length: 500 }).notNull(),
  unidad: varchar("unidad", { length: 40 }),
  cantidad: numeric("cantidad", { precision: 14, scale: 3 }).notNull(),
  costoUnitario: numeric("costo_unitario", { precision: 14, scale: 4 }).notNull(),
  descuento: numeric("descuento", { precision: 14, scale: 2 }).notNull().default("0"),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("entradas_stock_documento_detalle_entrada_idx").on(tabla.entradaId, tabla.orden),
  check("entradas_stock_documento_detalle_cantidad_ck", sql`${tabla.cantidad} > 0`),
  check("entradas_stock_documento_detalle_costo_ck", sql`${tabla.costoUnitario} >= 0`),
  check("entradas_stock_documento_detalle_importes_ck", sql`${tabla.descuento} >= 0 AND ${tabla.subtotal} >= 0 AND ${tabla.total} >= 0`),
]);

export const entradasStockDetalle = pgTable("entradas_stock_detalle", {
  id: uuid("id").defaultRandom().primaryKey(),
  entradaId: uuid("entrada_id").notNull().references(() => entradasStock.id, { onDelete: "cascade" }),
  detalleDocumentoId: uuid("detalle_documento_id").references(() => entradasStockDocumentoDetalle.id, { onDelete: "set null" }),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "restrict" }),
  presentacionId: uuid("presentacion_id").notNull().references(() => productosPresentaciones.id, { onDelete: "restrict" }),
  codigoProducto: varchar("codigo_producto", { length: 40 }).notNull(),
  nombreProducto: varchar("nombre_producto", { length: 180 }).notNull(),
  presentacion: varchar("presentacion", { length: 100 }).notNull(),
  unidadMedidaCodigo: varchar("unidad_medida_codigo", { length: 3 }).notNull().references(() => unidadesMedida.codigo, { onDelete: "restrict" }),
  cantidad: numeric("cantidad", { precision: 14, scale: 3 }).notNull(),
  factorAUnidadBase: numeric("factor_a_unidad_base", { precision: 14, scale: 6 }).notNull(),
  cantidadBase: numeric("cantidad_base", { precision: 18, scale: 6 }).notNull(),
  costoUnitario: numeric("costo_unitario", { precision: 14, scale: 4 }).notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("entradas_stock_detalle_entrada_idx").on(tabla.entradaId),
  index("entradas_stock_detalle_producto_idx").on(tabla.productoId),
  check("entradas_stock_detalle_cantidad_positiva_ck", sql`${tabla.cantidad} > 0`),
  check("entradas_stock_detalle_factor_positivo_ck", sql`${tabla.factorAUnidadBase} > 0`),
  check("entradas_stock_detalle_cantidad_base_positiva_ck", sql`${tabla.cantidadBase} > 0`),
  check("entradas_stock_detalle_costo_no_negativo_ck", sql`${tabla.costoUnitario} >= 0`),
]);

export const egresosRegistros = pgTable("egresos_registros", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  rucEmisor: varchar("ruc_emisor", { length: 11 }),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  fecha: date("fecha").notNull(),
  categoria: varchar("categoria", { length: 80 }).notNull(),
  concepto: varchar("concepto", { length: 240 }).notNull(),
  beneficiario: varchar("beneficiario", { length: 180 }),
  proveedorRuc: varchar("proveedor_ruc", { length: 11 }),
  documentoTipo: varchar("documento_tipo", { length: 30 }),
  documentoNumero: varchar("documento_numero", { length: 60 }),
  moneda: varchar("moneda", { length: 3 }).notNull().default("PEN"),
  medioPago: varchar("medio_pago", { length: 30 }).notNull(),
  monto: numeric("monto", { precision: 14, scale: 2 }).notNull(),
  identificadorActivo: varchar("identificador_activo", { length: 100 }),
  mototaxiMarca: varchar("mototaxi_marca", { length: 100 }),
  mototaxiModelo: varchar("mototaxi_modelo", { length: 100 }),
  mototaxiNumeroMotor: varchar("mototaxi_numero_motor", { length: 100 }),
  mototaxiNumeroChasis: varchar("mototaxi_numero_chasis", { length: 100 }),
  observacion: text("observacion"),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("egresos_registros_tipo_fecha_idx").on(tabla.tipo, tabla.fecha),
  index("egresos_registros_ruc_emisor_fecha_idx").on(tabla.rucEmisor, tabla.fecha),
  index("egresos_registros_beneficiario_idx").on(tabla.beneficiario),
  check("egresos_registros_tipo_ck", sql`${tabla.tipo} IN ('GASTO_OPERATIVO', 'SERVICIO_PERSONAL', 'ACTIVO_HERRAMIENTA', 'MOTOTAXI')`),
  check("egresos_registros_ruc_emisor_ck", sql`${tabla.rucEmisor} IS NULL OR ${tabla.rucEmisor} ~ '^[0-9]{11}$'`),
  check("egresos_registros_proveedor_ruc_ck", sql`${tabla.proveedorRuc} IS NULL OR ${tabla.proveedorRuc} ~ '^[0-9]{11}$'`),
  check("egresos_registros_moneda_ck", sql`${tabla.moneda} IN ('PEN', 'USD', 'EUR')`),
  check("egresos_registros_medio_pago_ck", sql`${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
  check("egresos_registros_monto_positivo_ck", sql`${tabla.monto} > 0`),
  check("egresos_registros_mototaxi_datos_ck", sql`(${tabla.tipo} <> 'MOTOTAXI') OR (${tabla.mototaxiMarca} IS NOT NULL AND ${tabla.mototaxiModelo} IS NOT NULL AND ${tabla.mototaxiNumeroMotor} IS NOT NULL AND ${tabla.mototaxiNumeroChasis} IS NOT NULL)`),
  uniqueIndex("egresos_registros_mototaxi_motor_unique").on(tabla.mototaxiNumeroMotor).where(sql`${tabla.tipo} = 'MOTOTAXI'`),
  uniqueIndex("egresos_registros_mototaxi_chasis_unique").on(tabla.mototaxiNumeroChasis).where(sql`${tabla.tipo} = 'MOTOTAXI'`),
]);

export const egresosPagos = pgTable("egresos_pagos", {
  id: uuid("id").defaultRandom().primaryKey(),
  egresoId: uuid("egreso_id").notNull().references(() => egresosRegistros.id, { onDelete: "restrict" }),
  fechaPago: date("fecha_pago").notNull(),
  importePagado: numeric("importe_pagado", { precision: 14, scale: 2 }).notNull(),
  medioPago: varchar("medio_pago", { length: 30 }).notNull(),
  claveIdempotencia: uuid("clave_idempotencia").notNull().unique(),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("egresos_pagos_egreso_fecha_idx").on(tabla.egresoId, tabla.fechaPago),
  index("egresos_pagos_fecha_idx").on(tabla.fechaPago),
  check("egresos_pagos_importe_positivo_ck", sql`${tabla.importePagado} > 0`),
  check("egresos_pagos_medio_pago_ck", sql`${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
]);

export const saldosStock = pgTable("saldos_stock", {
  productoId: uuid("producto_id").primaryKey().references(() => productos.id, { onDelete: "restrict" }),
  cantidad: numeric("cantidad", { precision: 18, scale: 6 }).notNull().default("0"),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [check("saldos_stock_cantidad_no_negativa_ck", sql`${tabla.cantidad} >= 0`)]);

export const movimientosStock = pgTable("movimientos_stock", {
  id: uuid("id").defaultRandom().primaryKey(),
  productoId: uuid("producto_id").notNull().references(() => productos.id, { onDelete: "restrict" }),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  origenTipo: varchar("origen_tipo", { length: 30 }).notNull(),
  origenId: uuid("origen_id").notNull(),
  origenDetalleId: uuid("origen_detalle_id").notNull(),
  cantidadBase: numeric("cantidad_base", { precision: 18, scale: 6 }).notNull(),
  costoUnitarioBase: numeric("costo_unitario_base", { precision: 14, scale: 6 }).notNull(),
  sentido: varchar("sentido", { length: 10 }),
  motivo: varchar("motivo", { length: 40 }),
  observacion: text("observacion"),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  uniqueIndex("movimientos_stock_origen_detalle_unico").on(tabla.origenTipo, tabla.origenDetalleId),
  index("movimientos_stock_producto_fecha_idx").on(tabla.productoId, tabla.creadoEn),
  check("movimientos_stock_tipo_ck", sql`${tabla.tipo} IN ('ENTRADA', 'SALIDA', 'AJUSTE')`),
  check("movimientos_stock_cantidad_positiva_ck", sql`${tabla.cantidadBase} > 0`),
  check("movimientos_stock_costo_no_negativo_ck", sql`${tabla.costoUnitarioBase} >= 0`),
  check("movimientos_stock_sentido_ck", sql`${tabla.sentido} IS NULL OR ${tabla.sentido} IN ('INGRESO', 'RETIRO')`),
  check("movimientos_stock_motivo_ck", sql`${tabla.motivo} IS NULL OR ${tabla.motivo} IN ('INVENTARIO_FISICO', 'MERMA', 'DANIO', 'PERDIDA', 'DEVOLUCION', 'CORRECCION', 'OTRO')`),
]);

export const ingresos = pgTable("ingresos", {
  id: uuid("id").defaultRandom().primaryKey(),
  codigo: varchar("codigo", { length: 40 }).notNull().unique(),
  rucEmisor: varchar("ruc_emisor", { length: 11 }),
  fecha: date("fecha").notNull(),
  tipoComprobante: varchar("tipo_comprobante", { length: 10 }).notNull().default("BOLETA"),
  clienteTipoDocumento: varchar("cliente_tipo_documento", { length: 10 }),
  clienteNumeroDocumento: varchar("cliente_numero_documento", { length: 20 }),
  clienteNombre: varchar("cliente_nombre", { length: 180 }),
  clienteDireccion: varchar("cliente_direccion", { length: 240 }),
  clienteId: uuid("cliente_id").references(() => clientes.personaId, { onDelete: "restrict" }),
  medioPago: varchar("medio_pago", { length: 30 }).notNull(),
  condicionPago: varchar("condicion_pago", { length: 10 }).notNull().default("CONTADO"),
  fechaVencimientoPago: date("fecha_vencimiento_pago", { mode: "string" }),
  cuotasPago: jsonb("cuotas_pago").$type<{ cuota: number; fechaDePago: string; importe: string }[]>().notNull().default([]),
  importePagoInicial: numeric("importe_pago_inicial", { precision: 14, scale: 2 }).notNull().default("0"),
  observacion: text("observacion"),
  datosNubefact: jsonb("datos_nubefact").$type<Record<string, unknown> | null>(),
  claveIdempotencia: varchar("clave_idempotencia", { length: 36 }),
  huellaSolicitud: varchar("huella_solicitud", { length: 64 }),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  tasaIgv: numeric("tasa_igv", { precision: 5, scale: 2 }).notNull().default("18.00"),
  igv: numeric("igv", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  estado: varchar("estado", { length: 20 }).notNull().default("REGISTRADO"),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("ingresos_fecha_idx").on(tabla.fecha),
  index("ingresos_ruc_emisor_fecha_idx").on(tabla.rucEmisor, tabla.fecha),
  index("ingresos_cliente_documento_idx").on(tabla.clienteTipoDocumento, tabla.clienteNumeroDocumento),
  uniqueIndex("ingresos_clave_idempotencia_unico").on(tabla.claveIdempotencia).where(sql`${tabla.claveIdempotencia} IS NOT NULL`),
  check("ingresos_tipo_comprobante_ck", sql`${tabla.tipoComprobante} IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')`),
  check("ingresos_ruc_emisor_ck", sql`${tabla.rucEmisor} IS NULL OR ${tabla.rucEmisor} ~ '^[0-9]{11}$'`),
  check("ingresos_medio_pago_ck", sql`${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
  check("ingresos_condicion_pago_ck", sql`(${tabla.condicionPago} = 'CONTADO' AND ${tabla.fechaVencimientoPago} IS NULL AND jsonb_array_length(${tabla.cuotasPago}) = 0) OR (${tabla.condicionPago} = 'CREDITO' AND ${tabla.fechaVencimientoPago} IS NOT NULL AND ${tabla.fechaVencimientoPago} > ${tabla.fecha} AND jsonb_array_length(${tabla.cuotasPago}) > 0)`),
  check("ingresos_pago_inicial_ck", sql`${tabla.importePagoInicial} >= 0 AND ((${tabla.condicionPago} = 'CONTADO' AND ${tabla.importePagoInicial} = 0) OR (${tabla.condicionPago} = 'CREDITO' AND ${tabla.importePagoInicial} < ${tabla.total}))`),
  check("ingresos_totales_no_negativos_ck", sql`${tabla.subtotal} >= 0 AND ${tabla.igv} >= 0 AND ${tabla.total} >= 0`),
  check("ingresos_tasa_igv_ck", sql`${tabla.tasaIgv} >= 0 AND ${tabla.tasaIgv} <= 100`),
]);

export const ingresosDetalle = pgTable("ingresos_detalle", {
  id: uuid("id").defaultRandom().primaryKey(),
  ingresoId: uuid("ingreso_id").notNull().references(() => ingresos.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  productoId: uuid("producto_id").references(() => productos.id, { onDelete: "restrict" }),
  presentacionId: uuid("presentacion_id").references(() => productosPresentaciones.id, { onDelete: "restrict" }),
  codigoProducto: varchar("codigo_producto", { length: 40 }),
  descripcion: varchar("descripcion", { length: 240 }).notNull(),
  presentacion: varchar("presentacion", { length: 100 }),
  unidadMedidaCodigo: varchar("unidad_medida_codigo", { length: 3 }).references(() => unidadesMedida.codigo, { onDelete: "restrict" }),
  cantidad: numeric("cantidad", { precision: 14, scale: 3 }).notNull(),
  factorAUnidadBase: numeric("factor_a_unidad_base", { precision: 14, scale: 6 }),
  cantidadBase: numeric("cantidad_base", { precision: 18, scale: 6 }),
  precioUnitario: numeric("precio_unitario", { precision: 14, scale: 4 }).notNull(),
  descuento: numeric("descuento", { precision: 14, scale: 2 }).notNull().default("0"),
  afectacionIgv: varchar("afectacion_igv", { length: 20 }).notNull().default("GRAVADO"),
  afectoIgv: boolean("afecto_igv").notNull(),
  subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
  igv: numeric("igv", { precision: 14, scale: 2 }).notNull(),
  total: numeric("total", { precision: 14, scale: 2 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("ingresos_detalle_ingreso_idx").on(tabla.ingresoId),
  index("ingresos_detalle_producto_idx").on(tabla.productoId),
  check("ingresos_detalle_tipo_ck", sql`${tabla.tipo} IN ('PRODUCTO', 'SERVICIO')`),
  check("ingresos_detalle_afectacion_igv_ck", sql`${tabla.afectacionIgv} IN ('GRAVADO', 'EXONERADO', 'INAFECTO')`),
  check("ingresos_detalle_tipo_relacion_ck", sql`(${tabla.tipo} = 'PRODUCTO' AND ${tabla.productoId} IS NOT NULL AND ${tabla.presentacionId} IS NOT NULL AND ${tabla.factorAUnidadBase} > 0 AND ${tabla.cantidadBase} > 0) OR (${tabla.tipo} = 'SERVICIO' AND ${tabla.productoId} IS NULL AND ${tabla.presentacionId} IS NULL)`),
  check("ingresos_detalle_cantidad_positiva_ck", sql`${tabla.cantidad} > 0`),
  check("ingresos_detalle_precio_no_negativo_ck", sql`${tabla.precioUnitario} >= 0`),
  check("ingresos_detalle_descuento_valido_ck", sql`${tabla.descuento} >= 0 AND ${tabla.descuento} <= round(${tabla.cantidad} * ${tabla.precioUnitario}, 2)`),
  check("ingresos_detalle_totales_no_negativos_ck", sql`${tabla.subtotal} >= 0 AND ${tabla.igv} >= 0 AND ${tabla.total} >= 0`),
]);

export const ingresosPagos = pgTable("ingresos_pagos", {
  id: uuid("id").defaultRandom().primaryKey(),
  ingresoId: uuid("ingreso_id").notNull().references(() => ingresos.id, { onDelete: "restrict" }),
  fechaPago: date("fecha_pago").notNull(),
  importeAplicado: numeric("importe_aplicado", { precision: 14, scale: 2 }).notNull(),
  esPagoInicial: boolean("es_pago_inicial").notNull().default(false),
  importeRecibido: numeric("importe_recibido", { precision: 14, scale: 2 }).notNull(),
  medioPago: varchar("medio_pago", { length: 30 }).notNull(),
  referenciaPago: varchar("referencia_pago", { length: 120 }),
  observacion: varchar("observacion", { length: 500 }),
  usuarioId: uuid("usuario_id").notNull().references(() => usuarios.id, { onDelete: "restrict" }),
  claveIdempotencia: varchar("clave_idempotencia", { length: 36 }).notNull(),
  creadoEn: fechaCreacion(),
}, (tabla) => [
  index("ingresos_pagos_ingreso_fecha_idx").on(tabla.ingresoId, tabla.fechaPago),
  uniqueIndex("ingresos_pagos_pago_inicial_unico").on(tabla.ingresoId).where(sql`${tabla.esPagoInicial}`),
  uniqueIndex("ingresos_pagos_idempotencia_unico").on(tabla.claveIdempotencia),
  check("ingresos_pagos_importes_ck", sql`${tabla.importeAplicado} > 0 AND ${tabla.importeRecibido} >= 0`),
  check("ingresos_pagos_medio_ck", sql`${tabla.medioPago} IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')`),
]);

export const nubefactCorrelativos = pgTable("nubefact_correlativos", {
  ambiente: varchar("ambiente", { length: 12 }).notNull().default("DEMO"),
  serie: varchar("serie", { length: 4 }).notNull(),
  tipoComprobante: integer("tipo_comprobante").notNull().default(1),
  ultimoNumero: integer("ultimo_numero").notNull().default(0),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  primaryKey({ columns: [tabla.ambiente, tabla.serie, tabla.tipoComprobante] }),
  check("nubefact_correlativos_ambiente_ck", sql`${tabla.ambiente} IN ('DEMO', 'PRODUCCION')`),
  check("nubefact_correlativos_tipo_ck", sql`${tabla.tipoComprobante} IN (1, 2, 3, 4, 5, 6)`),
  check("nubefact_correlativos_numero_ck", sql`${tabla.ultimoNumero} >= 0`),
]);

export const configuracionEmisorFacturacion = pgTable("configuracion_emisor_facturacion", {
  codigo: varchar("codigo", { length: 20 }).primaryKey().default("PRINCIPAL"),
  ruc: varchar("ruc", { length: 11 }).notNull(),
  razonSocial: varchar("razon_social", { length: 180 }).notNull(),
  nombreComercial: varchar("nombre_comercial", { length: 180 }),
  domicilioFiscal: varchar("domicilio_fiscal", { length: 240 }).notNull(),
  ubigeo: varchar("ubigeo", { length: 6 }),
  urbanizacion: varchar("urbanizacion", { length: 100 }),
  distrito: varchar("distrito", { length: 100 }),
  provincia: varchar("provincia", { length: 100 }),
  departamento: varchar("departamento", { length: 100 }),
  correo: varchar("correo", { length: 254 }),
  telefono: varchar("telefono", { length: 30 }),
  logoUrl: text("logo_url"),
  actualizadoPorUsuarioId: uuid("actualizado_por_usuario_id").references(() => usuarios.id, { onDelete: "set null" }),
  creadoEn: fechaCreacion(),
  actualizadoEn: fechaActualizacion(),
}, (tabla) => [
  check("configuracion_emisor_codigo_ck", sql`${tabla.codigo} = 'PRINCIPAL'`),
  check("configuracion_emisor_ruc_ck", sql`${tabla.ruc} ~ '^[0-9]{11}$'`),
]);

