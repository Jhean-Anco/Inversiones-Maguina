CREATE TABLE "entradas_stock_documento_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrada_id" uuid NOT NULL,
	"orden" integer NOT NULL,
	"codigo" varchar(100),
	"descripcion" varchar(500) NOT NULL,
	"unidad" varchar(40),
	"cantidad" numeric(14, 3) NOT NULL,
	"costo_unitario" numeric(14, 4) NOT NULL,
	"descuento" numeric(14, 2) DEFAULT '0' NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"igv" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entradas_stock_documento_detalle_cantidad_ck" CHECK ("entradas_stock_documento_detalle"."cantidad" > 0),
	CONSTRAINT "entradas_stock_documento_detalle_costo_ck" CHECK ("entradas_stock_documento_detalle"."costo_unitario" >= 0),
	CONSTRAINT "entradas_stock_documento_detalle_importes_ck" CHECK ("entradas_stock_documento_detalle"."descuento" >= 0 AND "entradas_stock_documento_detalle"."subtotal" >= 0 AND "entradas_stock_documento_detalle"."igv" >= 0 AND "entradas_stock_documento_detalle"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "entradas_stock" DROP CONSTRAINT "entradas_stock_pago_ck";--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "total_documento" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD COLUMN "detalle_documento_id" uuid;--> statement-breakpoint
ALTER TABLE "entradas_stock_documento_detalle" ADD CONSTRAINT "entradas_stock_documento_detalle_entrada_id_entradas_stock_id_fk" FOREIGN KEY ("entrada_id") REFERENCES "public"."entradas_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entradas_stock_documento_detalle_entrada_idx" ON "entradas_stock_documento_detalle" USING btree ("entrada_id","orden");--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD CONSTRAINT "entradas_stock_detalle_detalle_documento_id_entradas_stock_documento_detalle_id_fk" FOREIGN KEY ("detalle_documento_id") REFERENCES "public"."entradas_stock_documento_detalle"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_pago_ck" CHECK ("entradas_stock"."monto_pagado" IS NULL OR ("entradas_stock"."monto_pagado" >= 0 AND "entradas_stock"."monto_pagado" <= coalesce("entradas_stock"."total_documento", "entradas_stock"."total")));