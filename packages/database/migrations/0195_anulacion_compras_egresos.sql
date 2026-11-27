ALTER TABLE "movimientos_modelos_mototaxis" DROP CONSTRAINT "movimientos_modelos_mototaxis_tipo_ck";--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "estado" varchar(12) DEFAULT 'REGISTRADA' NOT NULL;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "estado" varchar(12) DEFAULT 'REGISTRADO' NOT NULL;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "estado" varchar(12) DEFAULT 'REGISTRADA' NOT NULL;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "clave_idempotencia" uuid;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "huella_solicitud" varchar(64);--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "anulado_en" timestamp (3) with time zone;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "anulado_por_usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "motivo_anulacion" text;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD CONSTRAINT "egresos_pagos_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD CONSTRAINT "pagos_compras_mototaxis_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_anulado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("anulado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entradas_stock_idempotencia_unica" ON "entradas_stock" USING btree ("clave_idempotencia") WHERE "entradas_stock"."clave_idempotencia" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_estado_ck" CHECK ("compras_mototaxis"."estado" IN ('REGISTRADA', 'ANULADA'));--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_anulacion_ck" CHECK (("compras_mototaxis"."estado" = 'ANULADA' AND "compras_mototaxis"."anulado_en" IS NOT NULL AND "compras_mototaxis"."anulado_por_usuario_id" IS NOT NULL AND "compras_mototaxis"."motivo_anulacion" IS NOT NULL) OR ("compras_mototaxis"."estado" = 'REGISTRADA' AND "compras_mototaxis"."anulado_en" IS NULL));--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD CONSTRAINT "egresos_pagos_anulacion_ck" CHECK (("egresos_pagos"."anulado_en" IS NULL) = ("egresos_pagos"."anulado_por_usuario_id" IS NULL));--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_estado_ck" CHECK ("egresos_registros"."estado" IN ('REGISTRADO', 'ANULADO'));--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_anulacion_ck" CHECK (("egresos_registros"."estado" = 'ANULADO' AND "egresos_registros"."anulado_en" IS NOT NULL AND "egresos_registros"."anulado_por_usuario_id" IS NOT NULL AND "egresos_registros"."motivo_anulacion" IS NOT NULL) OR ("egresos_registros"."estado" = 'REGISTRADO' AND "egresos_registros"."anulado_en" IS NULL));--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_estado_ck" CHECK ("entradas_stock"."estado" IN ('REGISTRADA', 'ANULADA'));--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_anulacion_ck" CHECK (("entradas_stock"."estado" = 'ANULADA' AND "entradas_stock"."anulado_en" IS NOT NULL AND "entradas_stock"."anulado_por_usuario_id" IS NOT NULL AND "entradas_stock"."motivo_anulacion" IS NOT NULL) OR ("entradas_stock"."estado" = 'REGISTRADA' AND "entradas_stock"."anulado_en" IS NULL));--> statement-breakpoint
ALTER TABLE "movimientos_modelos_mototaxis" ADD CONSTRAINT "movimientos_modelos_mototaxis_tipo_ck" CHECK ("movimientos_modelos_mototaxis"."tipo" IN ('COMPRA', 'VENTA', 'AJUSTE', 'ANULACION_VENTA', 'ANULACION_COMPRA'));--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD CONSTRAINT "pagos_compras_mototaxis_anulacion_ck" CHECK (("pagos_compras_mototaxis"."anulado_en" IS NULL) = ("pagos_compras_mototaxis"."anulado_por_usuario_id" IS NULL));--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_anulacion_ck" CHECK (("pagos_entradas_stock"."anulado_en" IS NULL) = ("pagos_entradas_stock"."anulado_por_usuario_id" IS NULL));--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('INVENTARIO.ANULAR', 'INVENTARIO', 'ANULAR', 'Anular compras de repuestos revirtiendo su pago y su ingreso al inventario.'),
  ('MOTOTAXIS.ANULAR', 'MOTOTAXIS', 'ANULAR', 'Anular compras de mototaxis revirtiendo su pago, sus existencias y sus garantias.'),
  ('EGRESOS.ANULAR', 'EGRESOS', 'ANULAR', 'Anular egresos o pagos de egresos revirtiendo su efecto en caja y cuentas.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id" FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" IN ('ADMINISTRADOR', 'GERENTE') AND permiso."codigo" IN ('INVENTARIO.ANULAR', 'MOTOTAXIS.ANULAR', 'EGRESOS.ANULAR')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
