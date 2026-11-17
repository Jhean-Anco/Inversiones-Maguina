DROP TABLE "imagenes_mototaxis" CASCADE;--> statement-breakpoint
DROP TABLE "productos_imagenes" CASCADE;--> statement-breakpoint
DELETE FROM "archivos_locales" WHERE lower("mime_type") LIKE 'image/%' OR "tipo_archivo" IN ('FOTO_REPUESTO', 'FOTO_CATEGORIA', 'FOTO_MARCA', 'FOTO_MOTOTAXI', 'EVIDENCIA_COMPRA');--> statement-breakpoint
ALTER TABLE "categorias_productos" DROP COLUMN "ruta_imagen";--> statement-breakpoint
ALTER TABLE "entradas_stock" DROP COLUMN "evidencia_ruta";--> statement-breakpoint
ALTER TABLE "entradas_stock" DROP COLUMN "evidencia_nombre";--> statement-breakpoint
ALTER TABLE "entradas_stock" DROP COLUMN "evidencia_mime";--> statement-breakpoint
ALTER TABLE "marcas_productos" DROP COLUMN "ruta_imagen";--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" DROP COLUMN "ruta_imagen";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN "ruta_imagen";
