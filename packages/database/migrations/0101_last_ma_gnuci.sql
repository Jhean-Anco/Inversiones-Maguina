CREATE TABLE "importaciones_propuesta_rce" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"periodo" varchar(6) NOT NULL,
	"nombre_archivo" varchar(255) NOT NULL,
	"ruta" varchar(260) NOT NULL,
	"mime" varchar(100) NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"filas" integer NOT NULL,
	"filas_coincidentes" integer NOT NULL,
	"filas_sin_registro_local" integer NOT NULL,
	"documentos" jsonb NOT NULL,
	"usuario_id" uuid,
	"importado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "importaciones_propuesta_rce_ruc_ck" CHECK ("importaciones_propuesta_rce"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "importaciones_propuesta_rce_periodo_ck" CHECK ("importaciones_propuesta_rce"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "importaciones_propuesta_rce_hash_ck" CHECK ("importaciones_propuesta_rce"."sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "importaciones_propuesta_rce_archivo_ck" CHECK ("importaciones_propuesta_rce"."ruta" ~ '^[0-9a-f-]{36}\.(csv|txt)$' AND "importaciones_propuesta_rce"."tamano_bytes" > 0 AND "importaciones_propuesta_rce"."tamano_bytes" <= 15728640 AND "importaciones_propuesta_rce"."filas" > 0 AND "importaciones_propuesta_rce"."filas_coincidentes" >= 0 AND "importaciones_propuesta_rce"."filas_sin_registro_local" >= 0 AND "importaciones_propuesta_rce"."filas" = "importaciones_propuesta_rce"."filas_coincidentes" + "importaciones_propuesta_rce"."filas_sin_registro_local")
);
--> statement-breakpoint
ALTER TABLE "importaciones_propuesta_rce" ADD CONSTRAINT "importaciones_propuesta_rce_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "importaciones_propuesta_rce_archivo_uq" ON "importaciones_propuesta_rce" USING btree ("ruc","periodo","sha256");--> statement-breakpoint
CREATE INDEX "importaciones_propuesta_rce_periodo_idx" ON "importaciones_propuesta_rce" USING btree ("ruc","periodo","importado_en");