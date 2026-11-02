CREATE TABLE "declaraciones_igv_621" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"periodo" varchar(6) NOT NULL,
	"tipo" varchar(16) NOT NULL,
	"saldo_igv_anterior" numeric(14, 2) NOT NULL,
	"saldo_igv_final" numeric(14, 2) NOT NULL,
	"percepciones_aplicadas" numeric(14, 2) NOT NULL,
	"saldo_percepciones_final" numeric(14, 2) NOT NULL,
	"retenciones_periodo_aplicadas" numeric(14, 2) NOT NULL,
	"retenciones_anteriores_aplicadas" numeric(14, 2) NOT NULL,
	"saldo_retenciones_final" numeric(14, 2) NOT NULL,
	"pagos_previos" numeric(14, 2) NOT NULL,
	"total_deuda" numeric(14, 2) NOT NULL,
	"importe_pagado" numeric(14, 2) NOT NULL,
	"constancia" varchar(120) NOT NULL,
	"fecha_presentacion" date NOT NULL,
	"fuente_verificacion" varchar(240) NOT NULL,
	"fecha_verificacion" date NOT NULL,
	"verificada" boolean DEFAULT false NOT NULL,
	"observacion" varchar(1000),
	"usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "declaraciones_igv_621_ruc_ck" CHECK ("declaraciones_igv_621"."ruc" ~ '^[0-9]{11}$'),
	CONSTRAINT "declaraciones_igv_621_periodo_ck" CHECK ("declaraciones_igv_621"."periodo" ~ '^[0-9]{4}(0[1-9]|1[0-2])$'),
	CONSTRAINT "declaraciones_igv_621_tipo_ck" CHECK ("declaraciones_igv_621"."tipo" IN ('ORIGINAL', 'SUSTITUTORIA', 'RECTIFICATORIA')),
	CONSTRAINT "declaraciones_igv_621_importes_ck" CHECK ("declaraciones_igv_621"."saldo_igv_anterior" >= 0 AND "declaraciones_igv_621"."saldo_igv_final" >= 0 AND "declaraciones_igv_621"."percepciones_aplicadas" >= 0 AND "declaraciones_igv_621"."saldo_percepciones_final" >= 0 AND "declaraciones_igv_621"."retenciones_periodo_aplicadas" >= 0 AND "declaraciones_igv_621"."retenciones_anteriores_aplicadas" >= 0 AND "declaraciones_igv_621"."saldo_retenciones_final" >= 0 AND "declaraciones_igv_621"."pagos_previos" >= 0 AND "declaraciones_igv_621"."total_deuda" >= 0 AND "declaraciones_igv_621"."importe_pagado" >= 0),
	CONSTRAINT "declaraciones_igv_621_referencia_ck" CHECK (length(trim("declaraciones_igv_621"."constancia")) > 0 AND length(trim("declaraciones_igv_621"."fuente_verificacion")) > 0)
);
--> statement-breakpoint
ALTER TABLE "declaraciones_igv_621" ADD CONSTRAINT "declaraciones_igv_621_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "declaraciones_igv_621_ruc_periodo_idx" ON "declaraciones_igv_621" USING btree ("ruc","periodo","creado_en");
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('TRIBUTOS.GESTIONAR', 'TRIBUTOS', 'GESTIONAR', 'Registrar y verificar declaraciones IGV 621 y sus saldos arrastrables.')
ON CONFLICT ("codigo") DO NOTHING;--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id"
FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" IN ('ADMINISTRADOR', 'GERENTE') AND permiso."codigo" = 'TRIBUTOS.GESTIONAR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
