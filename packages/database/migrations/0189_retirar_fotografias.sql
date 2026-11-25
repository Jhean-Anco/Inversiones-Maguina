-- Retira las fotografias del sistema (productos, categorias, marcas y modelos de mototaxi).
-- Es idempotente: entornos que ya no tienen estas estructuras no fallan.
-- Los documentos fiscales y adjuntos de archivos_locales NO se tocan; solo se borran
-- los registros que referenciaba imagenes_mototaxis.

DO $$
BEGIN
  IF to_regclass('public.imagenes_mototaxis') IS NOT NULL THEN
    CREATE TEMP TABLE fotos_archivos_retirados ON COMMIT DROP AS
      SELECT archivo_id AS id FROM imagenes_mototaxis;
    DROP TABLE imagenes_mototaxis;
    DELETE FROM archivos_locales WHERE id IN (SELECT id FROM fotos_archivos_retirados);
  END IF;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "productos_imagenes";--> statement-breakpoint
ALTER TABLE "categorias_productos" DROP COLUMN IF EXISTS "ruta_imagen";--> statement-breakpoint
ALTER TABLE "marcas_productos" DROP COLUMN IF EXISTS "ruta_imagen";--> statement-breakpoint
ALTER TABLE "productos" DROP COLUMN IF EXISTS "ruta_imagen";--> statement-breakpoint
ALTER TABLE "modelos_mototaxis" DROP COLUMN IF EXISTS "ruta_imagen";
