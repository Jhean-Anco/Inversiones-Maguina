CREATE TABLE "tipos_persona" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" varchar(240),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_persona_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_persona_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
INSERT INTO "tipos_persona" ("codigo", "nombre", "descripcion") VALUES
	('NATURAL', 'Persona natural', 'Persona identificada por nombres y apellidos.'),
	('JURIDICA', 'Persona jurídica', 'Empresa u organización identificada por razón social.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "personas" DROP CONSTRAINT "personas_tipo_y_nombre_ck";--> statement-breakpoint
ALTER TABLE "personas" ADD COLUMN "tipo_persona_id" uuid;--> statement-breakpoint
DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "personas" WHERE "tipo_persona" NOT IN ('NATURAL', 'JURIDICA')) THEN
		RAISE EXCEPTION 'La migración de tipos de persona encontró valores sin equivalencia; revísalos antes de continuar.';
	END IF;
END $$;
--> statement-breakpoint
UPDATE "personas" persona
SET "tipo_persona_id" = tipo."id"
FROM "tipos_persona" tipo
WHERE tipo."codigo" = persona."tipo_persona";--> statement-breakpoint
ALTER TABLE "personas" ALTER COLUMN "tipo_persona_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_tipo_persona_id_tipos_persona_id_fk" FOREIGN KEY ("tipo_persona_id") REFERENCES "public"."tipos_persona"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas" DROP COLUMN "tipo_persona";--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_nombre_o_razon_social_ck" CHECK ((
    ("personas"."nombres" IS NOT NULL AND "personas"."apellido_paterno" IS NOT NULL AND "personas"."razon_social" IS NULL)
    OR ("personas"."razon_social" IS NOT NULL AND "personas"."nombres" IS NULL AND "personas"."apellido_paterno" IS NULL AND "personas"."apellido_materno" IS NULL)
  ));
