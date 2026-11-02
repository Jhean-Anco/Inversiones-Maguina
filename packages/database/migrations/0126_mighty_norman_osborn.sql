ALTER TABLE "reglas_tributarias" ADD COLUMN "componentes_igv_ipm" jsonb;
UPDATE "reglas_tributarias"
SET "componentes_igv_ipm" = CASE
  WHEN "vigente_desde" < DATE '2026-01-01' THEN '{"igv":16,"ipm":2}'::jsonb
  ELSE '{"igv":15.5,"ipm":2.5}'::jsonb
END;
ALTER TABLE "reglas_tributarias" ALTER COLUMN "componentes_igv_ipm" SET NOT NULL;
