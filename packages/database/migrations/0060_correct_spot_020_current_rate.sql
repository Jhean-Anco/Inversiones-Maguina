DO $$
DECLARE
  regla RECORD;
  fuente_corregida text;
BEGIN
  SELECT * INTO regla
  FROM reglas_tributarias
  WHERE vigente_hasta IS NULL
  ORDER BY vigente_desde DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF regla.tasa_spot_020 = 10.00 THEN
    RETURN;
  END IF;

  fuente_corregida := regla.fuente_normativa || '; Corrección de SPOT 020 vigente: https://orientacion.sunat.gob.pe/apendices-del-sistema-de-detracciones';

  IF regla.vigente_desde < CURRENT_DATE THEN
    UPDATE reglas_tributarias
    SET vigente_hasta = CURRENT_DATE - 1
    WHERE id = regla.id;

    INSERT INTO reglas_tributarias (
      vigente_desde, vigente_hasta, tasa_igv, umbral_spot, tasa_spot_020, tasa_spot_037,
      umbral_retencion, tasa_retencion, tasas_percepcion, fuente_normativa, usuario_id
    ) VALUES (
      CURRENT_DATE, NULL, regla.tasa_igv, regla.umbral_spot, 10.00, regla.tasa_spot_037,
      regla.umbral_retencion, regla.tasa_retencion, regla.tasas_percepcion, fuente_corregida, regla.usuario_id
    );
  ELSE
    UPDATE reglas_tributarias
    SET tasa_spot_020 = 10.00, fuente_normativa = fuente_corregida
    WHERE id = regla.id;
  END IF;
END $$;
