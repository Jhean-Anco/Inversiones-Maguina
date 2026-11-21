ALTER TABLE "compras_mototaxis" DROP CONSTRAINT "compras_mototaxis_documento_tipo_ck";--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "clave_idempotencia" uuid;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD COLUMN "huella_solicitud" varchar(64);--> statement-breakpoint
CREATE UNIQUE INDEX "compras_mototaxis_idempotencia_unica" ON "compras_mototaxis" USING btree ("clave_idempotencia") WHERE "compras_mototaxis"."clave_idempotencia" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_documento_tipo_ck" CHECK ("compras_mototaxis"."documento_tipo" IN ('FACTURA', 'BOLETA', 'NOTA', 'OTRO', 'SIN_DOCUMENTO'));