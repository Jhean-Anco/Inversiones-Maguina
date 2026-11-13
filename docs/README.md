# Documentación del sistema

Propósito: índice para desarrolladores basado en el código y la configuración actuales. Estado: inspección estática; las pruebas de ejecución se identifican expresamente como pendientes cuando no se corrieron.

| Documento | Tema |
|---|---|
| [01 Arquitectura general](01-arquitectura-general.md) | Componentes, integraciones y comunicación |
| [02 Estructura del monorepositorio](02-estructura-del-monorepositorio.md) | Workspaces y responsabilidades |
| [03 Instalación y desarrollo local](03-instalacion-y-desarrollo-local.md) | Requisitos y comandos de desarrollo |
| [04 Backend y API](04-backend-y-api.md) | NestJS y rutas; catálogo desde controladores |
| [05 Frontend](05-frontend.md) | React, rutas y cliente HTTP |
| [06 Modelo de datos](06-modelo-de-datos.md) | Drizzle, tablas y migraciones |
| [Catálogo de datos](catalogo-de-datos.md) | Columnas y relaciones generadas de Drizzle |
| [07 Módulos y reglas de negocio](07-modulos-y-reglas-de-negocio.md) | Flujos documentados y vacíos |
| [08 Autenticación y permisos](08-autenticacion-y-permisos.md) | Cookies, guards y permisos |
| [09 Integraciones externas](09-integraciones-externas.md) | NubeFact, SIRE y API Perú |
| [10 Variables de entorno](10-variables-de-entorno.md) | Inventario y sensibilidad |
| [11 Docker y contenedores](11-docker-y-contenedores.md) | Compose, imágenes y volúmenes |
| [12 Pruebas y calidad](12-pruebas-y-calidad.md) | Suites y comandos disponibles |
| [13 Integración y despliegue continuo](13-integracion-y-despliegue-continuo.md) | Workflow y GHCR |
| [14 Despliegue en Dokploy](14-despliegue-en-dokploy.md) | Condiciones, publicación y rollback |
| [15 Respaldo y restauración](15-respaldo-y-restauracion.md) | Persistencia y evidencia faltante |
| [16 Seguridad](16-seguridad.md) | Controles observados |
| [17 Operación y monitoreo](17-operacion-y-monitoreo.md) | Salud y diagnóstico |
| [18 Solución de problemas](18-solucion-de-problemas.md) | Errores derivados de validaciones/código |
| [19 Matriz de funcionalidades](19-matriz-de-funcionalidades.md) | Estado frente a evidencia |
| [20 Proceso de versiones](20-proceso-de-versiones.md) | Rama, PR y recuperación |

Fuentes transversales: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `apps/api/src`, `apps/web/src`, `packages/database/src/esquema/index.ts`, `packages/database/migrations`, `compose*.yaml`, `docker/` y `.github/workflows/pipeline.yml`.
