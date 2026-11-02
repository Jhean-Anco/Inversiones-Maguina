CREATE TABLE "igv_servicios_no_domiciliados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrada_id" uuid NOT NULL,
	"periodo_sunat" varchar(6) NOT NULL,
	"uso_en_peru" boolean NOT NULL,
	"sujeto_igv" boolean NOT NULL,
	"igv_por_pagar_pen" numeric(14, 2) NOT NULL,
	"estado_declaracion" varchar(20) DEFAULT 'PENDIENTE' NOT NULL,
	"fecha_declaracion" date,
	"constancia_declaracion" varchar(200),
	"anotado_rce" boolean DEFAULT false NOT NULL,
	"fecha_anotacion_rce" date,
	"constancia_anotacion_rce" varchar(200),
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "igv_servicios_no_domiciliados_entrada_id_unique" UNIQUE("entrada_id"),
	CONSTRAINT "igv_no_domiciliados_periodo_ck" CHECK ("igv_servicios_no_domiciliados"."periodo_sunat" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "igv_no_domiciliados_igv_ck" CHECK ("igv_servicios_no_domiciliados"."igv_por_pagar_pen" >= 0),
	CONSTRAINT "igv_no_domiciliados_declaracion_ck" CHECK (("igv_servicios_no_domiciliados"."estado_declaracion" = 'PENDIENTE' AND "igv_servicios_no_domiciliados"."fecha_declaracion" IS NULL) OR ("igv_servicios_no_domiciliados"."estado_declaracion" = 'PRESENTADA' AND "igv_servicios_no_domiciliados"."fecha_declaracion" IS NOT NULL)),
	CONSTRAINT "igv_no_domiciliados_anotacion_ck" CHECK (("igv_servicios_no_domiciliados"."anotado_rce" = false AND "igv_servicios_no_domiciliados"."fecha_anotacion_rce" IS NULL AND "igv_servicios_no_domiciliados"."constancia_anotacion_rce" IS NULL) OR ("igv_servicios_no_domiciliados"."anotado_rce" = true AND "igv_servicios_no_domiciliados"."fecha_anotacion_rce" IS NOT NULL AND "igv_servicios_no_domiciliados"."constancia_anotacion_rce" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "pagos_igv_servicios_no_domiciliados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"obligacion_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"igv_pagado_pen" numeric(14, 2) NOT NULL,
	"intereses_pen" numeric(14, 2) DEFAULT '0' NOT NULL,
	"constancia_1662" varchar(200) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_igv_no_domiciliados_importes_ck" CHECK ("pagos_igv_servicios_no_domiciliados"."igv_pagado_pen" > 0 AND "pagos_igv_servicios_no_domiciliados"."intereses_pen" >= 0),
	CONSTRAINT "pagos_igv_no_domiciliados_constancia_ck" CHECK (length(trim("pagos_igv_servicios_no_domiciliados"."constancia_1662")) > 0)
);
--> statement-breakpoint
ALTER TABLE "igv_servicios_no_domiciliados" ADD CONSTRAINT "igv_servicios_no_domiciliados_entrada_id_entradas_stock_id_fk" FOREIGN KEY ("entrada_id") REFERENCES "public"."entradas_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "igv_servicios_no_domiciliados" ADD CONSTRAINT "igv_servicios_no_domiciliados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_igv_servicios_no_domiciliados" ADD CONSTRAINT "pagos_igv_servicios_no_domiciliados_obligacion_id_igv_servicios_no_domiciliados_id_fk" FOREIGN KEY ("obligacion_id") REFERENCES "public"."igv_servicios_no_domiciliados"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_igv_servicios_no_domiciliados" ADD CONSTRAINT "pagos_igv_servicios_no_domiciliados_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "igv_no_domiciliados_periodo_idx" ON "igv_servicios_no_domiciliados" USING btree ("periodo_sunat");--> statement-breakpoint
CREATE INDEX "pagos_igv_no_domiciliados_obligacion_idx" ON "pagos_igv_servicios_no_domiciliados" USING btree ("obligacion_id","fecha_pago");