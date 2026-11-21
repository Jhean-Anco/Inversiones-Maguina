CREATE TABLE "movimientos_modelos_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"tipo" varchar(24) NOT NULL,
	"origen_id" uuid NOT NULL,
	"cantidad_anterior" integer NOT NULL,
	"cantidad_final" integer NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_modelos_mototaxis_tipo_ck" CHECK ("movimientos_modelos_mototaxis"."tipo" IN ('COMPRA', 'VENTA', 'AJUSTE', 'ANULACION_VENTA')),
	CONSTRAINT "movimientos_modelos_mototaxis_saldo_ck" CHECK ("movimientos_modelos_mototaxis"."cantidad_anterior" >= 0 AND "movimientos_modelos_mototaxis"."cantidad_final" >= 0)
);
--> statement-breakpoint
CREATE TABLE "precios_modelos_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"modelo_id" uuid NOT NULL,
	"precio" numeric(14, 2) NOT NULL,
	"vigente_desde" timestamp (3) with time zone NOT NULL,
	"vigente_hasta" timestamp (3) with time zone,
	"usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "precios_modelos_mototaxis_importe_ck" CHECK ("precios_modelos_mototaxis"."precio" > 0),
	CONSTRAINT "precios_modelos_mototaxis_vigencia_ck" CHECK ("precios_modelos_mototaxis"."vigente_hasta" IS NULL OR "precios_modelos_mototaxis"."vigente_hasta" > "precios_modelos_mototaxis"."vigente_desde")
);
--> statement-breakpoint
ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_tipo_relacion_ck";--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD COLUMN "mototaxi_modelo_id" uuid;--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" ADD COLUMN "stock_disponible" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD COLUMN "saldo_anterior" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD COLUMN "saldo_final" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "precios_productos" ADD COLUMN "usuario_id" uuid;--> statement-breakpoint
ALTER TABLE "movimientos_modelos_mototaxis" ADD CONSTRAINT "movimientos_modelos_mototaxis_modelo_id_modelos_mototaxis_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_modelos_mototaxis" ADD CONSTRAINT "movimientos_modelos_mototaxis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios_modelos_mototaxis" ADD CONSTRAINT "precios_modelos_mototaxis_modelo_id_modelos_mototaxis_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios_modelos_mototaxis" ADD CONSTRAINT "precios_modelos_mototaxis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_modelos_mototaxis_origen_unico" ON "movimientos_modelos_mototaxis" USING btree ("tipo","origen_id");--> statement-breakpoint
CREATE INDEX "movimientos_modelos_mototaxis_modelo_fecha_idx" ON "movimientos_modelos_mototaxis" USING btree ("modelo_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "precios_modelos_mototaxis_inicio_unico" ON "precios_modelos_mototaxis" USING btree ("modelo_id","vigente_desde");--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_mototaxi_modelo_id_modelos_mototaxis_id_fk" FOREIGN KEY ("mototaxi_modelo_id") REFERENCES "public"."modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingresos_detalle_mototaxi_modelo_idx" ON "ingresos_detalle" USING btree ("mototaxi_modelo_id");--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_tipo_relacion_ck" CHECK (("ingresos_detalle"."tipo" = 'PRODUCTO' AND "ingresos_detalle"."producto_id" IS NOT NULL AND "ingresos_detalle"."presentacion_id" IS NOT NULL AND "ingresos_detalle"."mototaxi_unidad_id" IS NULL AND "ingresos_detalle"."mototaxi_modelo_id" IS NULL AND "ingresos_detalle"."factor_a_unidad_base" > 0 AND "ingresos_detalle"."cantidad_base" > 0) OR ("ingresos_detalle"."tipo" = 'SERVICIO' AND "ingresos_detalle"."producto_id" IS NULL AND "ingresos_detalle"."presentacion_id" IS NULL AND "ingresos_detalle"."mototaxi_unidad_id" IS NULL AND "ingresos_detalle"."mototaxi_modelo_id" IS NULL) OR ("ingresos_detalle"."tipo" = 'MOTOTAXI' AND "ingresos_detalle"."producto_id" IS NULL AND "ingresos_detalle"."presentacion_id" IS NULL AND (("ingresos_detalle"."mototaxi_unidad_id" IS NOT NULL AND "ingresos_detalle"."cantidad" = 1) OR ("ingresos_detalle"."mototaxi_unidad_id" IS NULL AND "ingresos_detalle"."mototaxi_modelo_id" IS NOT NULL AND "ingresos_detalle"."cantidad" = trunc("ingresos_detalle"."cantidad")))));--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" ADD CONSTRAINT "modelos_mototaxis_stock_ck" CHECK ("modelos_mototaxis"."stock_disponible" >= 0);--> statement-breakpoint
UPDATE "modelos_mototaxis" AS modelo
SET "stock_disponible" = saldo.cantidad
FROM (
  SELECT "modelo_id", count(*)::integer AS cantidad
  FROM "unidades_mototaxis"
  WHERE "estado" = 'DISPONIBLE'
  GROUP BY "modelo_id"
) AS saldo
WHERE modelo."id" = saldo."modelo_id";--> statement-breakpoint
INSERT INTO "precios_modelos_mototaxis" ("modelo_id", "precio", "vigente_desde")
SELECT "id", "precio_venta", now()
FROM "modelos_mototaxis"
WHERE "precio_venta" IS NOT NULL;--> statement-breakpoint
UPDATE "ingresos_detalle" AS detalle
SET "mototaxi_modelo_id" = unidad."modelo_id"
FROM "unidades_mototaxis" AS unidad
WHERE detalle."tipo" = 'MOTOTAXI' AND detalle."mototaxi_unidad_id" = unidad."id";
