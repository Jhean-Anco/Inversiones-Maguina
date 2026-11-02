CREATE TABLE "clientes" (
	"persona_id" uuid PRIMARY KEY NOT NULL,
	"direccion_fiscal" varchar(240),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "cliente_id" uuid;--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clientes_activo_idx" ON "clientes" USING btree ("activo");--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_cliente_id_clientes_persona_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("persona_id") ON DELETE restrict ON UPDATE no action;