CREATE TABLE "reglas_tributarias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vigente_desde" date NOT NULL,
	"vigente_hasta" date,
	"tasa_igv" numeric(5, 2) NOT NULL,
	"umbral_spot" numeric(14, 2) NOT NULL,
	"tasa_spot_020" numeric(5, 2) NOT NULL,
	"tasa_spot_037" numeric(5, 2) NOT NULL,
	"umbral_retencion" numeric(14, 2) NOT NULL,
	"tasa_retencion" numeric(5, 2) NOT NULL,
	"tasas_percepcion" jsonb NOT NULL,
	"fuente_normativa" varchar(1000) NOT NULL,
	"usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reglas_tributarias_vigencia_ck" CHECK ("reglas_tributarias"."vigente_hasta" IS NULL OR "reglas_tributarias"."vigente_hasta" >= "reglas_tributarias"."vigente_desde"),
	CONSTRAINT "reglas_tributarias_tasas_ck" CHECK ("reglas_tributarias"."tasa_igv" >= 0 AND "reglas_tributarias"."tasa_igv" <= 100 AND "reglas_tributarias"."tasa_spot_020" >= 0 AND "reglas_tributarias"."tasa_spot_037" >= 0 AND "reglas_tributarias"."tasa_retencion" >= 0),
	CONSTRAINT "reglas_tributarias_umbrales_ck" CHECK ("reglas_tributarias"."umbral_spot" >= 0 AND "reglas_tributarias"."umbral_retencion" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "tasa_igv" numeric(5, 2) DEFAULT '18.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "cliente_agente_percepcion" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reglas_tributarias" ADD CONSTRAINT "reglas_tributarias_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reglas_tributarias_vigente_desde_uq" ON "reglas_tributarias" USING btree ("vigente_desde");--> statement-breakpoint
CREATE INDEX "reglas_tributarias_vigencia_idx" ON "reglas_tributarias" USING btree ("vigente_desde","vigente_hasta");--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_tasa_igv_ck" CHECK ("ingresos"."tasa_igv" >= 0 AND "ingresos"."tasa_igv" <= 100);--> statement-breakpoint
INSERT INTO "reglas_tributarias" ("vigente_desde", "tasa_igv", "umbral_spot", "tasa_spot_020", "tasa_spot_037", "umbral_retencion", "tasa_retencion", "tasas_percepcion", "fuente_normativa")
VALUES (
  '2026-01-01', 18.00, 700.00, 12.00, 12.00, 700.00, 3.00, '[0.5, 2]'::jsonb,
  'https://emprender.sunat.gob.pe/principales-impuestos/impuesto-general-las-ventas-igv/impuesto-general-las-ventas; https://emprender.sunat.gob.pe/principales-impuestos/impuesto-general-las-ventas-igv/regimen-retencion-igv; https://orientacion.sunat.gob.pe/02-regimen-de-percepciones-venta-interna; https://orientacion.sunat.gob.pe/sites/default/files/inline-files/Cartilla_detracciones.pdf'
);