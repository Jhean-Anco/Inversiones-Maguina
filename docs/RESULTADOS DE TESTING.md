# Resultados de testing

## Ejecución actual

**Estado: suite base ampliada verificada; misión de calidad completa aún pendiente.** El 12 de noviembre de 2026, GitHub Actions completó correctamente el run [43211295734](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43211295734) para el commit `e675011bb6245533f16ad19fc8a1f3706be29b67` en `test/quality-gates-e2e`. El código se ejecutó en runners de GitHub con PostgreSQL y contenedores efímeros y credenciales ficticias. No se ejecutaron pruebas localmente: la revisión local de seguridad requiere un sandbox de sistema operativo que este entorno no ofrece. El Docker Engine local tampoco está disponible.

La rama actual contiene los siguientes casos y resultados; las suites vacías se indican explícitamente:

| Suite | Casos escritos | Aprobados | Fallidos | Cobertura |
|---|---:|---:|---:|---|
| Unitarias (configuración, finanzas, SIRE y API Perú simulados) | 35 | 35 (GitHub Actions) | 0 | Incluidas en el reporte agregado |
| Integración PostgreSQL | 10 | 10 (PostgreSQL 16 efímero en GitHub Actions) | 0 | Incluidas en el reporte agregado |
| API HTTP | 8 | 8 (NestJS/Fastify + PostgreSQL real de CI) | 0 | Incluidas en el reporte agregado |
| Seguridad HTTP | 4 | 4 (API real de CI) | 0 | Incluidas en el reporte agregado |
| E2E / navegador | 1 | 1 (frontend, API y PostgreSQL reales en CI) | 0 | El flujo de acceso pasó; cobertura V8 de suites API no incluye el código frontend E2E |
| Seguridad automatizada del código | Escáneres activos | Gitleaks, Trivy y `pnpm audit` aprobados | 0 alertas bloqueantes en el workflow | No aplica |
| Concurrencia de operaciones comerciales | 2 escenarios | 2 aprobados: última unidad e idempotencia duplicada | 0 | No medida |

El conteo total es 58: 57 declaraciones `node:test` (35 unitarias, 10 de integración, 8 API y 4 de seguridad) más 1 flujo Playwright. Las integraciones incluyen rollback de venta por stock insuficiente, dos ventas concurrentes por la última unidad, idempotencia de ventas, aceptación/rechazo NubeFact simulados persistidos en PostgreSQL, dos pagos concurrentes contra el saldo de un egreso y abonos concurrentes idempotentes. Las pruebas unitarias incluyen 13 escenarios simulados de SIRE y 14 de API Perú. Faltan más casos de compras, timeout/estado incierto de NubeFact y todo el catálogo de permisos.

La cobertura V8 agregada de las suites API fue 67.27 % de líneas, 71.10 % de ramas y 67.00 % de funciones. El workflow la publica como LCOV, pero no aplica los umbrales de 80 % general, 90 % para ramas críticas ni 100 % para casos P0; esos objetivos siguen pendientes.

## Evidencia disponible

- Inspección estática del checkout: 17 controladores, 15 servicios, 314 archivos de migración y una prueba preexistente.
- GitHub Actions run [43211295734](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43211295734): typecheck y build aprobados; todas las migraciones aplicadas dos veces a PostgreSQL vacío; 35/35 unitarias, 10/10 integraciones, 8/8 API, 4/4 seguridad y 1/1 E2E aprobadas; `pnpm audit --prod --audit-level high`; escaneo Gitleaks y Trivy de secretos e imágenes; validación Compose; construcción de imágenes, arranque de contenedores y humo de API, CORS y frontend aprobados.
- Un push previo falló por espacio temporal de Buildx al analizar la imagen de operaciones; el workflow ahora limpia la caché antes de los escaneos, y el run `43199814736` completó todos sus jobs de calidad e imágenes.
- `git diff --check` aprobó antes del commit de pruebas. El CI informado corresponde al commit `e675011bb6245533f16ad19fc8a1f3706be29b67`. El artefacto LCOV es `cobertura-api-803d1f89f583b5be0b5eb48d443408f114650f45`, con vencimiento el 26 de noviembre de 2026.
- El Docker Engine local respondió que no encuentra su endpoint de servicio. No se pudo levantar PostgreSQL en el equipo.
- El workflow validado se ejecutó en `test/quality-gates-e2e`; publicación y despliegue se omitieron por estar limitados a `main`.
- La cobertura no alcanza aún los objetivos propuestos: 80 % general, 90 % de ramas críticas y 100 % P0. El CI reportó 67.27 % de líneas, 71.10 % de ramas y 67.00 % de funciones.

## Defectos encontrados y correcciones

- **Déficit de cobertura:** solo existía una prueba de configuración de entorno. Se añadieron pruebas unitarias de validaciones financieras y de fecha, un ejecutor que separa suites, comandos raíz y verificaciones iniciales de PostgreSQL.
- **Riesgo de base equivocada en testing:** se creó una base de integración con nombre `magina_test` y controles para rechazar hosts o credenciales distintas de las ficticias permitidas. Las pruebas y migraciones pasaron en PostgreSQL efímero de CI.
- **Idempotencia concurrente:** la prueba real encontró que Drizzle envolvía el error PostgreSQL `23505`; el servicio solo revisaba el código del error exterior y no recuperaba la venta ya registrada. Se amplió el reconocimiento por la cadena `cause`, y las tres pruebas comerciales pasaron en la siguiente ejecución.
- **CORS hostil:** se ajustó la aserción para verificar que un origen no autorizado nunca se refleje ni reciba `*`; la suite de seguridad pasó en CI.
- **Lectura del egreso antes del commit:** las pruebas de pagos fallaron porque `ServicioEgresos.crear` consultaba el registro mediante otra conexión mientras la transacción aún no había confirmado el INSERT. El servicio ahora obtiene el ID dentro de la transacción y recupera el egreso después de que esta termina; los dos casos de pagos concurrentes y el run completo pasaron.
- **JSON SIRE inválido con HTTP 200:** el servicio convertía el error de parseo en un objeto vacío, que podía parecer una respuesta válida. Ahora devuelve un error de gateway y el simulador verifica el comportamiento; también pasan los casos de credenciales, HTTP 400–503 y desconexión.

## Pendientes antes de considerar apto para producción

- Repetir validación local dentro de un sandbox permitido; la ejecución aprobada disponible es en CI de GitHub.
- Ampliar las pruebas E2E de navegador a flujos P0 con PostgreSQL real, fixtures y proveedores simulados.
- Ampliar concurrencia/rollback a pagos, compras y correlativos, verificando el estado final de las tablas.
- Ampliar Playwright a flujos de negocio P0; añadir accesibilidad y carga k6 con umbrales explícitos. Gitleaks, Trivy y `pnpm audit` ya corren en CI.
- Aumentar cobertura sin excluir módulos importantes y convertir los objetivos acordados en gates medibles.
- Verificar migraciones/reinicio/persistencia y fallos del pipeline con jobs de CI controlados.
- Ampliar NubeFact simulado a timeout, respuesta inválida, estado incierto e idempotencia; realizar aceptación fiscal únicamente en sandbox oficial con autorización. No se ejecutó ni se recomienda una emisión real.

**Recomendación:** no dar por concluida la misión de calidad ni aprobar todos los flujos para producción todavía. La CI aprobada cubre ventas/stock, pagos concurrentes, aceptación/rechazo NubeFact simulados, autenticación HTTP básica, un E2E de acceso, simuladores parciales de SIRE/API Perú, migraciones e imágenes. No valida aún los flujos comerciales E2E, la accesibilidad, la carga, todos los permisos, compras completas ni la restauración de respaldos; la cobertura medida aún está bajo los objetivos.
