ALTER TABLE "ingresos" ADD COLUMN "perfil_fiscal_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "reglas_tributarias_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "perfil_fiscal_emisor_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "reglas_tributarias_snapshot" jsonb;