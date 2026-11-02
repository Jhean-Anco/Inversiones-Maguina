CREATE TABLE "comprobantes_relacionados_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comprobante_relacionado_id" uuid NOT NULL,
	"ingreso_detalle_id" uuid NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comprobantes_relacionados_detalle_cantidad_ck" CHECK ("comprobantes_relacionados_detalle"."cantidad" > 0)
);
--> statement-breakpoint
DROP INDEX "comprobantes_relacionados_origen_motivo_unico";--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados" ADD COLUMN "huella_solicitud" varchar(64);--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados_detalle" ADD CONSTRAINT "comprobantes_relacionados_detalle_comprobante_relacionado_id_comprobantes_relacionados_id_fk" FOREIGN KEY ("comprobante_relacionado_id") REFERENCES "public"."comprobantes_relacionados"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comprobantes_relacionados_detalle" ADD CONSTRAINT "comprobantes_relacionados_detalle_ingreso_detalle_id_ingresos_detalle_id_fk" FOREIGN KEY ("ingreso_detalle_id") REFERENCES "public"."ingresos_detalle"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_relacionados_detalle_unico" ON "comprobantes_relacionados_detalle" USING btree ("comprobante_relacionado_id","ingreso_detalle_id");--> statement-breakpoint
CREATE INDEX "comprobantes_relacionados_detalle_origen_idx" ON "comprobantes_relacionados_detalle" USING btree ("ingreso_detalle_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_relacionados_huella_uq" ON "comprobantes_relacionados" USING btree ("ingreso_origen_id","huella_solicitud") WHERE "comprobantes_relacionados"."huella_solicitud" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "comprobantes_relacionados_origen_motivo_unico" ON "comprobantes_relacionados" USING btree ("ingreso_origen_id","tipo_comprobante","codigo_motivo") WHERE "comprobantes_relacionados"."codigo_motivo" <> 7;