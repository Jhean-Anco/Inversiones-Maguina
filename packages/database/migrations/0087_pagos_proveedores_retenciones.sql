CREATE TABLE "pagos_entradas_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrada_id" uuid NOT NULL,
	"fecha_pago" date NOT NULL,
	"importe_pagado" numeric(14, 2) NOT NULL,
	"medio_pago" varchar(30) NOT NULL,
	"operacion_gravada_igv" boolean,
	"exclusion_retencion" varchar(30) NOT NULL,
	"fuente_verificacion_proveedor" varchar(240) NOT NULL,
	"fecha_verificacion_proveedor" date NOT NULL,
	"retencion_igv" numeric(14, 2) DEFAULT '0' NOT NULL,
	"comprobante_retencion" varchar(100),
	"constancia_retencion_verificada" boolean DEFAULT false NOT NULL,
	"fuente_verificacion_retencion" varchar(240),
	"fecha_verificacion_retencion" date,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pagos_entradas_stock_importes_ck" CHECK ("pagos_entradas_stock"."importe_pagado" > 0 AND "pagos_entradas_stock"."retencion_igv" >= 0 AND "pagos_entradas_stock"."retencion_igv" <= "pagos_entradas_stock"."importe_pagado"),
	CONSTRAINT "pagos_entradas_stock_medio_ck" CHECK ("pagos_entradas_stock"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')),
	CONSTRAINT "pagos_entradas_stock_exclusion_ck" CHECK ("pagos_entradas_stock"."exclusion_retencion" IN ('PENDIENTE', 'NINGUNA', 'EMISOR_NO_AGENTE', 'BUEN_CONTRIBUYENTE', 'AGENTE_RETENCION', 'AGENTE_PERCEPCION', 'COMPROBANTE_SIN_CREDITO', 'SPOT', 'NO_GRAVADA', 'MONTO_MENOR_700', 'OTRO')),
	CONSTRAINT "pagos_entradas_stock_retencion_evidencia_ck" CHECK (("pagos_entradas_stock"."retencion_igv" = 0 AND "pagos_entradas_stock"."comprobante_retencion" IS NULL AND "pagos_entradas_stock"."constancia_retencion_verificada" = false AND "pagos_entradas_stock"."fuente_verificacion_retencion" IS NULL AND "pagos_entradas_stock"."fecha_verificacion_retencion" IS NULL) OR ("pagos_entradas_stock"."retencion_igv" > 0 AND "pagos_entradas_stock"."comprobante_retencion" IS NOT NULL AND length(trim("pagos_entradas_stock"."comprobante_retencion")) > 0 AND "pagos_entradas_stock"."fuente_verificacion_retencion" IS NOT NULL AND "pagos_entradas_stock"."fecha_verificacion_retencion" IS NOT NULL))
);
--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_entrada_id_entradas_stock_id_fk" FOREIGN KEY ("entrada_id") REFERENCES "public"."entradas_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pagos_entradas_stock_entrada_fecha_idx" ON "pagos_entradas_stock" USING btree ("entrada_id","fecha_pago");--> statement-breakpoint
CREATE INDEX "pagos_entradas_stock_fecha_retencion_idx" ON "pagos_entradas_stock" USING btree ("fecha_pago","retencion_igv");--> statement-breakpoint
CREATE UNIQUE INDEX "pagos_entradas_stock_constancia_retencion_uq" ON "pagos_entradas_stock" USING btree ("comprobante_retencion") WHERE "pagos_entradas_stock"."comprobante_retencion" IS NOT NULL;
--> statement-breakpoint
INSERT INTO "pagos_entradas_stock" (
	"entrada_id", "fecha_pago", "importe_pagado", "medio_pago", "operacion_gravada_igv",
	"exclusion_retencion", "fuente_verificacion_proveedor", "fecha_verificacion_proveedor", "usuario_id"
)
SELECT "id", "fecha", "monto_pagado", coalesce("medio_pago", 'OTRO'), NULL,
	'PENDIENTE', 'Migración de monto pagado agregado; requiere clasificación y verificación tributaria.', "fecha", "usuario_id"
FROM "entradas_stock"
WHERE "monto_pagado" > 0;
