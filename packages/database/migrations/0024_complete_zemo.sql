CREATE TABLE "configuracion_emisor_facturacion" (
	"codigo" varchar(20) PRIMARY KEY DEFAULT 'PRINCIPAL' NOT NULL,
	"ruc" varchar(11) NOT NULL,
	"razon_social" varchar(180) NOT NULL,
	"nombre_comercial" varchar(180),
	"domicilio_fiscal" varchar(240) NOT NULL,
	"ubigeo" varchar(6),
	"urbanizacion" varchar(100),
	"distrito" varchar(100),
	"provincia" varchar(100),
	"departamento" varchar(100),
	"correo" varchar(254),
	"telefono" varchar(30),
	"logo_url" text,
	"actualizado_por_usuario_id" uuid,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "configuracion_emisor_codigo_ck" CHECK ("configuracion_emisor_facturacion"."codigo" = 'PRINCIPAL'),
	CONSTRAINT "configuracion_emisor_ruc_ck" CHECK ("configuracion_emisor_facturacion"."ruc" ~ '^[0-9]{11}$')
);
--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" DROP CONSTRAINT "nubefact_correlativos_pkey";--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD COLUMN "ambiente" varchar(12) DEFAULT 'DEMO' NOT NULL;--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_ambiente_serie_pk" PRIMARY KEY("ambiente","serie");--> statement-breakpoint
ALTER TABLE "configuracion_emisor_facturacion" ADD CONSTRAINT "configuracion_emisor_facturacion_actualizado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("actualizado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nubefact_correlativos" ADD CONSTRAINT "nubefact_correlativos_ambiente_ck" CHECK ("nubefact_correlativos"."ambiente" IN ('DEMO', 'PRODUCCION'));
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('FACTURACION.LEER', 'FACTURACION', 'LEER', 'Consultar la configuración del emisor.'),
  ('FACTURACION.EMISOR_CONFIGURAR', 'FACTURACION', 'EMISOR_CONFIGURAR', 'Crear y actualizar los datos del emisor.'),
  ('INGRESOS.LEER', 'INGRESOS', 'LEER', 'Consultar productos y clientes para ventas.'),
  ('INGRESOS.CREAR', 'INGRESOS', 'CREAR', 'Registrar una venta e intentar emitir su comprobante.'),
  ('INGRESOS.SERVICIO_PRECIO_MANUAL', 'INGRESOS', 'SERVICIO_PRECIO_MANUAL', 'Ingresar servicios y sus precios manualmente.'),
  ('INVENTARIO.LEER', 'INVENTARIO', 'LEER', 'Consultar catálogo e inventario.'),
  ('INVENTARIO.CREAR', 'INVENTARIO', 'CREAR', 'Registrar productos y entradas de stock.'),
  ('INVENTARIO.EDITAR', 'INVENTARIO', 'EDITAR', 'Editar productos y registrar ajustes de inventario.'),
  ('PERSONAS.LEER', 'PERSONAS', 'LEER', 'Consultar el directorio de clientes.'),
  ('PERSONAS.CREAR', 'PERSONAS', 'CREAR', 'Registrar clientes y proveedores.')
ON CONFLICT ("codigo") DO NOTHING;--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id"
FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE (rol."codigo" = 'ADMINISTRADOR' AND permiso."modulo" IN ('FACTURACION', 'INGRESOS', 'INVENTARIO', 'PERSONAS'))
   OR (rol."codigo" = 'GERENTE' AND permiso."modulo" IN ('FACTURACION', 'INGRESOS', 'INVENTARIO', 'PERSONAS'))
   OR (rol."codigo" IN ('VENDEDOR', 'CAJERO') AND permiso."codigo" IN ('INGRESOS.LEER', 'INGRESOS.CREAR', 'PERSONAS.LEER', 'PERSONAS.CREAR', 'FACTURACION.LEER'))
   OR (rol."codigo" = 'ALMACENERO' AND permiso."modulo" = 'INVENTARIO')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
