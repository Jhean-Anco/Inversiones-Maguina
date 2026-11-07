ALTER TABLE "unidades_mototaxis" ALTER COLUMN "compra_detalle_id" DROP NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ajustes_inventario_mototaxis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "codigo" varchar(40) NOT NULL,
  "modelo_id" uuid NOT NULL,
  "cantidad_sistema" integer NOT NULL,
  "cantidad_contada" integer NOT NULL,
  "motivo" varchar(120) NOT NULL,
  "observacion" text,
  "usuario_id" uuid NOT NULL,
  "creado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ajustes_inventario_mototaxis_modelo_id_modelos_mototaxis_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "ajustes_inventario_mototaxis_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "ajustes_inventario_mototaxis_codigo_unique" UNIQUE ("codigo"),
  CONSTRAINT "ajustes_inventario_mototaxis_cantidades_ck" CHECK ("cantidad_sistema" >= 0 AND "cantidad_contada" >= 0),
  CONSTRAINT "ajustes_inventario_mototaxis_motivo_ck" CHECK (length(trim("motivo")) BETWEEN 2 AND 120)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ajustes_inventario_mototaxis_modelo_fecha_idx" ON "ajustes_inventario_mototaxis" USING btree ("modelo_id", "creado_en");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ajustes_inventario_mototaxis_detalle" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ajuste_id" uuid NOT NULL,
  "unidad_id" uuid NOT NULL,
  "tipo" varchar(16) NOT NULL,
  "creado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "ajustes_inventario_mototaxis_detalle_ajuste_id_ajustes_inventario_mototaxis_id_fk" FOREIGN KEY ("ajuste_id") REFERENCES "ajustes_inventario_mototaxis"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "ajustes_inventario_mototaxis_detalle_unidad_id_unidades_mototaxis_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "unidades_mototaxis"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "ajustes_inventario_mototaxis_detalle_tipo_ck" CHECK ("tipo" IN ('NUEVA', 'FALTANTE', 'RECUPERADA'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ajustes_inventario_mototaxis_detalle_unico" ON "ajustes_inventario_mototaxis_detalle" USING btree ("ajuste_id", "unidad_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ajustes_inventario_mototaxis_detalle_unidad_idx" ON "ajustes_inventario_mototaxis_detalle" USING btree ("unidad_id", "creado_en");
--> statement-breakpoint
ALTER TABLE "unidades_mototaxis" DROP CONSTRAINT "unidades_mototaxis_estado_ck";
--> statement-breakpoint
ALTER TABLE "unidades_mototaxis" ADD CONSTRAINT "unidades_mototaxis_estado_ck" CHECK ("estado" IN ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'GARANTIA', 'USO_INTERNO', 'BAJA', 'FALTANTE'));
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis" DROP CONSTRAINT "movimientos_mototaxis_estado_ck";
--> statement-breakpoint
ALTER TABLE "movimientos_mototaxis" ADD CONSTRAINT "movimientos_mototaxis_estado_ck" CHECK ("estado_nuevo" IN ('DISPONIBLE', 'RESERVADA', 'VENDIDA', 'GARANTIA', 'USO_INTERNO', 'BAJA', 'FALTANTE'));
