CREATE TABLE "productos_imagenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"ruta_imagen" text NOT NULL,
	"orden" integer NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_imagenes_orden_ck" CHECK ("productos_imagenes"."orden" BETWEEN 1 AND 5)
);
--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "proveedor_tipo_persona" varchar(20);--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "proveedor_tipo_documento" varchar(10);--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "proveedor_numero_documento" varchar(11);--> statement-breakpoint
ALTER TABLE "productos_imagenes" ADD CONSTRAINT "productos_imagenes_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "productos_imagenes_producto_orden_unico" ON "productos_imagenes" USING btree ("producto_id","orden");--> statement-breakpoint
CREATE INDEX "productos_imagenes_producto_idx" ON "productos_imagenes" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "entradas_stock_proveedor_documento_idx" ON "entradas_stock" USING btree ("proveedor_tipo_documento","proveedor_numero_documento");--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_proveedor_persona_ck" CHECK ("entradas_stock"."proveedor_tipo_persona" IS NULL OR "entradas_stock"."proveedor_tipo_persona" IN ('NATURAL', 'JURIDICA'));--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_proveedor_documento_tipo_ck" CHECK ("entradas_stock"."proveedor_tipo_documento" IS NULL OR "entradas_stock"."proveedor_tipo_documento" IN ('DNI', 'RUC'));--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_proveedor_documento_numero_ck" CHECK ("entradas_stock"."proveedor_numero_documento" IS NULL OR ("entradas_stock"."proveedor_tipo_documento" = 'DNI' AND "entradas_stock"."proveedor_numero_documento" ~ '^[0-9]{8}$') OR ("entradas_stock"."proveedor_tipo_documento" = 'RUC' AND "entradas_stock"."proveedor_numero_documento" ~ '^[0-9]{11}$'));--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_proveedor_juridico_ruc_ck" CHECK ("entradas_stock"."proveedor_tipo_persona" IS DISTINCT FROM 'JURIDICA' OR "entradas_stock"."proveedor_tipo_documento" = 'RUC');
--> statement-breakpoint
INSERT INTO productos_imagenes (producto_id, ruta_imagen, orden)
SELECT id, ruta_imagen, 1 FROM productos WHERE ruta_imagen IS NOT NULL;
