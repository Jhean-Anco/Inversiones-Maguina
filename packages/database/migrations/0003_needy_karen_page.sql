CREATE TABLE "categorias_productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(240),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subcategorias_productos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria_id" uuid NOT NULL,
	"nombre" varchar(100) NOT NULL,
	"descripcion" varchar(240),
	"activo" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp (3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subcategorias_productos" ADD CONSTRAINT "subcategorias_productos_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categorias_productos_nombre_lower_unico" ON "categorias_productos" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "subcategorias_productos_categoria_nombre_lower_unico" ON "subcategorias_productos" USING btree ("categoria_id",lower("nombre"));--> statement-breakpoint
CREATE INDEX "subcategorias_productos_categoria_idx" ON "subcategorias_productos" USING btree ("categoria_id");