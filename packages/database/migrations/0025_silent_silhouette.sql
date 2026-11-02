ALTER TABLE "ingresos" ADD COLUMN "clave_idempotencia" varchar(36);--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "huella_solicitud" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "ingresos_clave_idempotencia_unico" ON "ingresos" USING btree ("clave_idempotencia") WHERE "ingresos"."clave_idempotencia" IS NOT NULL;