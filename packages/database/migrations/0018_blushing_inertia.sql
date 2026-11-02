CREATE TABLE "ingresos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"fecha" date NOT NULL,
	"cliente_tipo_documento" varchar(10),
	"cliente_numero_documento" varchar(20),
	"cliente_nombre" varchar(180),
	"medio_pago" varchar(30) NOT NULL,
	"observacion" text,
	"subtotal" numeric(14, 2) NOT NULL,
	"igv" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"estado" varchar(20) DEFAULT 'REGISTRADO' NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "ingresos_medio_pago_ck" CHECK ("ingresos"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')),
	CONSTRAINT "ingresos_totales_no_negativos_ck" CHECK ("ingresos"."subtotal" >= 0 AND "ingresos"."igv" >= 0 AND "ingresos"."total" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ingresos_detalle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingreso_id" uuid NOT NULL,
	"tipo" varchar(20) NOT NULL,
	"producto_id" uuid,
	"presentacion_id" uuid,
	"codigo_producto" varchar(40),
	"descripcion" varchar(240) NOT NULL,
	"presentacion" varchar(100),
	"unidad_medida_codigo" varchar(3),
	"cantidad" numeric(14, 3) NOT NULL,
	"factor_a_unidad_base" numeric(14, 6),
	"cantidad_base" numeric(18, 6),
	"precio_unitario" numeric(14, 4) NOT NULL,
	"afecto_igv" boolean NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"igv" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingresos_detalle_tipo_ck" CHECK ("ingresos_detalle"."tipo" IN ('PRODUCTO', 'SERVICIO')),
	CONSTRAINT "ingresos_detalle_tipo_relacion_ck" CHECK (("ingresos_detalle"."tipo" = 'PRODUCTO' AND "ingresos_detalle"."producto_id" IS NOT NULL AND "ingresos_detalle"."presentacion_id" IS NOT NULL AND "ingresos_detalle"."factor_a_unidad_base" > 0 AND "ingresos_detalle"."cantidad_base" > 0) OR ("ingresos_detalle"."tipo" = 'SERVICIO' AND "ingresos_detalle"."producto_id" IS NULL AND "ingresos_detalle"."presentacion_id" IS NULL)),
	CONSTRAINT "ingresos_detalle_cantidad_positiva_ck" CHECK ("ingresos_detalle"."cantidad" > 0),
	CONSTRAINT "ingresos_detalle_precio_no_negativo_ck" CHECK ("ingresos_detalle"."precio_unitario" >= 0),
	CONSTRAINT "ingresos_detalle_totales_no_negativos_ck" CHECK ("ingresos_detalle"."subtotal" >= 0 AND "ingresos_detalle"."igv" >= 0 AND "ingresos_detalle"."total" >= 0)
);
--> statement-breakpoint
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_presentacion_id_productos_presentaciones_id_fk" FOREIGN KEY ("presentacion_id") REFERENCES "public"."productos_presentaciones"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_unidad_medida_codigo_unidades_medida_codigo_fk" FOREIGN KEY ("unidad_medida_codigo") REFERENCES "public"."unidades_medida"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingresos_fecha_idx" ON "ingresos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "ingresos_cliente_documento_idx" ON "ingresos" USING btree ("cliente_tipo_documento","cliente_numero_documento");--> statement-breakpoint
CREATE INDEX "ingresos_detalle_ingreso_idx" ON "ingresos_detalle" USING btree ("ingreso_id");--> statement-breakpoint
CREATE INDEX "ingresos_detalle_producto_idx" ON "ingresos_detalle" USING btree ("producto_id");
