ALTER TABLE "ingresos_pagos"
  ADD COLUMN "detraccion_fecha_deposito" date;
--> statement-breakpoint
ALTER TABLE "ingresos_pagos"
  ADD CONSTRAINT "ingresos_pagos_detraccion_fecha_ck"
  CHECK ("detraccion_fecha_deposito" IS NULL OR ("detraccion_depositada" > 0 AND "detraccion_constancia" IS NOT NULL));
