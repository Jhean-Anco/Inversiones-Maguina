CREATE TABLE IF NOT EXISTS "guias_remision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tipo" varchar(20) NOT NULL,
  "fecha" date NOT NULL,
  "ambiente" varchar(20) NOT NULL,
  "serie" varchar(4) NOT NULL,
  "numero" integer NOT NULL,
  "estado" varchar(30) DEFAULT 'NUBEFACT_PENDIENTE' NOT NULL,
  "datos_nubefact" jsonb,
  "usuario_id" uuid NOT NULL,
  "creado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "guias_remision_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "guias_remision_tipo_ck" CHECK ("guias_remision"."tipo" IN ('REMITENTE', 'TRANSPORTISTA')),
  CONSTRAINT "guias_remision_ambiente_ck" CHECK ("guias_remision"."ambiente" IN ('DEMO', 'PRODUCCION')),
  CONSTRAINT "guias_remision_numero_ck" CHECK ("guias_remision"."numero" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guias_remision_fecha_idx" ON "guias_remision" USING btree ("fecha");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "guias_remision_tipo_estado_idx" ON "guias_remision" USING btree ("tipo", "estado");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "guias_remision_correlativo_unico" ON "guias_remision" USING btree ("ambiente", "tipo", "serie", "numero");
