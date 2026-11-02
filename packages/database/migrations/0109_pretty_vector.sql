CREATE TABLE "egresos_pagos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"egreso_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"importe_pagado" numeric(14, 2) NOT NULL,
	"medio_pago" varchar(30) NOT NULL,
	"datos_retencion" jsonb,
	"clave_idempotencia" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egresos_pagos_clave_idempotencia_unique" UNIQUE("clave_idempotencia"),
	CONSTRAINT "egresos_pagos_importe_positivo_ck" CHECK ("egresos_pagos"."importe_pagado" > 0),
	CONSTRAINT "egresos_pagos_medio_pago_ck" CHECK ("egresos_pagos"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')),
	CONSTRAINT "egresos_pagos_datos_retencion_objeto_ck" CHECK ("egresos_pagos"."datos_retencion" IS NULL OR jsonb_typeof("egresos_pagos"."datos_retencion") = 'object')
);
--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD CONSTRAINT "egresos_pagos_egreso_id_egresos_registros_id_fk" FOREIGN KEY ("egreso_id") REFERENCES "public"."egresos_registros"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD CONSTRAINT "egresos_pagos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "egresos_pagos_egreso_fecha_idx" ON "egresos_pagos" USING btree ("egreso_id","fecha_pago");--> statement-breakpoint
CREATE INDEX "egresos_pagos_fecha_idx" ON "egresos_pagos" USING btree ("fecha_pago");--> statement-breakpoint
INSERT INTO egresos_pagos (egreso_id, fecha_pago, importe_pagado, medio_pago, datos_retencion, clave_idempotencia, usuario_id)
SELECT id, fecha, monto, medio_pago, datos_retencion, gen_random_uuid(), usuario_id
FROM egresos_registros;
