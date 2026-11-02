INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('TRIBUTOS.LEER', 'TRIBUTOS', 'LEER', 'Consultar la conciliación tributaria interna preliminar.')
ON CONFLICT ("codigo") DO NOTHING;--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id"
FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" IN ('ADMINISTRADOR', 'GERENTE') AND permiso."codigo" = 'TRIBUTOS.LEER'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
