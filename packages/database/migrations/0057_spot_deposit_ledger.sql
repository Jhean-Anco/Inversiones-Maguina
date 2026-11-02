CREATE TABLE "ingresos_detracciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_id" uuid NOT NULL,
	"pago_id" uuid,
	"importe" numeric(14, 2) NOT NULL,
	"fecha_deposito" date NOT NULL,
	"constancia" varchar(100) NOT NULL,
	"responsable" varchar(12) NOT NULL,
	"fuente_verificacion" varchar(200) NOT NULL,
	"fecha_verificacion" date NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_detracciones_importe_ck" CHECK ("ingresos_detracciones"."importe" > 0),
	CONSTRAINT "ingresos_detracciones_responsable_ck" CHECK ("ingresos_detracciones"."responsable" IN ('PRESTADOR', 'USUARIO'))
);
--> statement-breakpoint
ALTER TABLE "ingresos_detracciones" ADD CONSTRAINT "ingresos_detracciones_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "ingresos_detracciones" ADD CONSTRAINT "ingresos_detracciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "ingresos_detracciones" ADD CONSTRAINT "ingresos_detracciones_pago_id_ingresos_pagos_id_fk" FOREIGN KEY ("pago_id") REFERENCES "public"."ingresos_pagos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX "ingresos_detracciones_ingreso_fecha_idx" ON "ingresos_detracciones" USING btree ("ingreso_id", "fecha_deposito");
--> statement-breakpoint
CREATE INDEX "ingresos_detracciones_pago_idx" ON "ingresos_detracciones" USING btree ("pago_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "ingresos_detracciones_constancia_unico" ON "ingresos_detracciones" USING btree ("constancia");
