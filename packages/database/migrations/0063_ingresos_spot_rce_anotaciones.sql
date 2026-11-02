CREATE TABLE "ingresos_spot_rce_anotaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_id" uuid NOT NULL,
	"fecha_registro_rce" date NOT NULL,
	"constancia" varchar(100),
	"fuente_verificacion" varchar(240) NOT NULL,
	"fecha_verificacion" date NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_spot_rce_fechas_ck" CHECK ("ingresos_spot_rce_anotaciones"."fecha_verificacion" >= "ingresos_spot_rce_anotaciones"."fecha_registro_rce"),
	CONSTRAINT "ingresos_spot_rce_fuente_ck" CHECK (length(trim("ingresos_spot_rce_anotaciones"."fuente_verificacion")) > 0)
);
--> statement-breakpoint
ALTER TABLE "ingresos_spot_rce_anotaciones" ADD CONSTRAINT "ingresos_spot_rce_anotaciones_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE NO ACTION;
--> statement-breakpoint
ALTER TABLE "ingresos_spot_rce_anotaciones" ADD CONSTRAINT "ingresos_spot_rce_anotaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX "ingresos_spot_rce_anotaciones_ingreso_idx" ON "ingresos_spot_rce_anotaciones" USING btree ("ingreso_id", "creado_en");
