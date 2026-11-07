ALTER TABLE "modelos_mototaxis"
  ADD COLUMN "precio_venta" numeric(14,2);

ALTER TABLE "modelos_mototaxis"
  ADD CONSTRAINT "modelos_mototaxis_precio_venta_ck"
  CHECK ("precio_venta" IS NULL OR "precio_venta" > 0);
