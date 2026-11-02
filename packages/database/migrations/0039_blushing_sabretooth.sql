ALTER TABLE "ingresos_detalle" ADD COLUMN "afectacion_igv" varchar(20) DEFAULT 'GRAVADO' NOT NULL;--> statement-breakpoint
ALTER TABLE "productos" ADD COLUMN "afectacion_igv" varchar(20) DEFAULT 'GRAVADO' NOT NULL;--> statement-breakpoint
UPDATE "productos" SET "afectacion_igv" = CASE WHEN "afecto_igv" THEN 'GRAVADO' ELSE 'INAFECTO' END;--> statement-breakpoint
UPDATE "ingresos_detalle" SET "afectacion_igv" = CASE WHEN "afecto_igv" THEN 'GRAVADO' ELSE 'INAFECTO' END;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_afectacion_igv_ck" CHECK ("ingresos_detalle"."afectacion_igv" IN ('GRAVADO', 'EXONERADO', 'INAFECTO'));--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_afectacion_igv_ck" CHECK ("productos"."afectacion_igv" IN ('GRAVADO', 'EXONERADO', 'INAFECTO'));
