CREATE TABLE "tipos_productos_categorias" (
	"tipo_producto_id" uuid NOT NULL,
	"categoria_id" uuid NOT NULL,
	"creado_en" timestamp (3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tipos_productos_categorias_pk" PRIMARY KEY("tipo_producto_id","categoria_id")
);
--> statement-breakpoint
ALTER TABLE "tipos_producto" ADD COLUMN "descripcion" varchar(240);--> statement-breakpoint
ALTER TABLE "tipos_productos_categorias" ADD CONSTRAINT "tipos_productos_categorias_tipo_producto_id_tipos_producto_id_fk" FOREIGN KEY ("tipo_producto_id") REFERENCES "public"."tipos_producto"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tipos_productos_categorias" ADD CONSTRAINT "tipos_productos_categorias_categoria_id_categorias_productos_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias_productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tipos_productos_categorias_categoria_idx" ON "tipos_productos_categorias" USING btree ("categoria_id");UPDATE "tipos_producto" SET "descripcion" = CASE "codigo"
  WHEN 'REPUESTO' THEN 'Pieza que reemplaza o repara un componente de la motocicleta.'
  WHEN 'ACCESORIO' THEN 'Complemento para equipar, proteger o personalizar la motocicleta.'
  WHEN 'CONSUMIBLE' THEN 'Insumo que se consume o reemplaza periódicamente durante el uso o mantenimiento.'
  WHEN 'MOTOCICLETA' THEN 'Motocicleta completa registrada como una unidad de inventario.'
END
WHERE "codigo" IN ('REPUESTO', 'ACCESORIO', 'CONSUMIBLE', 'MOTOCICLETA');

INSERT INTO "categorias_productos" ("nombre", "descripcion") VALUES
  ('Motocicletas', 'Motocicletas completas y unidades vehiculares.')
ON CONFLICT DO NOTHING;

INSERT INTO "tipos_productos_categorias" ("tipo_producto_id", "categoria_id")
SELECT tp."id", cp."id"
FROM (VALUES
  ('REPUESTO', 'Admisión y carburación'), ('REPUESTO', 'Aros y ruedas'), ('REPUESTO', 'Baterías'),
  ('REPUESTO', 'Cables y controles'), ('REPUESTO', 'Carrocería y plásticos'), ('REPUESTO', 'Dirección y mandos'),
  ('REPUESTO', 'Embrague'), ('REPUESTO', 'Escape'), ('REPUESTO', 'Filtros'), ('REPUESTO', 'Frenos'),
  ('REPUESTO', 'Iluminación'), ('REPUESTO', 'Motor'), ('REPUESTO', 'Neumáticos y cámaras'),
  ('REPUESTO', 'Rodamientos y retenes'), ('REPUESTO', 'Sistema eléctrico'), ('REPUESTO', 'Suspensión'), ('REPUESTO', 'Transmisión'),
  ('ACCESORIO', 'Accesorios para moto'), ('ACCESORIO', 'Aros y ruedas'), ('ACCESORIO', 'Carrocería y plásticos'),
  ('ACCESORIO', 'Dirección y mandos'), ('ACCESORIO', 'Escape'), ('ACCESORIO', 'Iluminación'), ('ACCESORIO', 'Seguridad y protección'),
  ('CONSUMIBLE', 'Baterías'), ('CONSUMIBLE', 'Filtros'), ('CONSUMIBLE', 'Lubricantes'), ('CONSUMIBLE', 'Neumáticos y cámaras'),
  ('MOTOCICLETA', 'Motocicletas')
) AS relacion("tipo_codigo", "categoria_nombre")
JOIN "tipos_producto" tp ON tp."codigo" = relacion."tipo_codigo"
JOIN "categorias_productos" cp ON lower(cp."nombre") = lower(relacion."categoria_nombre")
ON CONFLICT DO NOTHING;

