ALTER TABLE "ingresos_pagos" DROP CONSTRAINT "ingresos_pagos_importes_ck";--> statement-breakpoint
ALTER TABLE "ingresos_pagos" DROP CONSTRAINT "ingresos_pagos_percepcion_constancia_ck";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP CONSTRAINT "nubefact_correlativos_tipo_ck";--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "base_percepcion_igv" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_estado" varchar(12);--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_serie" varchar(4);--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_numero" integer;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_codigo" varchar(12);--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_enlace_pdf" text;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_enlace_xml" text;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_enlace_cdr" text;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "percepcion_datos_nubefact" jsonb;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_percepcion_estado_ck" CHECK ("ingresos_pagos"."percepcion_estado" IS NULL OR "ingresos_pagos"."percepcion_estado" IN ('PENDIENTE', 'EMITIDO', 'ERROR'));--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_percepcion_emitida_ck" CHECK ("ingresos_pagos"."percepcion_estado" <> 'EMITIDO' OR ("ingresos_pagos"."percepcion_serie" IS NOT NULL AND "ingresos_pagos"."percepcion_numero" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_importes_ck" CHECK ("ingresos_pagos"."importe_aplicado" > 0 AND "ingresos_pagos"."importe_recibido" >= 0 AND "ingresos_pagos"."retencion_igv" >= 0 AND "ingresos_pagos"."base_percepcion_igv" >= 0 AND "ingresos_pagos"."percepcion_igv" >= 0 AND "ingresos_pagos"."detraccion_depositada" >= 0);--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_percepcion_constancia_ck" CHECK ("ingresos_pagos"."percepcion_igv" = 0 OR ("ingresos_pagos"."percepcion_tasa" IN (0.5, 1, 2) AND "ingresos_pagos"."percepcion_estado" IN ('PENDIENTE', 'EMITIDO', 'ERROR')));--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_tipo_ck" CHECK ("nubefact_correlativos"."tipo_comprobante" IN (1, 2, 3, 4, 5));