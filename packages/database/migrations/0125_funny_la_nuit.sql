ALTER TABLE "reglas_tributarias" ADD COLUMN "codigos_spot_bienes_sin_umbral" jsonb;
UPDATE "reglas_tributarias" SET "codigos_spot_bienes_sin_umbral" = '["010","031","034","036"]'::jsonb;
ALTER TABLE "reglas_tributarias" ALTER COLUMN "codigos_spot_bienes_sin_umbral" SET NOT NULL;
