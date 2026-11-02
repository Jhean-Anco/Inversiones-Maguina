ALTER TABLE "ingresos" ADD COLUMN "cliente_sector_publico" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "cliente_sector_publico_fuente" varchar(240);--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "cliente_sector_publico_fecha_verificacion" date;--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_sector_publico_evidencia_ck" CHECK (NOT "ingresos"."cliente_sector_publico" OR ("ingresos"."cliente_sector_publico_fuente" IS NOT NULL AND "ingresos"."cliente_sector_publico_fecha_verificacion" IS NOT NULL));