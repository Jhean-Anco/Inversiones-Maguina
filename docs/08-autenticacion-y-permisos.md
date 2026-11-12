# 08. Autenticación y permisos

**Propósito:** describir controles presentes, no emitir certificación de seguridad. **Estado:** lectura estática; pruebas de seguridad declaradas en CI, sin resultado de ejecución en este trabajo.

El módulo de autenticación expone sesión, cierre y consulta del usuario actual. El backend registra `@fastify/cookie`, usa JWT y configuración de duración de sesión normal/recordada, y usa contraseña con Argon2. Los controladores protegidos aplican `GuardiaSesion` y `GuardiaPermiso`, con `@RequierePermiso(...)`; las relaciones de roles/permisos están modeladas en tablas Drizzle.

| Operación | Evidencia de permiso |
|---|---|
| Ingresos | `INGRESOS.LEER`, `INGRESOS.CREAR`, permisos específicos de facturación |
| Personas | permisos de lectura/creación/edición en operaciones correspondientes |
| Inventario | permisos `INVENTARIO.*` en controladores protegidos |
| Series fiscales | `FINANZAS.ADMINISTRAR` en rutas de configuración de series |
| Finanzas y otros | inspeccionar cada decorador de controlador; no asumir desde menú |

No declarar la matriz completa a partir de ejemplos: existen múltiples decoradores y guardas por endpoint. La fuente autoritativa es cada método del controlador y su `@UseGuards`. `FRONTEND_ORIGIN` controla CORS con `credentials: true`; el secreto de sesión requiere mínimo 32 caracteres y rechaza valores de ejemplo.

**Fuentes:** `apps/api/src/modulos/autenticacion`, `permisos.ts`, `guardia-sesion.ts`, `guardia-permiso.ts`, controladores y esquema. **Pendiente:** enumeración automatizada endpoint-permiso y prueba HTTP de todos los caminos.
