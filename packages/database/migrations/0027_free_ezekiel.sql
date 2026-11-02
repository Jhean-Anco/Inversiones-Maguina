CREATE TABLE "egresos_registros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"tipo" varchar(30) NOT NULL,
	"fecha" date NOT NULL,
	"categoria" varchar(80) NOT NULL,
	"concepto" varchar(240) NOT NULL,
	"beneficiario" varchar(180),
	"documento_tipo" varchar(30),
	"documento_numero" varchar(60),
	"medio_pago" varchar(30) NOT NULL,
	"monto" numeric(14, 2) NOT NULL,
	"identificador_activo" varchar(100),
	"observacion" text,
	"usuario_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "egresos_registros_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "egresos_registros_tipo_ck" CHECK ("egresos_registros"."tipo" IN ('GASTO_OPERATIVO', 'SERVICIO_PERSONAL', 'ACTIVO_HERRAMIENTA')),
	CONSTRAINT "egresos_registros_medio_pago_ck" CHECK ("egresos_registros"."medio_pago" IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'BILLETERA_DIGITAL', 'OTRO')),
	CONSTRAINT "egresos_registros_monto_positivo_ck" CHECK ("egresos_registros"."monto" > 0)
);
--> statement-breakpoint
ALTER TABLE "egresos_registros" ADD CONSTRAINT "egresos_registros_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "egresos_registros_tipo_fecha_idx" ON "egresos_registros" USING btree ("tipo","fecha");--> statement-breakpoint
CREATE INDEX "egresos_registros_beneficiario_idx" ON "egresos_registros" USING btree ("beneficiario");
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
	('EGRESOS.LEER', 'EGRESOS', 'LEER', 'Consultar gastos operativos, servicios, personal y activos.'),
	('EGRESOS.CREAR', 'EGRESOS', 'CREAR', 'Registrar egresos operativos, servicios, personal y activos.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id"
FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" IN ('ADMINISTRADOR', 'GERENTE') AND permiso."modulo" = 'EGRESOS'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
