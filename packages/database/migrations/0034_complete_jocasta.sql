CREATE TABLE "personas_documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"tipo_documento_id" uuid NOT NULL,
	"numero_documento" varchar(30) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "personas_documentos" ADD CONSTRAINT "personas_documentos_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas_documentos" ADD CONSTRAINT "personas_documentos_tipo_documento_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_documento_id") REFERENCES "public"."tipos_documento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "personas_documentos_identidad_unico" ON "personas_documentos" USING btree ("tipo_documento_id","numero_documento");--> statement-breakpoint
CREATE UNIQUE INDEX "personas_documentos_persona_tipo_unico" ON "personas_documentos" USING btree ("persona_id","tipo_documento_id");--> statement-breakpoint
CREATE INDEX "personas_documentos_persona_idx" ON "personas_documentos" USING btree ("persona_id");
--> statement-breakpoint
INSERT INTO "personas_documentos" ("persona_id", "tipo_documento_id", "numero_documento")
SELECT p."id", dni."id", substring(p."numero_documento" from 3 for 8)
FROM "personas" p
JOIN "tipos_documento" ruc ON ruc."id" = p."tipo_documento_id" AND ruc."codigo" = '06'
JOIN "tipos_documento" dni ON dni."codigo" = '01' AND dni."activo" = true
JOIN "tipos_persona" tp_natural ON tp_natural."id" = p."tipo_persona_id" AND tp_natural."codigo" = 'NATURAL'
WHERE p."numero_documento" ~ '^10[0-9]{9}$'
  AND NOT EXISTS (
    SELECT 1 FROM "personas" principal
    WHERE principal."tipo_documento_id" = dni."id"
      AND principal."numero_documento" = substring(p."numero_documento" from 3 for 8)
  )
ON CONFLICT DO NOTHING;

