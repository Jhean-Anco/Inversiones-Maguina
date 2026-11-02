INSERT INTO "personas_documentos" ("persona_id", "tipo_documento_id", "numero_documento")
SELECT ruc_persona."id", dni_tipo."id", dni_persona."numero_documento"
FROM "personas" ruc_persona
JOIN "tipos_documento" ruc_tipo ON ruc_tipo."id" = ruc_persona."tipo_documento_id" AND ruc_tipo."codigo" = '06'
JOIN "tipos_persona" ruc_natural ON ruc_natural."id" = ruc_persona."tipo_persona_id" AND ruc_natural."codigo" = 'NATURAL'
JOIN "clientes" ruc_cliente ON ruc_cliente."persona_id" = ruc_persona."id" AND ruc_cliente."activo" = true
JOIN "tipos_documento" dni_tipo ON dni_tipo."codigo" = '01' AND dni_tipo."activo" = true
JOIN "personas" dni_persona ON dni_persona."tipo_documento_id" = dni_tipo."id" AND dni_persona."numero_documento" = substring(ruc_persona."numero_documento" from 3 for 8)
LEFT JOIN "clientes" dni_cliente ON dni_cliente."persona_id" = dni_persona."id" AND dni_cliente."activo" = true
WHERE ruc_persona."numero_documento" ~ '^10[0-9]{9}$'
  AND dni_cliente."persona_id" IS NULL
  AND lower(concat_ws(' ', ruc_persona."nombres", ruc_persona."apellido_paterno", ruc_persona."apellido_materno")) = lower(concat_ws(' ', dni_persona."nombres", dni_persona."apellido_paterno", dni_persona."apellido_materno"))
ON CONFLICT DO NOTHING;
