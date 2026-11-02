ALTER TABLE "egresos_registros" ADD COLUMN "proveedor_ruc" varchar(11);--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "datos_tributarios_compra" jsonb;--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_proveedor_ruc_ck" CHECK ("egresos_registros"."proveedor_ruc" IS NULL OR "egresos_registros"."proveedor_ruc" ~ '^[0-9]{11}$');