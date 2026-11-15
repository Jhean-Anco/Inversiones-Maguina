ALTER TABLE "ordenes_servicio" ADD COLUMN "adelanto" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD COLUMN "adelanto_medio_pago" varchar(30);--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD COLUMN "adelanto_cuenta_financiera_id" uuid;--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_adelanto_cuenta_financiera_id_cuentas_financieras_id_fk" FOREIGN KEY ("adelanto_cuenta_financiera_id") REFERENCES "public"."cuentas_financieras"("id") ON DELETE restrict ON UPDATE no action;