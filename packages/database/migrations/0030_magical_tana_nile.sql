CREATE TABLE "comprobantes_relacionados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_origen_id" uuid NOT NULL,
	"tipo_comprobante" varchar(20) NOT NULL,
	"codigo_motivo" integer NOT NULL,
	"motivo" varchar(240) NOT NULL,
	"fecha" date NOT NULL,
	"ambiente" varchar(12) NOT NULL,
	"serie" varchar(4) NOT NULL,
	"numero" integer NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"igv" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"estado" varchar(24) NOT NULL,
	"datos_nubefact" jsonb,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comprobantes_relacionados_tipo_ck" CHECK ("comprobantes_relacionados"."tipo_comprobante" IN ('NOTA_CREDITO', 'NOTA_DEBITO')),
	CONSTRAINT "comprobantes_relacionados_ambiente_ck" CHECK ("comprobantes_relacionados"."ambiente" IN ('DEMO', 'PRODUCCION')),
	CONSTRAINT "comprobantes_relacionados_motivo_ck" CHECK ("comprobantes_relacionados"."codigo_motivo" > 0),
	CONSTRAINT "comprobantes_relacionados_importes_ck" CHECK ("comprobantes_relacionados"."subtotal" >= 0 AND "comprobantes_relacionados"."igv" >= 0 AND "comprobantes_relacionados"."total" > 0)
);
--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD COLUMN "tipo_comprobante" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "nubefact_correlativos" SET "tipo_comprobante" = CASE WHEN "serie" LIKE 'B%' THEN 2 ELSE 1 END;--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP CONSTRAINT "nubefact_correlativos_ambiente_serie_pk";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_ambiente_serie_tipo_comprobante_pk" PRIMARY KEY("ambiente","serie","tipo_comprobante");--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" ADD CONSTRAINT "comprobantes_relacionados_ingreso_origen_id_ingresos_id_fk" FOREIGN KEY ("ingreso_origen_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" ADD CONSTRAINT "comprobantes_relacionados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comprobantes_relacionados_origen_idx" ON "comprobantes_relacionados" USING btree ("ingreso_origen_id","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_relacionados_serie_numero_unico" ON "comprobantes_relacionados" USING btree ("ambiente","tipo_comprobante","serie","numero");--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_tipo_ck" CHECK ("nubefact_correlativos"."tipo_comprobante" IN (1, 2, 3, 4));
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('FACTURACION.NOTAS_EMITIR', 'FACTURACION', 'NOTAS_EMITIR', 'Emitir notas de crédito y débito vinculadas a comprobantes existentes.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id" FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" IN ('ADMINISTRADOR', 'GERENTE') AND permiso."codigo" = 'FACTURACION.NOTAS_EMITIR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
