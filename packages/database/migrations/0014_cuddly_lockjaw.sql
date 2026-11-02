CREATE TABLE "entradas_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"fecha" date NOT NULL,
	"tipo_documento" varchar(30) NOT NULL,
	"numero_documento" varchar(60),
	"proveedor" varchar(180),
	"observacion" text,
	"total" numeric(14, 2) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entradas_stock_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "entradas_stock_total_no_negativo_ck" CHECK ("entradas_stock"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "entradas_stock_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entrada_id" uuid NOT NULL,
	"producto_id" uuid NOT NULL,
	"presentacion_id" uuid NOT NULL,
	"codigo_producto" varchar(40) NOT NULL,
	"nombre_producto" varchar(180) NOT NULL,
	"presentacion" varchar(100) NOT NULL,
	"unidad_medida_codigo" varchar(3) NOT NULL,
	"cantidad" numeric(14, 3) NOT NULL,
	"factor_a_unidad_base" numeric(14, 6) NOT NULL,
	"cantidad_base" numeric(18, 6) NOT NULL,
	"costo_unitario" numeric(14, 4) NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entradas_stock_detalle_cantidad_positiva_ck" CHECK ("entradas_stock_detalle"."cantidad" > 0),
	CONSTRAINT "entradas_stock_detalle_factor_positivo_ck" CHECK ("entradas_stock_detalle"."factor_a_unidad_base" > 0),
	CONSTRAINT "entradas_stock_detalle_cantidad_base_positiva_ck" CHECK ("entradas_stock_detalle"."cantidad_base" > 0),
	CONSTRAINT "entradas_stock_detalle_costo_no_negativo_ck" CHECK ("entradas_stock_detalle"."costo_unitario" >= 0)
);
--> statement-breakpoint
CREATE TABLE "movimientos_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"origen_tipo" varchar(30) NOT NULL,
	"origen_id" uuid NOT NULL,
	"origen_detalle_id" uuid NOT NULL,
	"cantidad_base" numeric(18, 6) NOT NULL,
	"costo_unitario_base" numeric(14, 6) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movimientos_stock_tipo_ck" CHECK ("movimientos_stock"."tipo" IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
	CONSTRAINT "movimientos_stock_cantidad_positiva_ck" CHECK ("movimientos_stock"."cantidad_base" > 0),
	CONSTRAINT "movimientos_stock_costo_no_negativo_ck" CHECK ("movimientos_stock"."costo_unitario_base" >= 0)
);
--> statement-breakpoint
CREATE TABLE "saldos_stock" (
	"producto_id" uuid PRIMARY KEY NOT NULL,
	"cantidad" numeric(18, 6) DEFAULT '0' NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saldos_stock_cantidad_no_negativa_ck" CHECK ("saldos_stock"."cantidad" >= 0)
);
--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD CONSTRAINT "entradas_stock_detalle_entrada_id_entradas_stock_id_fk" FOREIGN KEY ("entrada_id") REFERENCES "public"."entradas_stock"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD CONSTRAINT "entradas_stock_detalle_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD CONSTRAINT "entradas_stock_detalle_presentacion_id_productos_presentaciones_id_fk" FOREIGN KEY ("presentacion_id") REFERENCES "public"."productos_presentaciones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entradas_stock_detalle" ADD CONSTRAINT "entradas_stock_detalle_unidad_medida_codigo_unidades_medida_codigo_fk" FOREIGN KEY ("unidad_medida_codigo") REFERENCES "public"."unidades_medida"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saldos_stock" ADD CONSTRAINT "saldos_stock_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entradas_stock_fecha_idx" ON "entradas_stock" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "entradas_stock_proveedor_idx" ON "entradas_stock" USING btree ("proveedor");--> statement-breakpoint
CREATE INDEX "entradas_stock_detalle_entrada_idx" ON "entradas_stock_detalle" USING btree ("entrada_id");--> statement-breakpoint
CREATE INDEX "entradas_stock_detalle_producto_idx" ON "entradas_stock_detalle" USING btree ("producto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "movimientos_stock_origen_detalle_unico" ON "movimientos_stock" USING btree ("origen_tipo","origen_detalle_id");--> statement-breakpoint
CREATE INDEX "movimientos_stock_producto_fecha_idx" ON "movimientos_stock" USING btree ("producto_id","creado_en");