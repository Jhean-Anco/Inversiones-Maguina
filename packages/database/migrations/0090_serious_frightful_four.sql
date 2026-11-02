CREATE TABLE "ingresos_cobros_grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"emisor_ruc" varchar(11) NOT NULL,
	"cliente_tipo_documento" varchar(4) NOT NULL,
	"cliente_numero_documento" varchar(15) NOT NULL,
	"cliente_nombre" varchar(150) NOT NULL,
	"fecha_pago" date NOT NULL,
	"medio_pago" varchar(30) NOT NULL,
	"importe_aplicado" numeric(14, 2) NOT NULL,
	"importe_recibido" numeric(14, 2) NOT NULL,
	"cliente_agente_retencion" boolean,
	"retencion_verificacion_fuente" varchar(200),
	"retencion_verificacion_fecha" date,
	"retencion_igv" numeric(14, 2) DEFAULT '0' NOT NULL,
	"retencion_constancia" varchar(100),
	"retencion_constancia_verificada" boolean DEFAULT false NOT NULL,
	"retencion_constancia_fuente_verificacion" varchar(200),
	"retencion_constancia_fecha_verificacion" date,
	"retencion_constancia_verificada_por_usuario_id" uuid,
	"retencion_periodo_aplicacion" varchar(6),
	"perfil_fiscal_emisor_snapshot" jsonb,
	"reglas_tributarias_snapshot" jsonb,
	"referencia_pago" varchar(120),
	"observacion" varchar(500),
	"usuario_id" uuid NOT NULL,
	"clave_idempotencia" varchar(36) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_cobros_grupos_importes_ck" CHECK ("ingresos_cobros_grupos"."importe_aplicado" > 0 AND "ingresos_cobros_grupos"."importe_recibido" >= 0 AND "ingresos_cobros_grupos"."retencion_igv" >= 0 AND "ingresos_cobros_grupos"."importe_aplicado" = "ingresos_cobros_grupos"."importe_recibido" + "ingresos_cobros_grupos"."retencion_igv"),
	CONSTRAINT "ingresos_cobros_grupos_agente_ck" CHECK (("ingresos_cobros_grupos"."cliente_agente_retencion" IS NULL AND "ingresos_cobros_grupos"."retencion_verificacion_fuente" IS NULL AND "ingresos_cobros_grupos"."retencion_verificacion_fecha" IS NULL) OR ("ingresos_cobros_grupos"."cliente_agente_retencion" IS NOT NULL AND "ingresos_cobros_grupos"."retencion_verificacion_fuente" IS NOT NULL AND "ingresos_cobros_grupos"."retencion_verificacion_fecha" IS NOT NULL)),
	CONSTRAINT "ingresos_cobros_grupos_retencion_ck" CHECK ("ingresos_cobros_grupos"."retencion_igv" = 0 OR ("ingresos_cobros_grupos"."cliente_agente_retencion" AND "ingresos_cobros_grupos"."retencion_constancia" IS NOT NULL)),
	CONSTRAINT "ingresos_cobros_grupos_verificacion_ck" CHECK (NOT "ingresos_cobros_grupos"."retencion_constancia_verificada" OR ("ingresos_cobros_grupos"."retencion_igv" > 0 AND "ingresos_cobros_grupos"."retencion_constancia" IS NOT NULL AND "ingresos_cobros_grupos"."retencion_constancia_fuente_verificacion" IS NOT NULL AND "ingresos_cobros_grupos"."retencion_constancia_fecha_verificacion" IS NOT NULL)),
	CONSTRAINT "ingresos_cobros_grupos_periodo_ck" CHECK ("ingresos_cobros_grupos"."retencion_periodo_aplicacion" IS NULL OR "ingresos_cobros_grupos"."retencion_periodo_aplicacion" ~ '^[0-9]{6}$'),
	CONSTRAINT "ingresos_cobros_grupos_medio_ck" CHECK ("ingresos_cobros_grupos"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO'))
);
--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "grupo_cobro_id" uuid;--> statement-breakpoint
ALTER TABLE "ingresos_cobros_grupos" ADD CONSTRAINT "ingresos_cobros_grupos_retencion_constancia_verificada_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("retencion_constancia_verificada_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_cobros_grupos" ADD CONSTRAINT "ingresos_cobros_grupos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingresos_cobros_grupos_idempotencia_unico" ON "ingresos_cobros_grupos" USING btree ("clave_idempotencia");--> statement-breakpoint
CREATE INDEX "ingresos_cobros_grupos_fecha_idx" ON "ingresos_cobros_grupos" USING btree ("fecha_pago");--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_grupo_cobro_id_ingresos_cobros_grupos_id_fk" FOREIGN KEY ("grupo_cobro_id") REFERENCES "public"."ingresos_cobros_grupos"("id") ON DELETE restrict ON UPDATE no action;