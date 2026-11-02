CREATE TABLE "historial_perfil_fiscal_emisor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuracion_codigo" varchar(20) DEFAULT 'PRINCIPAL' NOT NULL,
	"perfil" jsonb NOT NULL,
	"fuente" varchar(240) NOT NULL,
	"fecha_consulta" date NOT NULL,
	"usuario_id" uuid,
	"confirmado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "historial_perfil_fiscal_emisor" ADD CONSTRAINT "historial_perfil_fiscal_emisor_configuracion_codigo_configuracion_emisor_facturacion_codigo_fk" FOREIGN KEY ("configuracion_codigo") REFERENCES "public"."configuracion_emisor_facturacion"("codigo") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "historial_perfil_fiscal_emisor" ADD CONSTRAINT "historial_perfil_fiscal_emisor_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "historial_perfil_fiscal_emisor_confirmado_idx" ON "historial_perfil_fiscal_emisor" USING btree ("confirmado_en");