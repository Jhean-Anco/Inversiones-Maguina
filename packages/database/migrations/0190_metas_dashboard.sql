-- Metas del dashboard de inicio (ventas del mes, cobranza y margen).
-- Un periodo AAAA-MM fija la meta de un mes; sin periodo es la meta predeterminada de todos los meses.
CREATE TABLE "metas_dashboard" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicador" varchar(20) NOT NULL,
	"periodo" varchar(7),
	"valor" numeric(14, 2) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metas_dashboard_indicador_ck" CHECK ("metas_dashboard"."indicador" IN ('VENTAS_MES', 'COBRANZA', 'MARGEN')),
	CONSTRAINT "metas_dashboard_periodo_ck" CHECK ("metas_dashboard"."periodo" IS NULL OR "metas_dashboard"."periodo" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
	CONSTRAINT "metas_dashboard_valor_ck" CHECK ("metas_dashboard"."valor" > 0 AND ("metas_dashboard"."indicador" = 'VENTAS_MES' OR "metas_dashboard"."valor" <= 100))
);
--> statement-breakpoint
ALTER TABLE "metas_dashboard" ADD CONSTRAINT "metas_dashboard_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "metas_dashboard_indicador_periodo_uq" ON "metas_dashboard" USING btree ("indicador",coalesce("periodo", ''));
