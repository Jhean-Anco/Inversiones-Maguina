ALTER TABLE "reglas_tributarias" DROP CONSTRAINT "reglas_tributarias_tasas_ck";--> statement-breakpoint
ALTER TABLE "reglas_tributarias" ADD COLUMN "tasa_spot_044" numeric(5, 2) DEFAULT '12.00' NOT NULL;--> statement-breakpoint
UPDATE "reglas_tributarias" SET "tasa_spot_044" = CASE WHEN "vigente_desde" >= DATE '2025-04-01' THEN 12.00 ELSE 0.00 END;--> statement-breakpoint
ALTER TABLE "reglas_tributarias" ADD CONSTRAINT "reglas_tributarias_tasas_ck" CHECK ("reglas_tributarias"."tasa_igv" >= 0 AND "reglas_tributarias"."tasa_igv" <= 100 AND "reglas_tributarias"."tasa_spot_020" >= 0 AND "reglas_tributarias"."tasa_spot_037" >= 0 AND "reglas_tributarias"."tasa_spot_044" >= 0 AND "reglas_tributarias"."tasa_spot_044" <= 100 AND "reglas_tributarias"."tasa_retencion" >= 0);
