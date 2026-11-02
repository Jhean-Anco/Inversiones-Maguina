CREATE TABLE "evidencias_declaracion_igv_621" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"periodo" varchar(6) NOT NULL,
	"ruta" varchar(260) NOT NULL,
	"nombre" varchar(255) NOT NULL,
	"mime" varchar(100) DEFAULT 'application/pdf' NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"tamano_bytes" integer NOT NULL,
	"usuario_id" uuid,
	"subido_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidencias_declaracion_igv_621_ruc_ck" CHECK ("evidencias_declaracion_igv_621"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "evidencias_declaracion_igv_621_periodo_ck" CHECK ("evidencias_declaracion_igv_621"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "evidencias_declaracion_igv_621_archivo_ck" CHECK ("evidencias_declaracion_igv_621"."ruta" ~ '^[0-9a-f-]{36}\.pdf$' AND "evidencias_declaracion_igv_621"."mime" = 'application/pdf' AND "evidencias_declaracion_igv_621"."tamano_bytes" > 0 AND "evidencias_declaracion_igv_621"."tamano_bytes" <= 10485760)
);
--> statement-breakpoint
ALTER TABLE "declaraciones_igv_621" ADD COLUMN "evidencia_id" uuid;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_igv_621" ADD CONSTRAINT "evidencias_declaracion_igv_621_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "evidencias_declaracion_igv_621_ruc_periodo_idx" ON "evidencias_declaracion_igv_621" USING btree ("ruc","periodo","subido_en");--> statement-breakpoint
ALTER TABLE "declaraciones_igv_621" ADD CONSTRAINT "declaraciones_igv_621_evidencia_id_evidencias_declaracion_igv_621_id_fk" FOREIGN KEY ("evidencia_id") REFERENCES "public"."evidencias_declaracion_igv_621"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaraciones_igv_621" ADD CONSTRAINT "declaraciones_igv_621_verificacion_ck" CHECK (NOT "declaraciones_igv_621"."verificada" OR "declaraciones_igv_621"."evidencia_id" IS NOT NULL);