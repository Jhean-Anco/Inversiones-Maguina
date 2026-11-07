ALTER TABLE marcas_productos
  ADD COLUMN uso varchar(12) NOT NULL DEFAULT 'AMBOS';

UPDATE marcas_productos AS marca
SET uso = CASE
  WHEN EXISTS (SELECT 1 FROM productos AS producto WHERE producto.marca_id = marca.id)
   AND EXISTS (SELECT 1 FROM modelos_mototaxis AS modelo WHERE modelo.marca_id = marca.id)
    THEN 'AMBOS'
  WHEN EXISTS (SELECT 1 FROM productos AS producto WHERE producto.marca_id = marca.id)
    THEN 'REPUESTOS'
  WHEN EXISTS (SELECT 1 FROM modelos_mototaxis AS modelo WHERE modelo.marca_id = marca.id)
    THEN 'MOTOTAXIS'
  ELSE 'AMBOS'
END;

ALTER TABLE marcas_productos
  ADD CONSTRAINT marcas_productos_uso_ck
  CHECK (uso IN ('REPUESTOS', 'MOTOTAXIS', 'AMBOS'));
