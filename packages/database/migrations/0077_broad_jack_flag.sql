ALTER TABLE "egresos_registros" ADD COLUMN "ruc_emisor" varchar(11);--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "ruc_emisor" varchar(11);--> statement-breakpoint
CREATE INDEX "egresos_registros_ruc_emisor_fecha_idx" ON "egresos_registros" USING btree ("ruc_emisor","fecha");--> statement-breakpoint
CREATE INDEX "entradas_stock_ruc_emisor_fecha_idx" ON "entradas_stock" USING btree ("ruc_emisor","fecha");--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_ruc_emisor_ck" CHECK ("egresos_registros"."ruc_emisor" IS NULL OR "egresos_registros"."ruc_emisor" ~ '^[0-9]{11}$');--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_ruc_emisor_ck" CHECK ("entradas_stock"."ruc_emisor" IS NULL OR "entradas_stock"."ruc_emisor" ~ '^[0-9]{11}$');