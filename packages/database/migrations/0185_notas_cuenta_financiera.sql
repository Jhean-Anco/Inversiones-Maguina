ALTER TABLE "comprobantes_relacionados" ADD COLUMN "cuenta_financiera_id" uuid;--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" ADD CONSTRAINT "comprobantes_relacionados_cuenta_financiera_id_cuentas_financieras_id_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "public"."cuentas_financieras"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comprobantes_relacionados_cuenta_fecha_idx" ON "comprobantes_relacionados" USING btree ("cuenta_financiera_id","fecha");
--> statement-breakpoint
UPDATE "comprobantes_relacionados" AS nota
SET "cuenta_financiera_id" = cuenta.id
FROM "cuentas_financieras" AS cuenta
WHERE nota."cuenta_financiera_id" IS NULL
  AND nota."datos_nubefact"->>'cuentaFinancieraId' = cuenta.id::text;
