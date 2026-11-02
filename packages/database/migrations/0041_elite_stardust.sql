CREATE TABLE "ingresos_pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"importe_aplicado" numeric(14, 2) NOT NULL,
	"importe_recibido" numeric(14, 2) NOT NULL,
	"medio_pago" varchar(30) NOT NULL,
	"cliente_agente_retencion" boolean NOT NULL,
	"retencion_verificacion_fuente" varchar(200),
	"retencion_igv" numeric(14, 2) DEFAULT '0' NOT NULL,
	"retencion_constancia" varchar(100),
	"percepcion_tasa" numeric(4, 2),
	"percepcion_igv" numeric(14, 2) DEFAULT '0' NOT NULL,
	"percepcion_constancia" varchar(100),
	"detraccion_depositada" numeric(14, 2) DEFAULT '0' NOT NULL,
	"detraccion_constancia" varchar(100),
	"referencia_pago" varchar(120),
	"observacion" varchar(500),
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_pagos_importes_ck" CHECK ("ingresos_pagos"."importe_aplicado" > 0 AND "ingresos_pagos"."importe_recibido" >= 0 AND "ingresos_pagos"."retencion_igv" >= 0 AND "ingresos_pagos"."percepcion_igv" >= 0 AND "ingresos_pagos"."detraccion_depositada" >= 0),
	CONSTRAINT "ingresos_pagos_medio_ck" CHECK ("ingresos_pagos"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')),
	CONSTRAINT "ingresos_pagos_retencion_constancia_ck" CHECK ("ingresos_pagos"."retencion_igv" = 0 OR ("ingresos_pagos"."cliente_agente_retencion" AND "ingresos_pagos"."retencion_constancia" IS NOT NULL)),
	CONSTRAINT "ingresos_pagos_percepcion_constancia_ck" CHECK ("ingresos_pagos"."percepcion_igv" = 0 OR ("ingresos_pagos"."percepcion_tasa" IN (0.5, 1, 2) AND "ingresos_pagos"."percepcion_constancia" IS NOT NULL)),
	CONSTRAINT "ingresos_pagos_detraccion_constancia_ck" CHECK ("ingresos_pagos"."detraccion_depositada" = 0 OR "ingresos_pagos"."detraccion_constancia" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingresos_pagos_ingreso_fecha_idx" ON "ingresos_pagos" USING btree ("ingreso_id","fecha_pago");