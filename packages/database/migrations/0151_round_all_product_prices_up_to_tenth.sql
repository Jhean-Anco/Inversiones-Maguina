UPDATE "precios_productos"
SET "precio" = (CEIL("precio" * 10) / 10)::numeric(12, 2),
    "actualizado_en" = NOW()
WHERE "precio" <> (CEIL("precio" * 10) / 10)::numeric(12, 2);
