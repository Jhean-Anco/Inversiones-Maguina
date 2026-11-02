ALTER TABLE "ingresos_detalle" ADD COLUMN "sujeto_percepcion_combustible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "cliente_no_excluido_percepcion_combustible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "sujeto_percepcion_combustible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_percepcion_regimen_ck" CHECK (NOT ("productos"."sujeto_percepcion_igv" AND "productos"."sujeto_percepcion_combustible") AND (NOT "productos"."sujeto_percepcion_combustible" OR ("productos"."afectacion_igv" = 'GRAVADO' AND "productos"."sujeto_percepcion_numero_apendice" IS NULL AND "productos"."sujeto_percepcion_subpartida" ~ '^\d{10}$' AND "productos"."sujeto_percepcion_fuente" IS NOT NULL AND "productos"."sujeto_percepcion_fecha_verificacion" IS NOT NULL)));
--> statement-breakpoint
UPDATE "reglas_tributarias"
SET "tasas_percepcion" = '[0.5, 1, 2]'::jsonb,
    "fuente_normativa" = CASE
      WHEN "fuente_normativa" LIKE '%https://orientacion.sunat.gob.pe/04-regimen-de-percepciones-venta-de-combustible%'
        THEN "fuente_normativa"
      ELSE LEFT("fuente_normativa" || '; 1% para venta de combustibles líquidos derivados del petróleo, excepto GLP: https://orientacion.sunat.gob.pe/04-regimen-de-percepciones-venta-de-combustible', 1000)
    END
WHERE "vigente_desde" >= DATE '2026-01-01';
