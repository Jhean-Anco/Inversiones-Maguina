ALTER TABLE "reglas_tributarias" ADD COLUMN "tasas_spot_bienes" jsonb;
UPDATE "reglas_tributarias"
SET "tasas_spot_bienes" = '{"005":4,"007":10,"008":4,"009":10,"010":15,"011":10,"014":4,"016":10,"017":4,"023":4,"031":10,"032":10,"034":10,"035":1.5,"036":1.5,"039":10,"041":15,"045":10}'::jsonb;
ALTER TABLE "reglas_tributarias" ALTER COLUMN "tasas_spot_bienes" SET NOT NULL;
