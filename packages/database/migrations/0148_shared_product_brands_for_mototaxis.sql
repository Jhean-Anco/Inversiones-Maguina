BEGIN;

INSERT INTO marcas_productos (nombre, activo)
SELECT DISTINCT ON (lower(btrim(marca_moto.nombre))) btrim(marca_moto.nombre), marca_moto.activo
FROM marcas_mototaxis AS marca_moto
WHERE NOT EXISTS (
  SELECT 1 FROM marcas_productos AS marca_producto
  WHERE lower(btrim(marca_producto.nombre)) = lower(btrim(marca_moto.nombre))
)
ORDER BY lower(btrim(marca_moto.nombre)), marca_moto.creado_en;

UPDATE modelos_mototaxis AS modelo
SET marca_id = marca_producto.id
FROM marcas_mototaxis AS marca_moto
JOIN marcas_productos AS marca_producto
  ON lower(btrim(marca_producto.nombre)) = lower(btrim(marca_moto.nombre))
WHERE modelo.marca_id = marca_moto.id;

ALTER TABLE modelos_mototaxis
  DROP CONSTRAINT modelos_mototaxis_marca_fk;
ALTER TABLE modelos_mototaxis
  ADD CONSTRAINT modelos_mototaxis_marca_fk
  FOREIGN KEY (marca_id) REFERENCES marcas_productos(id) ON DELETE RESTRICT;

COMMIT;
