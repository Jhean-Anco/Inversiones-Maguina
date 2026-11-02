CREATE TABLE "declaraciones_retencion_626" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"periodo" varchar(6) NOT NULL,
	"tipo" varchar(16) NOT NULL,
	"base_imponible" numeric(14, 2) NOT NULL,
	"retenciones_efectuadas" numeric(14, 2) NOT NULL,
	"pagos_previos" numeric(14, 2) NOT NULL,
	"retencion_pagar" numeric(14, 2) NOT NULL,
	"interes_moratorio" numeric(14, 2) NOT NULL,
	"total_deuda" numeric(14, 2) NOT NULL,
	"importe_pagado" numeric(14, 2) NOT NULL,
	"constancia" varchar(120) NOT NULL,
	"fecha_presentacion" date NOT NULL,
	"fuente_verificacion" varchar(240) NOT NULL,
	"fecha_verificacion" date NOT NULL,
	"verificada" boolean DEFAULT false NOT NULL,
	"evidencia_id" uuid,
	"observacion" varchar(1000),
	"usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "declaraciones_retencion_626_ruc_ck" CHECK ("declaraciones_retencion_626"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "declaraciones_retencion_626_periodo_ck" CHECK ("declaraciones_retencion_626"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "declaraciones_retencion_626_tipo_ck" CHECK ("declaraciones_retencion_626"."tipo" IN ('ORIGINAL', 'SUSTITUTORIA', 'RECTIFICATORIA')),
	CONSTRAINT "declaraciones_retencion_626_importes_ck" CHECK ("declaraciones_retencion_626"."base_imponible" >= 0 AND "declaraciones_retencion_626"."retenciones_efectuadas" >= 0 AND "declaraciones_retencion_626"."pagos_previos" >= 0 AND "declaraciones_retencion_626"."retencion_pagar" = "declaraciones_retencion_626"."retenciones_efectuadas" - "declaraciones_retencion_626"."pagos_previos" AND "declaraciones_retencion_626"."interes_moratorio" >= 0 AND "declaraciones_retencion_626"."total_deuda" = "declaraciones_retencion_626"."retencion_pagar" + "declaraciones_retencion_626"."interes_moratorio" AND "declaraciones_retencion_626"."importe_pagado" >= 0 AND "declaraciones_retencion_626"."importe_pagado" <= GREATEST(0, "declaraciones_retencion_626"."total_deuda")),
	CONSTRAINT "declaraciones_retencion_626_referencia_ck" CHECK (length(trim("declaraciones_retencion_626"."constancia")) > 0 AND length(trim("declaraciones_retencion_626"."fuente_verificacion")) > 0),
	CONSTRAINT "declaraciones_retencion_626_verificacion_ck" CHECK (NOT "declaraciones_retencion_626"."verificada" OR "declaraciones_retencion_626"."evidencia_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "evidencias_declaracion_retencion_626" (
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
	CONSTRAINT "evidencias_declaracion_retencion_626_ruc_ck" CHECK ("evidencias_declaracion_retencion_626"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "evidencias_declaracion_retencion_626_periodo_ck" CHECK ("evidencias_declaracion_retencion_626"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "evidencias_declaracion_retencion_626_archivo_ck" CHECK ("evidencias_declaracion_retencion_626"."ruta" ~ '^[0-9a-f-]{36}\.pdf$' AND "evidencias_declaracion_retencion_626"."mime" = 'application/pdf' AND "evidencias_declaracion_retencion_626"."tamano_bytes" > 0 AND "evidencias_declaracion_retencion_626"."tamano_bytes" <= 10485760)
);
--> statement-breakpoint
ALTER TABLE "declaraciones_retencion_626" ADD CONSTRAINT "declaraciones_retencion_626_evidencia_id_evidencias_declaracion_retencion_626_id_fk" FOREIGN KEY ("evidencia_id") REFERENCES "public"."evidencias_declaracion_retencion_626"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaraciones_retencion_626" ADD CONSTRAINT "declaraciones_retencion_626_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_retencion_626" ADD CONSTRAINT "evidencias_declaracion_retencion_626_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "declaraciones_retencion_626_ruc_periodo_idx" ON "declaraciones_retencion_626" USING btree ("ruc","periodo","creado_en");--> statement-breakpoint
CREATE INDEX "evidencias_declaracion_retencion_626_ruc_periodo_idx" ON "evidencias_declaracion_retencion_626" USING btree ("ruc","periodo","subido_en");