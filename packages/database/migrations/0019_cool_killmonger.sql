ALTER TABLE "ingresos" DROP CONSTRAINT "ingresos_medio_pago_ck";--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "datos_nubefact" jsonb;--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_medio_pago_ck" CHECK ("ingresos"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO'));