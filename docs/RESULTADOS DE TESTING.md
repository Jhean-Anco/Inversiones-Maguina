# Resultados de testing

## Ejecución actual

**Estado: suite base ampliada verificada; misión de calidad completa aún pendiente.** El 12 de noviembre de 2026, GitHub Actions completó correctamente el run [43277590102](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43277590102) para el commit `0d9d034e4b4fb69ef05dfdb6b4fa5e1ee9e60bb1` en `test/quality-gates-e2e`. El código se ejecutó en runners de GitHub con PostgreSQL y contenedores efímeros y credenciales ficticias. Pasaron formato de configuración, typecheck, build, migraciones, suites, cobertura, escaneos, imágenes Docker, humo y persistencia de PostgreSQL y archivos tras reiniciar los contenedores. Los cinco escenarios E2E aprobaron: acceso/permisos, axe-core en login móvil de 390 px, revocación de sesión al desactivar un usuario, creación/edición de categoría con carga y lectura de imagen y compra de repuestos con saldo y movimiento de inventario persistidos. No se ejecutaron pruebas localmente: la revisión local de seguridad requiere un sandbox de sistema operativo que este entorno no ofrece. El Docker Engine local tampoco está disponible.

La rama actual contiene los siguientes casos y resultados; las suites vacías se indican explícitamente:

| Suite | Casos escritos | Aprobados | Fallidos | Cobertura |
|---|---:|---:|---:|---|
| Unitarias (configuración, finanzas, SIRE y API Perú simulados) | 35 | 35 (GitHub Actions) | 0 | Incluidas en el reporte agregado |
| Integración PostgreSQL | 12 | 12 (PostgreSQL 16 efímero en GitHub Actions) | 0 | Incluidas en el reporte agregado |
| API HTTP | 8 | 8 (NestJS/Fastify + PostgreSQL real de CI) | 0 | Incluidas en el reporte agregado |
| Seguridad HTTP | 4 | 4 (API real de CI) | 0 | Incluidas en el reporte agregado |
| E2E / navegador | 5 | 5 (frontend, API y PostgreSQL reales en CI) | 0 | Acceso/permisos, axe-core en login móvil, revocación de sesión, categoría con imagen y compra con saldo/movimiento persistidos; cobertura V8 de suites API no incluye el código frontend E2E |
| Seguridad automatizada del código | Escáneres activos | Gitleaks, Trivy y `pnpm audit` aprobados | 0 alertas bloqueantes en el workflow | No aplica |
| Concurrencia de operaciones comerciales | 2 escenarios | 2 aprobados: última unidad e idempotencia duplicada | 0 | No medida |

El conteo total es 64: 59 declaraciones `node:test` (35 unitarias, 12 de integración, 8 API y 4 de seguridad) más 5 escenarios Playwright. Las integraciones incluyen rollback y concurrencia de ventas, idempotencia, aceptación/rechazo NubeFact simulados, dos escenarios de recepción de compras con PostgreSQL y dos casos de pagos concurrentes/idempotentes. Las pruebas unitarias incluyen 13 escenarios simulados de SIRE y 14 de API Perú. La compra E2E cubre el tipo `SIN_DOCUMENTO`; faltan compras documentales/duplicados, timeout/estado incierto de NubeFact y el resto del catálogo de permisos.

La cobertura V8 agregada de las suites API fue 66.87 % de líneas, 68.44 % de ramas y 67.42 % de funciones. El gate inicial de 65 % líneas, 68 % ramas y 65 % funciones pasó en el run verificado. Los objetivos de 80 % general, 90 % para ramas críticas y 100 % para casos P0 siguen pendientes.

## Evidencia disponible

- Inspección estática del checkout: 17 controladores, 15 servicios y 314 archivos de migración; la suite actual suma 59 pruebas `node:test` y 5 escenarios Playwright.
- GitHub Actions run [43277590102](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43277590102), commit `0d9d034`: formato de configuración, typecheck y build aprobados; todas las migraciones aplicadas dos veces a PostgreSQL vacío; 35/35 unitarias, 12/12 integraciones, 8/8 API, 4/4 seguridad y 5/5 E2E aprobadas; gate LCOV 65/68/65 aprobado; `pnpm audit --prod --audit-level high`; Gitleaks, Trivy, validación Compose, construcción de imágenes, humo y persistencia tras reiniciar PostgreSQL y API aprobados. Los jobs de publicación y despliegue se omitieron en la rama de prueba.
- Un push previo falló por espacio temporal de Buildx al analizar la imagen de operaciones; el workflow ahora limpia la caché antes de los escaneos, y el run `43199814736` completó todos sus jobs de calidad e imágenes.
- El artefacto LCOV del run actual es `cobertura-api-499c596f7a15da83eb792ad7d8229ae7b777bee9` (artefacto 13972315316), con vencimiento el 26 de noviembre de 2026.
- El Docker Engine local respondió que no encuentra su endpoint de servicio. No se pudo levantar PostgreSQL en el equipo.
- El workflow validado se ejecutó en `test/quality-gates-e2e`; publicación y despliegue se omitieron por estar limitados a `main`.
- La cobertura no alcanza aún los objetivos propuestos: 80 % general, 90 % de ramas críticas y 100 % P0. El CI reportó 66.87 % de líneas, 68.44 % de ramas y 67.42 % de funciones.

## Defectos encontrados y correcciones

- **Déficit de cobertura:** solo existía una prueba de configuración de entorno. Se añadieron pruebas unitarias de validaciones financieras y de fecha, un ejecutor que separa suites, comandos raíz y verificaciones iniciales de PostgreSQL.
- **Riesgo de base equivocada en testing:** se creó una base de integración con nombre `magina_test` y controles para rechazar hosts o credenciales distintas de las ficticias permitidas. Las pruebas y migraciones pasaron en PostgreSQL efímero de CI.
- **Idempotencia concurrente:** la prueba real encontró que Drizzle envolvía el error PostgreSQL `23505`; el servicio solo revisaba el código del error exterior y no recuperaba la venta ya registrada. Se amplió el reconocimiento por la cadena `cause`, y las tres pruebas comerciales pasaron en la siguiente ejecución.
- **CORS hostil:** se ajustó la aserción para verificar que un origen no autorizado nunca se refleje ni reciba `*`; la suite de seguridad pasó en CI.
- **Lectura del egreso antes del commit:** las pruebas de pagos fallaron porque `ServicioEgresos.crear` consultaba el registro mediante otra conexión mientras la transacción aún no había confirmado el INSERT. El servicio ahora obtiene el ID dentro de la transacción y recupera el egreso después de que esta termina; los dos casos de pagos concurrentes y el run completo pasaron.
- **JSON SIRE inválido con HTTP 200:** el servicio convertía el error de parseo en un objeto vacío, que podía parecer una respuesta válida. Ahora devuelve un error de gateway y el simulador verifica el comportamiento; también pasan los casos de credenciales, HTTP 400–503 y desconexión.

## Pendientes antes de considerar apto para producción

- Repetir validación local dentro de un sandbox permitido; la ejecución aprobada disponible es en CI de GitHub.
- Ampliar las pruebas E2E de navegador a flujos comerciales P0 con PostgreSQL real, fixtures y proveedores simulados; la compra `SIN_DOCUMENTO` ya tiene un recorrido E2E, pero faltan facturas, abonos y los demás módulos. axe-core solo cubre el login móvil y debe extenderse a otras rutas.
- Ampliar concurrencia/rollback a compras con factura duplicada y correlativos, verificando el estado final de las tablas.
- Ampliar Playwright a más flujos de negocio P0; extender axe-core a otras rutas y añadir carga k6 con umbrales explícitos. Gitleaks, Trivy y `pnpm audit` ya corren en CI.
- Aumentar cobertura de los módulos P0/P1 y elevar los gates iniciales de 65/68/65 hacia 80 % general y 90 % en ramas críticas.
- Añadir jobs controlados que demuestren que fallos de pruebas, migraciones, E2E y escaneos bloquean la publicación.
- Ampliar NubeFact simulado a timeout, respuesta inválida, estado incierto e idempotencia; realizar aceptación fiscal únicamente en sandbox oficial con autorización. No se ejecutó ni se recomienda una emisión real.

**Recomendación:** no dar por concluida la misión de calidad ni aprobar todos los flujos para producción todavía. La CI aprobada cubre ventas/stock, recepción básica de compras, pagos concurrentes, aceptación/rechazo NubeFact simulados, autenticación HTTP básica, acceso, catálogo y una compra de repuestos en E2E, axe-core en el login móvil, simuladores parciales de SIRE/API Perú, migraciones e imágenes. Faltan ventas/crédito y otros flujos comerciales E2E, axe en más rutas, carga, todos los permisos, compras documentales completas y restauración de respaldos; la cobertura medida sigue bajo los objetivos.
