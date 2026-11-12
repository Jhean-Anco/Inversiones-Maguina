# Resultados de testing

## Ejecución actual

**Estado: PARCIAL; CI verificado.** El 12 de noviembre de 2026, GitHub Actions ejecutó el commit `5d5105e81e37a3af553f579bdcb89dd328663285` y completó correctamente el workflow del PR [43181532403](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43181532403). El código del proyecto se ejecutó en runners de GitHub y contenedores efímeros con valores ficticios. No se ejecutó en el equipo local: la revisión local de seguridad requiere un sandbox de sistema operativo con red bloqueada, entorno reducido, filesystem aislado, límites de recursos y promoción segura de resultados; el entorno actual no lo ofrece. El Docker Engine local tampoco está disponible.

La rama actual contiene los siguientes casos y resultados; las suites vacías se indican explícitamente:

| Suite | Casos escritos | Aprobados | Fallidos | Cobertura |
|---|---:|---:|---:|---|
| Unitarias (configuración + finanzas) | 8 | 8 (GitHub Actions) | 0 | No medida |
| Integración PostgreSQL | 3 | 3 (PostgreSQL 16 efímero en GitHub Actions) | 0 | No medida |
| API | 0 | No ejecutado | No ejecutado | No medida |
| E2E / navegador | 0 | No ejecutado | No ejecutado | No medida |
| Seguridad automatizada del código | 0 casos dedicados; escáneres CI activos | Gitleaks, Trivy y `pnpm audit` aprobados | 0 alertas bloqueantes en el workflow | No aplica |
| Concurrencia de operaciones comerciales | 0 | No ejecutado | No ejecutado | No medida |

El conteo de unitarias incluye dos casos preexistentes de configuración y seis casos nuevos de validación financiera. Las tres pruebas PostgreSQL inspeccionan una base migrada y desechable; aún no prueban carreras reales de ventas/pagos ni reversión de transacciones de negocio.

## Evidencia disponible

- Inspección estática del checkout: 17 controladores, 15 servicios, 314 archivos de migración y una prueba preexistente.
- GitHub Actions: typecheck y build aprobados; todas las migraciones aplicadas dos veces a PostgreSQL vacío; 8/8 unitarias y 3/3 integraciones aprobadas; `pnpm audit --prod --audit-level high`; escaneo Gitleaks y Trivy de secretos e imágenes; validación Compose; construcción de imágenes, arranque de contenedores y humo de API, CORS y frontend aprobados.
- Una ejecución de push falló por falta de espacio temporal al analizar la imagen administrativa; al limpiar caché de Buildx antes de Trivy, la ejecución del PR aprobó todos los jobs.
- `git diff --check` aprobó antes del commit. El CI informado corresponde al commit `5d5105e81e37a3af553f579bdcb89dd328663285`.
- El Docker Engine local respondió que no encuentra su endpoint de servicio. No se pudo levantar PostgreSQL en el equipo.
- El workflow validado se ejecutó en `test/quality-gates-e2e`; publicación y despliegue se omitieron por estar limitados a `main`.
- No se midió cobertura. Los umbrales 80 % general, 90 % de ramas críticas y 100 % P0 no están satisfechos ni demostrados.

## Defectos encontrados y correcciones

- **Déficit de cobertura:** solo existía una prueba de configuración de entorno. Se añadieron pruebas unitarias de validaciones financieras y de fecha, un ejecutor que separa suites, comandos raíz y verificaciones iniciales de PostgreSQL.
- **Riesgo de base equivocada en testing:** se creó una base de integración con nombre `magina_test` y controles para rechazar hosts o credenciales distintas de las ficticias permitidas. Las pruebas y migraciones pasaron en PostgreSQL efímero de CI.
- No se reportan defectos comerciales corregidos por estas pruebas.

## Pendientes antes de considerar apto para producción

- Repetir validación local dentro de un sandbox permitido; la ejecución aprobada disponible es en CI de GitHub.
- Añadir pruebas API y E2E de flujos P0 con PostgreSQL real, fixtures y proveedores simulados.
- Cubrir concurrencia e idempotencia leyendo el estado final de las tablas.
- Añadir Playwright, accesibilidad y carga con umbrales explícitos; los escaneos Gitleaks, Trivy y `pnpm audit` ya corren en CI.
- Medir y publicar cobertura real sin excluir módulos importantes.
- Verificar migraciones/reinicio/persistencia y fallos del pipeline con jobs de CI controlados.
- Realizar aceptación fiscal únicamente en sandbox oficial con autorización; no se ejecutó ni se recomienda una emisión real.

**Recomendación:** no apto para aprobación de producción desde esta evidencia. La ejecución CI aprobada cubre suites básicas, migraciones e imágenes; no demuestra los flujos comerciales P0, cobertura global, accesibilidad, concurrencia ni restauración de respaldos.
