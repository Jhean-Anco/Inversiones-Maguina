CREATE TABLE "cargos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(240),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cargos_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "cargos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "permisos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(100) NOT NULL,
	"modulo" varchar(60) NOT NULL,
	"accion" varchar(60) NOT NULL,
	"descripcion" varchar(240),
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permisos_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_persona" varchar(12) DEFAULT 'NATURAL' NOT NULL,
	"nombres" varchar(120),
	"apellido_paterno" varchar(120),
	"apellido_materno" varchar(120),
	"razon_social" varchar(180),
	"tipo_documento_id" uuid NOT NULL,
	"numero_documento" varchar(30) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "personas_tipo_y_nombre_ck" CHECK ((
    ("personas"."tipo_persona" = 'NATURAL' AND "personas"."nombres" IS NOT NULL AND "personas"."apellido_paterno" IS NOT NULL AND "personas"."razon_social" IS NULL)
    OR ("personas"."tipo_persona" = 'JURIDICA' AND "personas"."razon_social" IS NOT NULL AND "personas"."nombres" IS NULL AND "personas"."apellido_paterno" IS NULL AND "personas"."apellido_materno" IS NULL)
  ))
);
--> statement-breakpoint
CREATE TABLE "personas_contactos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"persona_id" uuid NOT NULL,
	"tipo_contacto_id" uuid NOT NULL,
	"valor" varchar(254) NOT NULL,
	"etiqueta" varchar(80),
	"es_principal" boolean DEFAULT false NOT NULL,
	"verificado_en" timestamp (3) with time zone,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(40) NOT NULL,
	"nombre" varchar(80) NOT NULL,
	"descripcion" varchar(240),
	"es_sistema" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "roles_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "roles_permisos" (
	"rol_id" uuid NOT NULL,
	"permiso_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_permisos_rol_id_permiso_id_pk" PRIMARY KEY("rol_id","permiso_id")
);
--> statement-breakpoint
CREATE TABLE "tipos_contacto" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_contacto_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_contacto_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "tipos_documento" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" varchar(30) NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"longitud_minima" integer,
	"longitud_maxima" integer,
	"solo_numeros" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_documento_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "tipos_documento_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "trabajadores" (
	"persona_id" uuid PRIMARY KEY NOT NULL,
	"codigo_trabajador" varchar(30),
	"cargo_id" uuid,
	"fecha_ingreso" date NOT NULL,
	"fecha_cese" date,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trabajadores_codigo_trabajador_unique" UNIQUE("codigo_trabajador"),
	CONSTRAINT "trabajadores_fechas_ck" CHECK ("trabajadores"."fecha_cese" IS NULL OR "trabajadores"."fecha_cese" >= "trabajadores"."fecha_ingreso")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trabajador_id" uuid NOT NULL,
	"nombre_usuario" varchar(60) NOT NULL,
	"correo" varchar(254) NOT NULL,
	"contrasena_hash" varchar(255) NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"requiere_cambio_contrasena" boolean DEFAULT true NOT NULL,
	"ultimo_acceso_en" timestamp (3) with time zone,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_trabajador_id_unique" UNIQUE("trabajador_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios_roles" (
	"usuario_id" uuid NOT NULL,
	"rol_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"asignado_por_usuario_id" uuid,
	CONSTRAINT "usuarios_roles_usuario_id_rol_id_pk" PRIMARY KEY("usuario_id","rol_id")
);
--> statement-breakpoint
ALTER TABLE "personas" ADD CONSTRAINT "personas_tipo_documento_id_tipos_documento_id_fk" FOREIGN KEY ("tipo_documento_id") REFERENCES "public"."tipos_documento"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas_contactos" ADD CONSTRAINT "personas_contactos_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personas_contactos" ADD CONSTRAINT "personas_contactos_tipo_contacto_id_tipos_contacto_id_fk" FOREIGN KEY ("tipo_contacto_id") REFERENCES "public"."tipos_contacto"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles_permisos" ADD CONSTRAINT "roles_permisos_permiso_id_permisos_id_fk" FOREIGN KEY ("permiso_id") REFERENCES "public"."permisos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajadores" ADD CONSTRAINT "trabajadores_persona_id_personas_id_fk" FOREIGN KEY ("persona_id") REFERENCES "public"."personas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trabajadores" ADD CONSTRAINT "trabajadores_cargo_id_cargos_id_fk" FOREIGN KEY ("cargo_id") REFERENCES "public"."cargos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_trabajador_id_trabajadores_persona_id_fk" FOREIGN KEY ("trabajador_id") REFERENCES "public"."trabajadores"("persona_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_rol_id_roles_id_fk" FOREIGN KEY ("rol_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios_roles" ADD CONSTRAINT "usuarios_roles_asignado_por_usuario_id_usuarios_id_fk" FOREIGN KEY ("asignado_por_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "permisos_modulo_accion_unico" ON "permisos" USING btree ("modulo","accion");--> statement-breakpoint
CREATE UNIQUE INDEX "personas_documento_unico" ON "personas" USING btree ("tipo_documento_id","numero_documento");--> statement-breakpoint
CREATE INDEX "personas_nombre_idx" ON "personas" USING btree ("apellido_paterno","apellido_materno","nombres");--> statement-breakpoint
CREATE INDEX "personas_contactos_persona_tipo_idx" ON "personas_contactos" USING btree ("persona_id","tipo_contacto_id");--> statement-breakpoint
CREATE INDEX "personas_contactos_tipo_valor_idx" ON "personas_contactos" USING btree ("tipo_contacto_id","valor");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_nombre_usuario_lower_unico" ON "usuarios" USING btree (lower("nombre_usuario"));--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_correo_lower_unico" ON "usuarios" USING btree (lower("correo"));