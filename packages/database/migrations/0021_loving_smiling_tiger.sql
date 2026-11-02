ALTER TABLE "ingresos" ADD COLUMN "tipo_comprobante" varchar(10) DEFAULT 'BOLETA' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "cliente_direccion" varchar(240);--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_tipo_comprobante_ck" CHECK ("ingresos"."tipo_comprobante" IN ('BOLETA', 'FACTURA'));