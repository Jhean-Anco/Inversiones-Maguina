UPDATE "entradas_stock"
SET "ruc_emisor" = "registro_compras_sunat"->'campos'->>'1'
WHERE "ruc_emisor" IS NULL
  AND "registro_compras_sunat"->>'formato' = '8.4'
  AND "registro_compras_sunat"->'campos'->>'1' ~ '^[0-9]{11}$';
