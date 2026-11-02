CREATE TABLE "ingresos_correlativos" (
	"tipo_comprobante" varchar(20) PRIMARY KEY NOT NULL,
	"serie" varchar(4) NOT NULL,
	"ultimo_numero" integer DEFAULT 0 NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_correlativos_tipo_ck" CHECK ("ingresos_correlativos"."tipo_comprobante" IN ('NOTA_VENTA')),
	CONSTRAINT "ingresos_correlativos_numero_ck" CHECK ("ingresos_correlativos"."ultimo_numero" >= 0)
);
INSERT INTO "ingresos_correlativos" ("tipo_comprobante", "serie", "ultimo_numero") VALUES ('NOTA_VENTA', 'NV', 0);
