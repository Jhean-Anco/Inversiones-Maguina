CREATE TABLE "evidencias_perfil_fiscal_emisor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"ruta" varchar(260) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"mime" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"usuario_id" uuid,
	"subido_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidencias_perfil_fiscal_ruc_ck" CHECK ("evidencias_perfil_fiscal_emisor"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "evidencias_perfil_fiscal_archivo_ck" CHECK ("evidencias_perfil_fiscal_emisor"."ruta" ~ '^[0-9a-f-]{36}\.pdf$' AND "evidencias_perfil_fiscal_emisor"."mime" = 'application/pdf' AND "evidencias_perfil_fiscal_emisor"."tamano_bytes" > 0 AND "evidencias_perfil_fiscal_emisor"."tamano_bytes" <= 10485760)
);
--> statement-breakpoint
ALTER TABLE "evidencias_perfil_fiscal_emisor" ADD CONSTRAINT "evidencias_perfil_fiscal_emisor_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "evidencias_perfil_fiscal_ruc_idx" ON "evidencias_perfil_fiscal_emisor" USING btree ("ruc", "subido_en");
--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD COLUMN "perfil_fiscal_evidencia_id" uuid;
--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD CONSTRAINT "configuracion_emisor_perfil_fiscal_evidencia_fk" FOREIGN KEY ("perfil_fiscal_evidencia_id") REFERENCES "public"."evidencias_perfil_fiscal_emisor"("id") ON DELETE restrict ON UPDATE no action;
