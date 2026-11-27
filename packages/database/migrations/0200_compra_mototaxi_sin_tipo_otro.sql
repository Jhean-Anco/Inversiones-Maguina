-- Las compras registradas como "Otro documento" pasan a "Nota" antes de retirar el tipo.
UPDATE "compras_mototaxis" SET "documento_tipo" = 'NOTA' WHERE "documento_tipo" = 'OTRO';--> statement-breakpoint
ALTER TABLE "compras_mototaxis" DROP CONSTRAINT "compras_mototaxis_documento_tipo_ck";--> statement-breakpoint
ALTER TABLE "compras_mototaxis" ADD CONSTRAINT "compras_mototaxis_documento_tipo_ck" CHECK ("compras_mototaxis"."documento_tipo" IN ('FACTURA', 'BOLETA', 'NOTA', 'SIN_DOCUMENTO'));