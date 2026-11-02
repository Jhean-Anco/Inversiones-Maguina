ALTER TABLE "roles_permisos" RENAME COLUMN "creado_en" TO "asignado_en";--> statement-breakpoint
ALTER TABLE "usuarios_roles" RENAME COLUMN "creado_en" TO "asignado_en";--> statement-breakpoint
CREATE UNIQUE INDEX "persona_contacto_principal_unico" ON "personas_contactos" USING btree ("persona_id","tipo_contacto_id") WHERE "personas_contactos"."es_principal";
--> statement-breakpoint
INSERT INTO "tipos_documento" ("codigo", "nombre", "longitud_minima", "longitud_maxima", "solo_numeros") VALUES
  ('01', 'Documento Nacional de Identidad (DNI)', 8, 8, true),
  ('04', 'Carné de extranjería', NULL, NULL, false),
  ('06', 'Registro Único de Contribuyentes (RUC)', 11, 11, true),
  ('07', 'Pasaporte', NULL, NULL, false)
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "tipos_contacto" ("codigo", "nombre") VALUES
  ('CORREO_ELECTRONICO', 'Correo electrónico'),
  ('TELEFONO_FIJO', 'Teléfono fijo'),
  ('TELEFONO_MOVIL', 'Teléfono móvil'),
  ('WHATSAPP', 'WhatsApp'),
  ('SITIO_WEB', 'Sitio web'),
  ('OTRO', 'Otro')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cargos" ("codigo", "nombre") VALUES
  ('ADMINISTRADOR', 'Administrador'),
  ('VENDEDOR', 'Vendedor'),
  ('CAJERO', 'Cajero'),
  ('ALMACENERO', 'Almacenero'),
  ('MECANICO', 'Mecánico')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles" ("codigo", "nombre", "descripcion", "es_sistema") VALUES
  ('ADMINISTRADOR', 'Administrador', 'Administración completa del sistema.', true),
  ('GERENTE', 'Gerente', 'Gestión operativa de la tienda.', true),
  ('VENDEDOR', 'Vendedor', 'Atención y registro de ventas.', true),
  ('CAJERO', 'Cajero', 'Operaciones de caja.', true),
  ('ALMACENERO', 'Almacenero', 'Operaciones de almacén e inventario.', true),
  ('MECANICO', 'Mecánico', 'Atención técnica y servicios de taller.', true)
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "permisos" ("codigo", "modulo", "accion", "descripcion") VALUES
  ('PERSONAS.LEER', 'PERSONAS', 'LEER', 'Consultar fichas de personas.'),
  ('PERSONAS.CREAR', 'PERSONAS', 'CREAR', 'Registrar personas.'),
  ('PERSONAS.EDITAR', 'PERSONAS', 'EDITAR', 'Actualizar fichas de personas.'),
  ('PERSONAS.DESACTIVAR', 'PERSONAS', 'DESACTIVAR', 'Desactivar personas.'),
  ('TRABAJADORES.LEER', 'TRABAJADORES', 'LEER', 'Consultar trabajadores.'),
  ('TRABAJADORES.CREAR', 'TRABAJADORES', 'CREAR', 'Registrar trabajadores.'),
  ('TRABAJADORES.EDITAR', 'TRABAJADORES', 'EDITAR', 'Actualizar trabajadores.'),
  ('TRABAJADORES.DESACTIVAR', 'TRABAJADORES', 'DESACTIVAR', 'Desactivar trabajadores.'),
  ('USUARIOS.LEER', 'USUARIOS', 'LEER', 'Consultar cuentas de usuario.'),
  ('USUARIOS.CREAR', 'USUARIOS', 'CREAR', 'Crear cuentas de usuario.'),
  ('USUARIOS.EDITAR', 'USUARIOS', 'EDITAR', 'Actualizar cuentas de usuario.'),
  ('USUARIOS.DESACTIVAR', 'USUARIOS', 'DESACTIVAR', 'Desactivar cuentas de usuario.'),
  ('ROLES.LEER', 'ROLES', 'LEER', 'Consultar roles y permisos.'),
  ('ROLES.ADMINISTRAR', 'ROLES', 'ADMINISTRAR', 'Configurar roles y permisos.')
ON CONFLICT ("codigo") DO NOTHING;
--> statement-breakpoint
INSERT INTO "roles_permisos" ("rol_id", "permiso_id")
SELECT rol."id", permiso."id"
FROM "roles" rol CROSS JOIN "permisos" permiso
WHERE rol."codigo" = 'ADMINISTRADOR'
ON CONFLICT ("rol_id", "permiso_id") DO NOTHING;
