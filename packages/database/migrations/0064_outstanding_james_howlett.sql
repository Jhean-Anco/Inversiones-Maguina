ALTER TABLE "ingresos_pagos" ALTER COLUMN "cliente_agente_retencion" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ALTER COLUMN "cliente_agente_percepcion" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ALTER COLUMN "cliente_agente_percepcion" DROP NOT NULL;