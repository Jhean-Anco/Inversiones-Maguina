ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "regimen_tributario" varchar(12);--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "actividad_economica_ciiu" varchar(8);--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "agente_retencion_igv" boolean;--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "agente_percepcion_igv" boolean;--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "cuenta_detracciones" varchar(20);--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD CONSTRAINT "configuracion_emisor_regimen_ck" CHECK ("configuracion_emisor_facturacion"."regimen_tributario" IS NULL OR "configuracion_emisor_facturacion"."regimen_tributario" IN ('NRUS', 'RER', 'RMT', 'GENERAL'));--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD CONSTRAINT "configuracion_emisor_ciiu_ck" CHECK ("configuracion_emisor_facturacion"."actividad_economica_ciiu" IS NULL OR "configuracion_emisor_facturacion"."actividad_economica_ciiu" ~ '^[0-9]{4,6}$');