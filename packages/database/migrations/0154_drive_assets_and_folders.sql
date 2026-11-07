CREATE TABLE "carpetas_drive" (
	"clave" varchar(80) PRIMARY KEY NOT NULL,
	"nombre" varchar(180) NOT NULL,
	"ruta_logica" text NOT NULL,
	"drive_folder_id" varchar(255) NOT NULL UNIQUE,
	"drive_folder_url" text NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archivos_drive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_archivo" varchar(50) NOT NULL,
	"entidad_tipo" varchar(40) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"carpeta_clave" varchar(80) NOT NULL,
	"drive_folder_id" varchar(255) NOT NULL,
	"drive_file_id" varchar(255) NOT NULL UNIQUE,
	"nombre" varchar(240) NOT NULL,
	"mime_type" varchar(150) NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"sha256" varchar(64),
	"url_fuente" text,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "archivos_drive_carpeta_clave_carpetas_drive_clave_fk" FOREIGN KEY ("carpeta_clave") REFERENCES "carpetas_drive"("clave") ON DELETE restrict ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "archivos_drive_entidad_idx" ON "archivos_drive" USING btree ("entidad_tipo","entidad_id","tipo_archivo");
--> statement-breakpoint
CREATE INDEX "archivos_drive_carpeta_idx" ON "archivos_drive" USING btree ("drive_folder_id","creado_en");
--> statement-breakpoint
CREATE TABLE "imagenes_mototaxis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"unidad_id" uuid NOT NULL,
	"archivo_id" uuid NOT NULL UNIQUE,
	"orden" integer NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "imagenes_mototaxis_unidad_id_unidades_mototaxis_id_fk" FOREIGN KEY ("unidad_id") REFERENCES "unidades_mototaxis"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "imagenes_mototaxis_archivo_id_archivos_drive_id_fk" FOREIGN KEY ("archivo_id") REFERENCES "archivos_drive"("id") ON DELETE restrict ON UPDATE no action,
	CONSTRAINT "imagenes_mototaxis_orden_ck" CHECK ("orden" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "imagenes_mototaxis_unidad_orden_unico" ON "imagenes_mototaxis" USING btree ("unidad_id","orden");
--> statement-breakpoint
CREATE INDEX "imagenes_mototaxis_unidad_idx" ON "imagenes_mototaxis" USING btree ("unidad_id");
