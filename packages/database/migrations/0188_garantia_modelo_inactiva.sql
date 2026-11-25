ALTER TABLE "garantias_modelos_mototaxis" DROP CONSTRAINT IF EXISTS "garantias_modelos_mototaxis_alcance_ck";
ALTER TABLE "garantias_modelos_mototaxis" ADD CONSTRAINT "garantias_modelos_mototaxis_alcance_ck"
  CHECK ((NOT "activa" AND length(trim("alcance")) = 0) OR length(trim("alcance")) BETWEEN 3 AND 4000);
