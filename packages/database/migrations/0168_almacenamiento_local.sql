DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "archivos_drive") THEN
    RAISE EXCEPTION 'Hay archivos guardados en almacenamiento externo; copialos a UPLOADS_DIR antes de retirar su registro.';
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "archivos_locales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_archivo" varchar(50) NOT NULL,
	"entidad_tipo" varchar(40) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"ruta_relativa" text NOT NULL,
	"nombre" varchar(240) NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"sha256" varchar(64),
	"url_fuente" text,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archivos_locales_ruta_relativa_unique" UNIQUE("ruta_relativa")
);
--> statement-breakpoint
ALTER TABLE "imagenes_mototaxis" DROP CONSTRAINT "imagenes_mototaxis_archivo_id_archivos_drive_id_fk";
--> statement-breakpoint
DROP TABLE "archivos_drive";--> statement-breakpoint
DROP TABLE "carpetas_drive";--> statement-breakpoint
CREATE INDEX "archivos_locales_entidad_idx" ON "archivos_locales" USING btree ("entidad_tipo","entidad_id","tipo_archivo");--> statement-breakpoint
ALTER TABLE "imagenes_mototaxis" ADD CONSTRAINT "imagenes_mototaxis_archivo_id_archivos_locales_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "public"."archivos_locales"("id") ON DELETE restrict ON UPDATE no action;
