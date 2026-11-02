CREATE TABLE "dias_no_laborables_fiscales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fecha" date NOT NULL,
	"nombre" varchar(180) NOT NULL,
	"fuente_normativa" varchar(1000) NOT NULL,
	"fecha_verificacion" date NOT NULL,
	"usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dias_no_laborables_fiscales_nombre_ck" CHECK (length(trim("dias_no_laborables_fiscales"."nombre")) > 0),
	CONSTRAINT "dias_no_laborables_fiscales_fuente_ck" CHECK (length(trim("dias_no_laborables_fiscales"."fuente_normativa")) > 0)
);
--> statement-breakpoint
ALTER TABLE "dias_no_laborables_fiscales" ADD CONSTRAINT "dias_no_laborables_fiscales_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dias_no_laborables_fiscales_fecha_uq" ON "dias_no_laborables_fiscales" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "dias_no_laborables_fiscales_fecha_idx" ON "dias_no_laborables_fiscales" USING btree ("fecha");