CREATE TABLE "precios_productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"presentacion_id" uuid NOT NULL,
	"tipo_lista_precio_id" uuid NOT NULL,
	"precio" numeric(12, 2) NOT NULL,
	"cantidad_minima" numeric(14, 3) DEFAULT '1' NOT NULL,
	"vigente_desde" timestamp (3) with time zone,
	"vigente_hasta" timestamp (3) with time zone,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "precios_productos_precio_no_negativo_ck" CHECK ("precios_productos"."precio" >= 0),
	CONSTRAINT "precios_productos_cantidad_positiva_ck" CHECK ("precios_productos"."cantidad_minima" > 0),
	CONSTRAINT "precios_productos_vigencia_ck" CHECK ("precios_productos"."vigente_hasta" IS NULL OR "precios_productos"."vigente_desde" IS NULL OR "precios_productos"."vigente_hasta" > "precios_productos"."vigente_desde")
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_interno" varchar(40) NOT NULL,
	"nombre" varchar(180) NOT NULL,
	"descripcion" text,
	"tipo_producto_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"marca_id" uuid NOT NULL,
	"unidad_base_codigo" varchar(3) NOT NULL,
	"afecto_igv" boolean DEFAULT true NOT NULL,
	"ruta_imagen" text,
	"ficha_tecnica" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_codigo_interno_unique" UNIQUE("codigo_interno")
);
--> statement-breakpoint
CREATE TABLE "productos_codigos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"codigo" varchar(100) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos_presentaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"producto_id" uuid NOT NULL,
	"unidad_medida_codigo" varchar(3) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"factor_a_unidad_base" numeric(14, 6) NOT NULL,
	"se_compra" boolean DEFAULT false NOT NULL,
	"se_vende" boolean DEFAULT true NOT NULL,
	"es_base" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "productos_presentaciones_factor_positivo_ck" CHECK ("productos_presentaciones"."factor_a_unidad_base" > 0),
	CONSTRAINT "productos_presentaciones_rol_ck" CHECK ("productos_presentaciones"."se_compra" OR "productos_presentaciones"."se_vende")
);
--> statement-breakpoint
CREATE TABLE "tipos_listas_precio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_listas_precio_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_listas_precio_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tipos_producto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_producto_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_producto_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "unidades_medida" (
	"codigo" varchar(3) PRIMARY KEY NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_presentacion_id_productos_presentaciones_id_fk" FOREIGN KEY ("presentacion_id") REFERENCES "public"."productos_presentaciones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "precios_productos" ADD CONSTRAINT "precios_productos_tipo_lista_precio_id_tipos_listas_precio_id_fk" FOREIGN KEY ("tipo_lista_precio_id") REFERENCES "public"."tipos_listas_precio"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_tipo_producto_id_tipos_producto_id_fk" FOREIGN KEY ("tipo_producto_id") REFERENCES "public"."tipos_producto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_marca_id_marcas_productos_id_fk" FOREIGN KEY ("marca_id") REFERENCES "public"."marcas_productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_unidad_base_codigo_unidades_medida_codigo_fk" FOREIGN KEY ("unidad_base_codigo") REFERENCES "public"."unidades_medida"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos_codigos" ADD CONSTRAINT "productos_codigos_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos_presentaciones" ADD CONSTRAINT "productos_presentaciones_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos_presentaciones" ADD CONSTRAINT "productos_presentaciones_unidad_medida_codigo_unidades_medida_codigo_fk" FOREIGN KEY ("unidad_medida_codigo") REFERENCES "public"."unidades_medida"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "precios_productos_consulta_idx" ON "precios_productos" USING btree ("producto_id","tipo_lista_precio_id","activo");--> statement-breakpoint
CREATE INDEX "productos_nombre_idx" ON "productos" USING btree ("nombre");--> statement-breakpoint
CREATE INDEX "productos_categoria_marca_idx" ON "productos" USING btree ("categoria_id","marca_id");--> statement-breakpoint
CREATE INDEX "productos_tipo_activo_idx" ON "productos" USING btree ("tipo_producto_id","activo");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_codigos_tipo_codigo_unico" ON "productos_codigos" USING btree ("tipo",lower("codigo"));--> statement-breakpoint
CREATE INDEX "productos_codigos_producto_idx" ON "productos_codigos" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "productos_presentaciones_producto_idx" ON "productos_presentaciones" USING btree ("producto_id");--> statement-breakpoint
CREATE UNIQUE INDEX "productos_presentaciones_base_unica" ON "productos_presentaciones" USING btree ("producto_id") WHERE "productos_presentaciones"."es_base";
--> statement-breakpoint
INSERT INTO "tipos_producto" ("codigo", "nombre") VALUES
	('REPUESTO', 'Repuesto'),
	('ACCESORIO', 'Accesorio'),
	('CONSUMIBLE', 'Consumible'),
	('MOTOCICLETA', 'Motocicleta')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "unidades_medida" ("codigo", "nombre") VALUES
	('NIU', 'Unidad (bien)'),
	('ZZ', 'Unidad (servicio)'),
	('BX', 'Caja'),
	('CS', 'Caja de envío'),
	('CT', 'Cartón'),
	('SET', 'Juego'),
	('KT', 'Kit'),
	('PR', 'Par'),
	('DZN', 'Docena'),
	('OP', 'Paquete de dos'),
	('P3', 'Paquete de tres'),
	('BG', 'Bolsa'),
	('BO', 'Botella'),
	('BJ', 'Balde'),
	('CA', 'Lata'),
	('CY', 'Cilindro'),
	('LTR', 'Litro'),
	('MLT', 'Mililitro'),
	('KGM', 'Kilogramo'),
	('GRM', 'Gramo'),
	('MTR', 'Metro'),
	('CMT', 'Centímetro'),
	('MMT', 'Milímetro'),
	('GLL', 'Galón'),
	('TNE', 'Tonelada métrica')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tipos_listas_precio" ("codigo", "nombre") VALUES
	('GENERAL', 'General'),
	('MAYORISTA', 'Al por mayor'),
	('DESCUENTO', 'Descuento'),
	('LIQUIDACION', 'Liquidación'),
	('REMATE', 'Remate')
ON CONFLICT ("codigo") DO NOTHING;
