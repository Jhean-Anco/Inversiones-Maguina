INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('FACTURACION.ANULAR', 'FACTURACION', 'ANULAR', 'Comunicar la baja y consultar el resultado de comprobantes electronicos emitidos.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id" FROM "roles" rol CROSS JOIN "permisos" permiso
  ('FACTURACION.ANULAR', 'FACTURACION', 'ANULAR', 'Comunicar la baja y consultar el resultado de comprobantes electronicos emitidos.')
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
