CREATE TABLE "ingresos_ediciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"cambios" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"antes" jsonb NOT NULL,
	"despues" jsonb NOT NULL,
	"efectos" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingresos_ediciones" ADD CONSTRAINT "ingresos_ediciones_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_ediciones" ADD CONSTRAINT "ingresos_ediciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingresos_ediciones_ingreso_idx" ON "ingresos_ediciones" USING btree ("ingreso_id","creado_en");