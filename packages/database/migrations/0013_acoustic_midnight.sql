ALTER TABLE "productos" DROP CONSTRAINT "productos_tipo_producto_id_tipos_producto_id_fk";
--> statement-breakpoint
DROP INDEX "productos_tipo_activo_idx";
--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN "tipo_producto_id";
--> statement-breakpoint
DROP TABLE "tipos_productos_categorias";
--> statement-breakpoint
DROP TABLE "tipos_producto";
