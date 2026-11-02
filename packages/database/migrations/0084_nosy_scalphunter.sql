CREATE TABLE "declaraciones_percepcion_697" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"periodo" varchar(6) NOT NULL,
	"tipo" varchar(16) NOT NULL,
	"base_imponible" numeric(14, 2) NOT NULL,
	"percepciones_efectuadas" numeric(14, 2) NOT NULL,
	"pagos_previos" numeric(14, 2) NOT NULL,
	"percepcion_pagar" numeric(14, 2) NOT NULL,
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
	CONSTRAINT "declaraciones_percepcion_697_ruc_ck" CHECK ("declaraciones_percepcion_697"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "declaraciones_percepcion_697_periodo_ck" CHECK ("declaraciones_percepcion_697"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "declaraciones_percepcion_697_tipo_ck" CHECK ("declaraciones_percepcion_697"."tipo" IN ('ORIGINAL', 'SUSTITUTORIA', 'RECTIFICATORIA')),
	CONSTRAINT "declaraciones_percepcion_697_importes_ck" CHECK ("declaraciones_percepcion_697"."base_imponible" >= 0 AND "declaraciones_percepcion_697"."percepciones_efectuadas" >= 0 AND "declaraciones_percepcion_697"."pagos_previos" >= 0 AND "declaraciones_percepcion_697"."percepcion_pagar" = GREATEST(0, "declaraciones_percepcion_697"."percepciones_efectuadas" - "declaraciones_percepcion_697"."pagos_previos") AND "declaraciones_percepcion_697"."interes_moratorio" >= 0 AND "declaraciones_percepcion_697"."total_deuda" = "declaraciones_percepcion_697"."percepcion_pagar" + "declaraciones_percepcion_697"."interes_moratorio" AND "declaraciones_percepcion_697"."importe_pagado" >= 0 AND "declaraciones_percepcion_697"."importe_pagado" <= "declaraciones_percepcion_697"."total_deuda"),
	CONSTRAINT "declaraciones_percepcion_697_referencia_ck" CHECK (length(trim("declaraciones_percepcion_697"."constancia")) > 0 AND length(trim("declaraciones_percepcion_697"."fuente_verificacion")) > 0),
	CONSTRAINT "declaraciones_percepcion_697_verificacion_ck" CHECK (NOT "declaraciones_percepcion_697"."verificada" OR "declaraciones_percepcion_697"."evidencia_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "evidencias_declaracion_percepcion_697" (
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
	CONSTRAINT "evidencias_declaracion_percepcion_697_ruc_ck" CHECK ("evidencias_declaracion_percepcion_697"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "evidencias_declaracion_percepcion_697_periodo_ck" CHECK ("evidencias_declaracion_percepcion_697"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "evidencias_declaracion_percepcion_697_archivo_ck" CHECK ("evidencias_declaracion_percepcion_697"."ruta" ~ '^[0-9a-f-]{36}\.pdf$' AND "evidencias_declaracion_percepcion_697"."mime" = 'application/pdf' AND "evidencias_declaracion_percepcion_697"."tamano_bytes" > 0 AND "evidencias_declaracion_percepcion_697"."tamano_bytes" <= 10485760)
);
--> statement-breakpoint
ALTER TABLE "declaraciones_percepcion_697" ADD CONSTRAINT "declaraciones_percepcion_697_evidencia_id_evidencias_declaracion_percepcion_697_id_fk" FOREIGN KEY ("evidencia_id") REFERENCES "public"."evidencias_declaracion_percepcion_697"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "declaraciones_percepcion_697" ADD CONSTRAINT "declaraciones_percepcion_697_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidencias_declaracion_percepcion_697" ADD CONSTRAINT "evidencias_declaracion_percepcion_697_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "declaraciones_percepcion_697_ruc_periodo_idx" ON "declaraciones_percepcion_697" USING btree ("ruc","periodo","creado_en");--> statement-breakpoint
CREATE INDEX "evidencias_declaracion_percepcion_697_ruc_periodo_idx" ON "evidencias_declaracion_percepcion_697" USING btree ("ruc","periodo","subido_en");