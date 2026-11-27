CREATE TABLE "nubefact_seguimientos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entidad_tipo" varchar(40) NOT NULL,
	"entidad_id" uuid NOT NULL,
	"operacion" varchar(20) NOT NULL,
	"estado" varchar(12) DEFAULT 'ACTIVO' NOT NULL,
	"intentos" integer DEFAULT 0 NOT NULL,
	"proximo_intento" timestamp (3) with time zone NOT NULL,
	"ultimo_intento" timestamp (3) with time zone,
	"ultimo_error" text,
	"resuelto_en" timestamp (3) with time zone,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nubefact_seguimientos_entidad_ck" CHECK ("nubefact_seguimientos"."entidad_tipo" IN ('INGRESO', 'COMPROBANTE_RELACIONADO', 'GUIA_REMISION')),
	CONSTRAINT "nubefact_seguimientos_operacion_ck" CHECK ("nubefact_seguimientos"."operacion" IN ('EMISION', 'ANULACION', 'ARCHIVOS')),
	CONSTRAINT "nubefact_seguimientos_estado_ck" CHECK ("nubefact_seguimientos"."estado" IN ('ACTIVO', 'RESUELTO', 'AGOTADO'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "nubefact_seguimientos_entidad_operacion_uq" ON "nubefact_seguimientos" USING btree ("entidad_tipo","entidad_id","operacion");--> statement-breakpoint
CREATE INDEX "nubefact_seguimientos_pendientes_idx" ON "nubefact_seguimientos" USING btree ("estado","proximo_intento");