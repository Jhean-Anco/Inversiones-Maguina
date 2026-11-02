ALTER TABLE "ingresos" ADD COLUMN "ruc_emisor" varchar(11);--> statement-breakpoint
UPDATE "ingresos"
SET "ruc_emisor" = "perfil_fiscal_snapshot"->>'ruc'
WHERE "perfil_fiscal_snapshot"->>'ruc' ~ '^[0-9]{11}$';--> statement-breakpoint
CREATE INDEX "ingresos_ruc_emisor_fecha_idx" ON "ingresos" USING btree ("ruc_emisor","fecha");--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_ruc_emisor_ck" CHECK ("ingresos"."ruc_emisor" IS NULL OR "ingresos"."ruc_emisor" ~ '^[0-9]{11}$');
