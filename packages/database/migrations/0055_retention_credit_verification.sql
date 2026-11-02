ALTER TABLE "ingresos_pagos"
  ADD COLUMN "retencion_constancia_verificada" boolean DEFAULT false NOT NULL,
  ADD COLUMN "retencion_constancia_fuente_verificacion" varchar(200),
  ADD COLUMN "retencion_constancia_fecha_verificacion" date,
  ADD COLUMN "retencion_constancia_verificada_por_usuario_id" uuid,
  ADD COLUMN "retencion_periodo_aplicacion" varchar(6);
--> statement-breakpoint
ALTER TABLE "ingresos_pagos"
  ADD CONSTRAINT "ingresos_pagos_retencion_verificada_ck"
  CHECK (NOT "retencion_constancia_verificada" OR ("retencion_igv" > 0 AND "retencion_constancia" IS NOT NULL AND "retencion_constancia_fuente_verificacion" IS NOT NULL AND "retencion_constancia_fecha_verificacion" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "ingresos_pagos"
  ADD CONSTRAINT "ingresos_pagos_retencion_verificada_por_fk"
  FOREIGN KEY ("retencion_constancia_verificada_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "ingresos_pagos"
  ADD CONSTRAINT "ingresos_pagos_retencion_periodo_ck"
  CHECK ("retencion_periodo_aplicacion" IS NULL OR "retencion_periodo_aplicacion" ~ '^[0-9]{6}$');
