CREATE TABLE "cuentas_financieras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" varchar(24) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"entidad" varchar(100),
	"titular" varchar(160),
	"moneda" varchar(3) DEFAULT 'PEN' NOT NULL,
	"numero_cuenta" varchar(100),
	"cci" varchar(100),
	"numero_tarjeta" varchar(30),
	"telefono" varchar(30),
	"observacion" text,
	"activa" boolean DEFAULT true NOT NULL,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cuentas_financieras_tipo_ck" CHECK ("tipo" IN ('EFECTIVO', 'BANCO', 'BILLETERA', 'TARJETA')),
	CONSTRAINT "cuentas_financieras_moneda_ck" CHECK ("moneda" IN ('PEN', 'USD', 'EUR')),
	CONSTRAINT "cuentas_financieras_nombre_ck" CHECK (length(trim("nombre")) BETWEEN 2 AND 100),
	CONSTRAINT "cuentas_financieras_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX "cuentas_financieras_tipo_activa_idx" ON "cuentas_financieras" USING btree ("tipo","activa");
--> statement-breakpoint
ALTER TABLE "pagos_compras_mototaxis" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "pagos_compras_mototaxis" ADD CONSTRAINT "pagos_compras_mototaxis_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "pagos_compras_mototaxis_cuenta_idx" ON "pagos_compras_mototaxis" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "entradas_stock" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "entradas_stock" ADD CONSTRAINT "entradas_stock_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "entradas_stock_cuenta_idx" ON "entradas_stock" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "pagos_entradas_stock" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "pagos_entradas_stock" ADD CONSTRAINT "pagos_entradas_stock_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "pagos_entradas_stock_cuenta_idx" ON "pagos_entradas_stock" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "egresos_registros_cuenta_idx" ON "egresos_registros" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "egresos_pagos" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "egresos_pagos" ADD CONSTRAINT "egresos_pagos_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "egresos_pagos_cuenta_idx" ON "egresos_pagos" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "ingresos" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "ingresos" ADD CONSTRAINT "ingresos_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "ingresos_cuenta_idx" ON "ingresos" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
ALTER TABLE "ingresos_pagos" ADD COLUMN "cuenta_financiera_id" uuid;
ALTER TABLE "ingresos_pagos" ADD CONSTRAINT "ingresos_pagos_cuenta_fk" FOREIGN KEY ("cuenta_financiera_id") REFERENCES "cuentas_financieras"("id") ON DELETE RESTRICT;
CREATE INDEX "ingresos_pagos_cuenta_idx" ON "ingresos_pagos" USING btree ("cuenta_financiera_id");
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
	('FINANZAS.LEER','FINANZAS','LEER','Consultar cuentas financieras y medios de pago.'),
	('FINANZAS.ADMINISTRAR','FINANZAS','ADMINISTRAR','Registrar, editar y desactivar cuentas financieras.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permisos" p
WHERE (r."codigo" IN ('ADMINISTRADOR','GERENTE') AND p."modulo"='FINANZAS')
   OR (r."codigo" IN ('CAJERO','VENDEDOR','ALMACENERO') AND p."codigo"='FINANZAS.LEER')
ON CONFLICT ("rol_id","permiso_id") DO NOTHING;
