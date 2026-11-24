CREATE TABLE IF NOT EXISTS "garantias_modelos_mototaxis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "modelo_id" uuid NOT NULL,
  "activa" boolean DEFAULT true NOT NULL,
  "meses_vigencia" integer NOT NULL,
  "alcance" text NOT NULL,
  "exclusiones" text,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  "actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "garantias_modelos_mototaxis_modelo_id_modelos_mototaxis_id_fk" FOREIGN KEY ("modelo_id") REFERENCES "public"."modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "garantias_modelos_mototaxis_meses_ck" CHECK ("meses_vigencia" BETWEEN 1 AND 120),
  CONSTRAINT "garantias_modelos_mototaxis_alcance_ck" CHECK (length(trim("alcance")) BETWEEN 3 AND 4000),
  CONSTRAINT "garantias_modelos_mototaxis_exclusiones_ck" CHECK ("exclusiones" IS NULL OR length("exclusiones") <= 4000)
);
CREATE UNIQUE INDEX IF NOT EXISTS "garantias_modelos_mototaxis_modelo_unico" ON "garantias_modelos_mototaxis" USING btree ("modelo_id");

CREATE TABLE IF NOT EXISTS "garantias_ventas_mototaxis" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ingreso_detalle_id" uuid NOT NULL,
  "garantia_modelo_id" uuid NOT NULL,
  "cantidad" integer NOT NULL,
  "meses_vigencia" integer NOT NULL,
  "inicia_en" date NOT NULL,
  "termina_en" date NOT NULL,
  "alcance" text NOT NULL,
  "exclusiones" text,
  "creado_en" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "garantias_ventas_mototaxis_ingreso_detalle_id_ingresos_detalle_id_fk" FOREIGN KEY ("ingreso_detalle_id") REFERENCES "public"."ingresos_detalle"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "garantias_ventas_mototaxis_garantia_modelo_id_garantias_modelos_mototaxis_id_fk" FOREIGN KEY ("garantia_modelo_id") REFERENCES "public"."garantias_modelos_mototaxis"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "garantias_ventas_mototaxis_cantidad_ck" CHECK ("cantidad" > 0),
  CONSTRAINT "garantias_ventas_mototaxis_meses_ck" CHECK ("meses_vigencia" BETWEEN 1 AND 120),
  CONSTRAINT "garantias_ventas_mototaxis_fechas_ck" CHECK ("termina_en" >= "inicia_en")
);
CREATE UNIQUE INDEX IF NOT EXISTS "garantias_ventas_mototaxis_detalle_unico" ON "garantias_ventas_mototaxis" USING btree ("ingreso_detalle_id");
CREATE INDEX IF NOT EXISTS "garantias_ventas_mototaxis_fin_idx" ON "garantias_ventas_mototaxis" USING btree ("termina_en");
