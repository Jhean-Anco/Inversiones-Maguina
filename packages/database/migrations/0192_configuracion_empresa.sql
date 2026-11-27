CREATE TABLE "configuracion_empresa" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"razon_social" varchar(200) NOT NULL,
	"nombre_comercial" varchar(200),
	"direccion" varchar(300) NOT NULL,
	"telefono" varchar(60),
	"correo" varchar(160),
	"sitio_web" varchar(160),
	"mensaje_pie" varchar(300),
	"url_consulta_comprobantes" varchar(300),
	"actualizado_por" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracion_empresa_fila_unica_ck" CHECK ("configuracion_empresa"."id" = 1),
	CONSTRAINT "configuracion_empresa_ruc_ck" CHECK ("configuracion_empresa"."ruc" ~ '^(10|15|17|20)[0-9]{9}$'),
	CONSTRAINT "configuracion_empresa_url_consulta_ck" CHECK ("configuracion_empresa"."url_consulta_comprobantes" IS NULL OR "configuracion_empresa"."url_consulta_comprobantes" ~ '^https://')
);
--> statement-breakpoint
ALTER TABLE "configuracion_empresa" ADD CONSTRAINT "configuracion_empresa_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;