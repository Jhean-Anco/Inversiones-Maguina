-- Declara en el esquema Drizzle el índice de motivo único y la restricción de importes que la migración 0134 ya creó.
-- No cambia la base: la restricción existe desde 0134 y el índice solo se crea si faltara.
CREATE UNIQUE INDEX IF NOT EXISTS "comprobantes_relacionados_origen_motivo_unico" ON "comprobantes_relacionados" USING btree ("ingreso_origen_id","tipo_comprobante","codigo_motivo") WHERE "comprobantes_relacionados"."codigo_motivo" NOT IN (7, 13);
