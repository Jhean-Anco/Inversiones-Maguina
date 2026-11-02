CREATE TABLE "compras_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"proveedor_persona_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"documento_tipo" varchar(20) NOT NULL,
	"documento_numero" varchar(80),
	"moneda" varchar(3) DEFAULT 'PEN' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"observacion" text,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compras_mototaxis_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "compras_mototaxis_documento_tipo_ck" CHECK ("compras_mototaxis"."documento_tipo" IN ('FACTURA', 'BOLETA', 'NOTA', 'OTRO')),
	CONSTRAINT "compras_mototaxis_moneda_ck" CHECK ("compras_mototaxis"."moneda" IN ('PEN', 'USD', 'EUR')),
	CONSTRAINT "compras_mototaxis_total_ck" CHECK ("compras_mototaxis"."total" > 0)
);
--> statement-breakpoint
CREATE TABLE "compras_mototaxis_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"modelo_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"cantidad" integer NOT NULL,
	"costo_unitario" numeric(14, 2) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "compras_mototaxis_detalle_cantidad_ck" CHECK ("compras_mototaxis_detalle"."cantidad" > 0),
	CONSTRAINT "compras_mototaxis_detalle_costo_ck" CHECK ("compras_mototaxis_detalle"."costo_unitario" > 0)
);
--> statement-breakpoint
CREATE TABLE "garantias_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidad_id" uuid NOT NULL,
	"proveedor_persona_id" uuid NOT NULL,
	"porcentaje_proveedor" numeric(5, 2) NOT NULL,
	"meses_vigencia" integer NOT NULL,
	"inicia_en" date NOT NULL,
	"termina_en" date NOT NULL,
	"alcance" text,
	"exclusiones" text,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "garantias_mototaxis_porcentaje_ck" CHECK ("garantias_mototaxis"."porcentaje_proveedor" IN (70, 80)),
	CONSTRAINT "garantias_mototaxis_meses_ck" CHECK ("garantias_mototaxis"."meses_vigencia" BETWEEN 1 AND 120),
	CONSTRAINT "garantias_mototaxis_fechas_ck" CHECK ("garantias_mototaxis"."termina_en" >= "garantias_mototaxis"."inicia_en")
);
--> statement-breakpoint
CREATE TABLE "marcas_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelos_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"marca_id" uuid NOT NULL,
	"nombre" varchar(120) NOT NULL,
	"version" varchar(80),
	"categoria_vehicular" varchar(10) DEFAULT 'L5' NOT NULL,
	"fabricante" varchar(160),
	"pais_fabricacion" varchar(100),
	"marca_motor" varchar(100),
	"modelo_motor" varchar(100),
	"cilindrada_cc" integer,
	"combustible" varchar(40),
	"transmision" varchar(60),
	"carroceria" varchar(80),
	"capacidad_asientos" integer,
	"capacidad_carga_kg" numeric(10, 2),
	"especificaciones_adicionales" text,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modelos_mototaxis_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "modelos_mototaxis_categoria_ck" CHECK ("modelos_mototaxis"."categoria_vehicular" IN ('L1', 'L2', 'L3', 'L4', 'L5')),
	CONSTRAINT "modelos_mototaxis_cilindrada_ck" CHECK ("modelos_mototaxis"."cilindrada_cc" IS NULL OR "modelos_mototaxis"."cilindrada_cc" > 0),
	CONSTRAINT "modelos_mototaxis_capacidades_ck" CHECK (("modelos_mototaxis"."capacidad_asientos" IS NULL OR "modelos_mototaxis"."capacidad_asientos" > 0) AND ("modelos_mototaxis"."capacidad_carga_kg" IS NULL OR "modelos_mototaxis"."capacidad_carga_kg" > 0))
);
--> statement-breakpoint
CREATE TABLE "movimientos_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidad_id" uuid NOT NULL,
	"tipo" varchar(24) NOT NULL,
	"estado_anterior" varchar(24),
	"estado_nuevo" varchar(24) NOT NULL,
	"motivo" varchar(40) NOT NULL,
	"observacion" text,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_mototaxis_tipo_ck" CHECK ("movimientos_mototaxis"."tipo" IN ('RECEPCION', 'VENTA', 'RESERVA', 'AJUSTE', 'GARANTIA', 'DEVOLUCION', 'BAJA')),
	CONSTRAINT "movimientos_mototaxis_estado_ck" CHECK ("movimientos_mototaxis"."estado_nuevo" IN ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'GARANTIA', 'USO_INTERNO', 'BAJA'))
);
--> statement-breakpoint
CREATE TABLE "movimientos_mototaxis_ventas" (
	"movimiento_id" uuid PRIMARY KEY NOT NULL,
	"venta_detalle_id" uuid NOT NULL,
	CONSTRAINT "movimientos_mototaxis_ventas_venta_detalle_id_unique" UNIQUE("venta_detalle_id")
);
--> statement-breakpoint
CREATE TABLE "pagos_compras_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"compra_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"importe_pagado" numeric(14, 2) NOT NULL,
	"medio_pago" varchar(30) NOT NULL,
	"clave_idempotencia" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_compras_mototaxis_clave_idempotencia_unique" UNIQUE("clave_idempotencia"),
	CONSTRAINT "pagos_compras_mototaxis_importe_ck" CHECK ("pagos_compras_mototaxis"."importe_pagado" > 0),
	CONSTRAINT "pagos_compras_mototaxis_medio_ck" CHECK ("pagos_compras_mototaxis"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO'))
);
--> statement-breakpoint
CREATE TABLE "proveedores" (
	"persona_id" uuid PRIMARY KEY NOT NULL,
	"nombre_comercial" varchar(180),
	"activo" boolean DEFAULT true NOT NULL,
	"observacion" text,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reclamos_garantia_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"garantia_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"descripcion_falla" text NOT NULL,
	"costo_total" numeric(14, 2) NOT NULL,
	"porcentaje_proveedor_aplicado" numeric(5, 2) NOT NULL,
	"importe_proveedor" numeric(14, 2) NOT NULL,
	"importe_empresa" numeric(14, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'ABIERTO' NOT NULL,
	"resolucion" text,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reclamos_garantia_mototaxis_costos_ck" CHECK ("reclamos_garantia_mototaxis"."costo_total" >= 0 AND "reclamos_garantia_mototaxis"."importe_proveedor" >= 0 AND "reclamos_garantia_mototaxis"."importe_empresa" >= 0 AND "reclamos_garantia_mototaxis"."importe_proveedor" + "reclamos_garantia_mototaxis"."importe_empresa" = "reclamos_garantia_mototaxis"."costo_total"),
	CONSTRAINT "reclamos_garantia_mototaxis_porcentaje_ck" CHECK ("reclamos_garantia_mototaxis"."porcentaje_proveedor_aplicado" IN (70, 80)),
	CONSTRAINT "reclamos_garantia_mototaxis_estado_ck" CHECK ("reclamos_garantia_mototaxis"."estado" IN ('ABIERTO', 'ENVIADO', 'APROBADO', 'RECHAZADO', 'RESUELTO'))
);
--> statement-breakpoint
CREATE TABLE "unidades_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"compra_detalle_id" uuid NOT NULL,
	"modelo_id" uuid NOT NULL,
	"vin" varchar(40),
	"numero_motor" varchar(100),
	"numero_chasis" varchar(100),
	"anio_modelo" integer,
	"color" varchar(60),
	"placa" varchar(12),
	"estado" varchar(24) DEFAULT 'DISPONIBLE' NOT NULL,
	"costo_adquisicion" numeric(14, 2) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "unidades_mototaxis_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "unidades_mototaxis_estado_ck" CHECK ("unidades_mototaxis"."estado" IN ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'GARANTIA', 'USO_INTERNO', 'BAJA')),
	CONSTRAINT "unidades_mototaxis_costo_ck" CHECK ("unidades_mototaxis"."costo_adquisicion" > 0),
	CONSTRAINT "unidades_mototaxis_anio_ck" CHECK ("unidades_mototaxis"."anio_modelo" IS NULL OR "unidades_mototaxis"."anio_modelo" BETWEEN 1990 AND 2100)
);
--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados_detalle" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "declaraciones_igv_621" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "declaraciones_percepcion_697" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "declaraciones_retencion_626" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "dias_no_laborables_fiscales" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_igv_621" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_percepcion_697" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_retencion_626" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "evidencias_perfil_fiscal_emisor" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "historial_perfil_fiscal_emisor" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "igv_servicios_no_domiciliados" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "importaciones_propuesta_rce" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingresos_cobros_grupos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingresos_correlativos" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingresos_detracciones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ingresos_spot_rce_anotaciones" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "pagos_igv_servicios_no_domiciliados" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reglas_tributarias" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_proveedor_fk" FOREIGN KEY ("proveedor_persona_id") REFERENCES "proveedores"("persona_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "compras_mototaxis_detalle" ADD CONSTRAINT "compras_mototaxis_detalle_compra_fk" FOREIGN KEY ("compra_id") REFERENCES "compras_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "compras_mototaxis_detalle" ADD CONSTRAINT "compras_mototaxis_detalle_modelo_fk" FOREIGN KEY ("modelo_id") REFERENCES "modelos_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD CONSTRAINT "pagos_compras_mototaxis_compra_fk" FOREIGN KEY ("compra_id") REFERENCES "compras_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD CONSTRAINT "pagos_compras_mototaxis_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" ADD CONSTRAINT "modelos_mototaxis_marca_fk" FOREIGN KEY ("marca_id") REFERENCES "marcas_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "unidades_mototaxis" ADD CONSTRAINT "unidades_mototaxis_compra_detalle_fk" FOREIGN KEY ("compra_detalle_id") REFERENCES "compras_mototaxis_detalle"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "unidades_mototaxis" ADD CONSTRAINT "unidades_mototaxis_modelo_fk" FOREIGN KEY ("modelo_id") REFERENCES "modelos_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis" ADD CONSTRAINT "movimientos_mototaxis_unidad_fk" FOREIGN KEY ("unidad_id") REFERENCES "unidades_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis" ADD CONSTRAINT "movimientos_mototaxis_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" ADD CONSTRAINT "garantias_mototaxis_unidad_fk" FOREIGN KEY ("unidad_id") REFERENCES "unidades_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" ADD CONSTRAINT "garantias_mototaxis_proveedor_fk" FOREIGN KEY ("proveedor_persona_id") REFERENCES "proveedores"("persona_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "reclamos_garantia_mototaxis" ADD CONSTRAINT "reclamos_garantia_mototaxis_garantia_fk" FOREIGN KEY ("garantia_id") REFERENCES "garantias_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "reclamos_garantia_mototaxis" ADD CONSTRAINT "reclamos_garantia_mototaxis_usuario_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis_ventas" ADD CONSTRAINT "movimientos_mototaxis_ventas_movimiento_fk" FOREIGN KEY ("movimiento_id") REFERENCES "movimientos_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis_ventas" ADD CONSTRAINT "movimientos_mototaxis_ventas_detalle_fk" FOREIGN KEY ("venta_detalle_id") REFERENCES "ingresos_detalle"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "mototaxi_unidad_id" uuid;
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_mototaxi_fk" FOREIGN KEY ("mototaxi_unidad_id") REFERENCES "unidades_mototaxis"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_tipo_ck";
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_tipo_ck" CHECK ("tipo" IN ('PRODUCTO', 'SERVICIO', 'MOTOTAXI'));
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_tipo_relacion_ck";
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_tipo_relacion_ck" CHECK (("tipo" = 'PRODUCTO' AND "producto_id" IS NOT NULL AND "presentacion_id" IS NOT NULL AND "mototaxi_unidad_id" IS NULL AND "factor_a_unidad_base" > 0 AND "cantidad_base" > 0) OR ("tipo" = 'SERVICIO' AND "producto_id" IS NULL AND "presentacion_id" IS NULL AND "mototaxi_unidad_id" IS NULL) OR ("tipo" = 'MOTOTAXI' AND "producto_id" IS NULL AND "presentacion_id" IS NULL AND "mototaxi_unidad_id" IS NOT NULL AND "cantidad" = 1));
--> statement-breakpoint
CREATE UNIQUE INDEX "marcas_mototaxis_nombre_lower_unico" ON "marcas_mototaxis" (lower("nombre"));
--> statement-breakpoint
CREATE UNIQUE INDEX "modelos_mototaxis_marca_nombre_version_unico" ON "modelos_mototaxis" ("marca_id", lower("nombre"), coalesce(lower("version"),''));
--> statement-breakpoint
CREATE INDEX "modelos_mototaxis_marca_activo_idx" ON "modelos_mototaxis" ("marca_id", "activo");
--> statement-breakpoint
CREATE INDEX "compras_mototaxis_proveedor_fecha_idx" ON "compras_mototaxis" ("proveedor_persona_id", "fecha");
--> statement-breakpoint
CREATE INDEX "compras_mototaxis_fecha_idx" ON "compras_mototaxis" ("fecha");
--> statement-breakpoint
CREATE INDEX "compras_mototaxis_detalle_compra_idx" ON "compras_mototaxis_detalle" ("compra_id", "orden");
--> statement-breakpoint
CREATE INDEX "compras_mototaxis_detalle_modelo_idx" ON "compras_mototaxis_detalle" ("modelo_id");
--> statement-breakpoint
CREATE INDEX "pagos_compras_mototaxis_compra_fecha_idx" ON "pagos_compras_mototaxis" ("compra_id", "fecha_pago");
--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_mototaxis_vin_unico" ON "unidades_mototaxis" (upper("vin")) WHERE "vin" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_mototaxis_placa_unica" ON "unidades_mototaxis" (upper("placa")) WHERE "placa" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "unidades_mototaxis_modelo_estado_idx" ON "unidades_mototaxis" ("modelo_id", "estado");
--> statement-breakpoint
CREATE INDEX "unidades_mototaxis_motor_idx" ON "unidades_mototaxis" ("numero_motor");
--> statement-breakpoint
CREATE INDEX "unidades_mototaxis_chasis_idx" ON "unidades_mototaxis" ("numero_chasis");
--> statement-breakpoint
CREATE INDEX "movimientos_mototaxis_unidad_fecha_idx" ON "movimientos_mototaxis" ("unidad_id", "creado_en");
--> statement-breakpoint
CREATE UNIQUE INDEX "garantias_mototaxis_unidad_unica" ON "garantias_mototaxis" ("unidad_id");
--> statement-breakpoint
CREATE INDEX "garantias_mototaxis_proveedor_vigencia_idx" ON "garantias_mototaxis" ("proveedor_persona_id", "termina_en");
--> statement-breakpoint
CREATE INDEX "reclamos_garantia_mototaxis_estado_fecha_idx" ON "reclamos_garantia_mototaxis" ("estado", "fecha");
--> statement-breakpoint
CREATE INDEX "proveedores_activo_idx" ON "proveedores" ("activo");
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES ('MOTOTAXIS.LEER','MOTOTAXIS','LEER','Consultar el catálogo y las unidades de mototaxi.'), ('MOTOTAXIS.CREAR','MOTOTAXIS','CREAR','Registrar modelos, compras y garantías de mototaxi.'), ('MOTOTAXIS.EDITAR','MOTOTAXIS','EDITAR','Registrar ajustes del inventario de mototaxis.') ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id","permiso_id") SELECT r."id",p."id" FROM "roles" r CROSS JOIN "permisos" p WHERE (r."codigo" IN ('ADMINISTRADOR','GERENTE') AND p."modulo"='MOTOTAXIS') OR (r."codigo"='ALMACENERO' AND p."codigo" IN ('MOTOTAXIS.LEER','MOTOTAXIS.CREAR','MOTOTAXIS.EDITAR')) ON CONFLICT ("rol_id","permiso_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "proveedores" ADD CONSTRAINT "proveedores_persona_fk" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "compras_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "compras_mototaxis_detalle" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "garantias_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marcas_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis_ventas" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "proveedores" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "reclamos_garantia_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "unidades_mototaxis" DISABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_mototaxis_motor_unico" ON "unidades_mototaxis" (upper("numero_motor")) WHERE "numero_motor" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "unidades_mototaxis_chasis_unico" ON "unidades_mototaxis" (upper("numero_chasis")) WHERE "numero_chasis" IS NOT NULL;
