# Matriz de cobertura y trazabilidad

## Fuente de inventario

Inventario estático del checkout `test/quality-gates-e2e`: 17 controladores API, 15 servicios API y 314 archivos de migración bajo `packages/database/migrations`. En el commit `e675011bb6245533f16ad19fc8a1f3706be29b67`, CI aprobó 35 pruebas unitarias, 10 integraciones PostgreSQL, 8 pruebas HTTP de API, 4 pruebas HTTP de seguridad y 1 flujo Playwright de acceso.

Estados: **Parcial** = hay pruebas que cubren una parte; **Pendiente** = no hay prueba automatizada suficiente; **Pendiente de validación externa** = requiere sandbox/proveedor/operación real autorizada. “Implementado” describe código funcional solo cuando la fuente lo demuestra; no equivale a validación de extremo a extremo.

| Módulo | Requisito reflejado en código | Superficie de entrada | Regla/caso trazado | Prioridad | Estado de prueba |
|---|---|---|---|---|---|
| Autenticación | Inicio/cierre de sesión, cookie, perfil y permisos por rol | `autenticacion.controller.ts`, `guardia-sesion.ts`, `guardia-permiso.ts`, `apps/api/e2e/acceso.spec.mts` | Sesión ausente/manipulada, login fallido/válido, menú sin permisos, cierre y ruta protegida | P0 | Parcial: 8 pruebas HTTP API, 4 de seguridad y 1 E2E aprobada en CI |
| Ingresos / ventas | Ventas, pagos, clientes, notas, anulaciones, cotizaciones y órdenes de servicio | `ingresos.controller.ts`, `ingresos.service.ts` | Rollback por stock, concurrencia por última unidad, idempotencia de clave duplicada, aceptación/rechazo NubeFact simulado y estado PostgreSQL | P0 | Parcial: 5 integraciones reales PostgreSQL de transacción/stock/emisión simulada |
| Inventario | Productos, precios, marcas, categorías, entradas y ajustes | controladores de `modulos/inventario` | Cantidades, stock mínimo, duplicados, conversiones y transacciones | P0 | Pendiente |
| Finanzas | Cuentas, resumen y movimientos por periodo | `finanzas.controller.ts`, `finanzas.service.ts` | Tipos de cuenta, moneda, campos bancarios/tarjeta, fechas y sumas | P0 | Parcial: 6 casos de validación aprobados; endpoints todavía sin cobertura funcional |
| Egresos / compras | Egresos, pagos y comprobantes recibidos | `egresos.controller.ts`, `egresos.service.ts` | Importes, pagos iniciales/parciales, duplicados, saldo e inventario | P0 | Pendiente |
| Mototaxis | Compras, unidades, estados, reclamos, garantías e imágenes | `mototaxis.controller.ts`, `mototaxis.service.ts` | Identificación, stock por unidad, pagos, archivos y concurrencia | P0/P1 | Pendiente |
| Personas / conductores | DNI/CE/pasaporte, licencia y consulta de identidad | controladores de `modulos/personas`, `consulta-identidad-peru.spec.ts` | Formato, duplicados, estados y API Perú simulada para DNI/RUC | P1 | Parcial; 14 escenarios de simulador, sin token real |
| Proveedores | Gestión relacionada con compras y documentos | `proveedores.controller.ts` | Validaciones, duplicados y permisos | P1 | Pendiente |
| Almacenamiento / evidencias | Guardar, descargar, borrar y servir archivos | `almacenamiento.controller.ts`, `almacenamiento.service.ts` | Autorización por entidad, ruta, MIME, tamaño, hash y persistencia | P0/P1 | Pendiente |
| SUNAT SIRE | Periodos, tickets, ZIP/CSV, clasificación e importación | `sunat-sire.controller.ts`, `sunat-sire.service.ts`, `sunat-sire.service.spec.ts` | Token, HTTP 400–503, desconexión, JSON inválido y validación de periodo simulados; ZIP/importación pendiente | P0/P1 | Parcial; 13 escenarios simulados, sin credenciales reales |
| Facturación NubeFact | Emisión, estado, documentos, notas y bajas | `ingresos.service.ts`, `almacenamiento.service.ts` | Aceptación y rechazo del proveedor simulado con solicitud y resultado persistidos en PostgreSQL; timeout, estado incierto e idempotencia pendientes | P0 | Parcial; 2 escenarios simulados, sin proveedor real |
| Reportes | Resumen, ingresos e inventario | `reportes.controller.ts`, `reportes.service.ts` | Permisos y conciliación con movimientos operativos | P1 | Pendiente |
| PostgreSQL / migraciones | Esquema Drizzle y migraciones SQL | `packages/database`, `migrations/` | Versión 16, tablas, FK, precisión `numeric`, idempotencia de migración, ventas, pagos y estados NubeFact | P0 | Parcial: 10 pruebas aprobadas; migraciones aplicadas dos veces |
| Frontend | Login, navegación protegida y rutas/formularios operativos | `apps/web/src/main/main.tsx`, login y `apps/api/e2e/acceso.spec.mts` | Login real, menú según permisos, logout y redirect; responsive/accesibilidad | P0/P1 | Parcial: 1 E2E aprobada en CI; módulos y accesibilidad pendientes |
| Servicios externos | NubeFact, SUNAT SIRE, API Perú | servicios de ingresos, SIRE y consulta de identidad | SIRE/API Perú: token, HTTP, desconexión y payload inválido simulados; NubeFact: aceptación/rechazo simulados | P0/P1 | Parcial; solo simuladores, sin credenciales reales |
| Docker / CI | Compose y GitHub Actions | `compose.*.yaml`, `.github/workflows/pipeline.yml` | Base aislada, healthcheck, migración, humo, scans, E2E y gates | P0 | Parcial: build, escaneos, humo y E2E aprobados; faltan cobertura mínima, pruebas negativas de gates, publicación GHCR y despliegue autorizado |

## Casos actualmente escritos

| Archivo | Casos | Comprobación |
|---|---:|---|
| `apps/api/src/configuracion-entorno.spec.ts` | 2 | Configuración de desarrollo y rechazo de origen HTTP externo |
| `apps/api/src/modulos/finanzas/finanzas.service.spec.ts` | 6 | Normalización y validaciones de cuentas; fecha calendario inválida antes de consultar BD |
| `apps/api/src/integracion-postgres.integration.spec.ts` | 3 | PostgreSQL 16/base `_test`, tablas y FK, precisión monetaria/cantidad |
| `apps/api/src/ventas-postgres.integration.spec.ts` | 7 | Rollback por stock, concurrencia/idempotencia de ventas, aceptación/rechazo NubeFact simulado y pagos concurrentes con datos reales efímeros |
| `apps/api/src/seguridad.api.spec.ts` | 8 | HTTP real: health, autenticación, validación, cookie y CORS |
| `apps/api/src/controles-seguridad.security.spec.ts` | 4 | HTTP real: sesión manipulada, cookie falsa, CORS hostil y filtración de secretos |
| `apps/api/src/modulos/inventario/sunat-sire.service.spec.ts` | 13 | Simulación SIRE: token, HTTP 400–503, desconexión, JSON inválido y validación de periodo |
| `apps/api/src/utilidades/consulta-identidad-peru.spec.ts` | 14 | Simulación API Perú: DNI/RUC, respuestas HTTP, token, desconexión y payloads inválidos |
| `apps/api/e2e/acceso.spec.mts` | 1 | Navegador real con frontend, API y PostgreSQL: login fallido/válido, permisos de navegación, logout y ruta protegida |

La línea “casos” cuenta declaraciones `node:test`; los 57 casos y el flujo Playwright pasaron en CI `43211295734`. La cobertura V8/LCOV es 67.27 % líneas, 71.10 % ramas y 67.00 % funciones; se publica como artefacto, pero todavía no define umbrales bloqueantes. Persisten brechas en compras y rutas de negocio.
