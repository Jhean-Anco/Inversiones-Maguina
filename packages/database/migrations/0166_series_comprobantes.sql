CREATE TABLE "series_comprobantes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ambiente" varchar(12) NOT NULL,
	"tipo_comprobante" varchar(24) NOT NULL,
	"serie" varchar(4) NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_comprobantes_ambiente_ck" CHECK ("series_comprobantes"."ambiente" IN ('DEMO', 'PRODUCCION', 'INTERNO')),
	CONSTRAINT "series_comprobantes_tipo_ck" CHECK ("series_comprobantes"."tipo_comprobante" IN ('BOLETA', 'FACTURA', 'NOTA_CREDITO_FACTURA', 'NOTA_DEBITO_FACTURA', 'NOTA_CREDITO_BOLETA', 'NOTA_DEBITO_BOLETA', 'GUIA_REMITENTE', 'GUIA_TRANSPORTISTA', 'NOTA_VENTA', 'ORDEN_SERVICIO'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "series_comprobantes_ambiente_tipo_serie_uq" ON "series_comprobantes" USING btree ("ambiente","tipo_comprobante","serie");--> statement-breakpoint
CREATE UNIQUE INDEX "series_comprobantes_activa_tipo_uq" ON "series_comprobantes" USING btree ("ambiente","tipo_comprobante") WHERE "series_comprobantes"."activa";