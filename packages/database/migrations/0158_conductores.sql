CREATE TABLE IF NOT EXISTS "conductores" (
  "persona_id" uuid PRIMARY KEY NOT NULL,
  "numero_licencia" varchar(10) NOT NULL,
  "telefono" varchar(30),
  "activo" boolean DEFAULT true NOT NULL,
  "creado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "actualizado_en" timestamp(3) with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "conductores_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "personas"("id") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "conductores_licencia_unica" ON "conductores" USING btree ("numero_licencia");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conductores_activo_idx" ON "conductores" USING btree ("activo");
