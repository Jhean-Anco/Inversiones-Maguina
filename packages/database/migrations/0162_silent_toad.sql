CREATE TABLE "cotizaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(24) NOT NULL,
	"cliente_id" uuid NOT NULL,
	"detalles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"observacion" text,
	"estado" varchar(20) DEFAULT 'BORRADOR' NOT NULL,
	"fecha" date NOT NULL,
	"vigente_hasta" date,
	"ingreso_id" uuid,
	"clave_emision" varchar(36) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cotizaciones_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "cotizaciones_clave_emision_unique" UNIQUE("clave_emision"),
	CONSTRAINT "cotizaciones_estado_ck" CHECK ("cotizaciones"."estado" IN ('BORRADOR', 'ENVIADA', 'ACEPTADA', 'RECHAZADA', 'VENCIDA', 'CONVERTIDA', 'ANULADA'))
);
--> statement-breakpoint
CREATE TABLE "ordenes_servicio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(24) NOT NULL,
	"cliente_id" uuid NOT NULL,
	"vehiculo_placa" varchar(20) NOT NULL,
	"vehiculo_vin" varchar(40),
	"vehiculo_marca" varchar(100),
	"vehiculo_modelo" varchar(100),
	"motivo" text NOT NULL,
	"diagnostico" text,
	"notas_trabajo" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"detalles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estado" varchar(24) DEFAULT 'ABIERTA' NOT NULL,
	"fecha_recepcion" date NOT NULL,
	"fecha_cierre" date,
	"ingreso_id" uuid,
	"clave_emision" varchar(36) NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ordenes_servicio_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "ordenes_servicio_clave_emision_unique" UNIQUE("clave_emision"),
	CONSTRAINT "ordenes_servicio_estado_ck" CHECK ("ordenes_servicio"."estado" IN ('ABIERTA', 'EN_PROCESO', 'ESPERANDO_REPUESTOS', 'COMPLETADA', 'EMITIENDO', 'FACTURADA', 'ANULADA'))
);
--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_cliente_id_clientes_persona_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("persona_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cotizaciones" ADD CONSTRAINT "cotizaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_cliente_id_clientes_persona_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("persona_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_ingreso_id_ingresos_id_fk" FOREIGN KEY ("ingreso_id") REFERENCES "public"."ingresos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ordenes_servicio" ADD CONSTRAINT "ordenes_servicio_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cotizaciones_cliente_fecha_idx" ON "cotizaciones" USING btree ("cliente_id","fecha");--> statement-breakpoint
CREATE INDEX "cotizaciones_estado_fecha_idx" ON "cotizaciones" USING btree ("estado","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "cotizaciones_ingreso_uq" ON "cotizaciones" USING btree ("ingreso_id") WHERE "cotizaciones"."ingreso_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "ordenes_servicio_cliente_fecha_idx" ON "ordenes_servicio" USING btree ("cliente_id","fecha_recepcion");--> statement-breakpoint
CREATE INDEX "ordenes_servicio_vehiculo_idx" ON "ordenes_servicio" USING btree ("vehiculo_placa","vehiculo_vin");--> statement-breakpoint
CREATE INDEX "ordenes_servicio_estado_idx" ON "ordenes_servicio" USING btree ("estado","actualizado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "ordenes_servicio_ingreso_uq" ON "ordenes_servicio" USING btree ("ingreso_id") WHERE "ordenes_servicio"."ingreso_id" IS NOT NULL;