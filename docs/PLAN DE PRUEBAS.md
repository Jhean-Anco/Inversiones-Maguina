# Plan de pruebas y control de calidad

## Estado

La infraestructura de calidad está en construcción en la rama `test/quality-gates-e2e`. En GitHub Actions, el run [43208917086](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43208917086) aprobó typecheck, build, migraciones PostgreSQL repetibles, 35 pruebas unitarias (13 con simulador SIRE y 14 con simulador API Perú), 8 integraciones PostgreSQL, 8 pruebas HTTP de API, 4 pruebas de seguridad y 1 flujo Playwright. También aprobó Gitleaks, auditoría de dependencias, escaneos Trivy, builds Docker, Compose y smoke tests. La cobertura medida fue 63.82 % líneas, 73.99 % ramas y 65.86 % funciones, sin umbrales bloqueantes. No se ejecutaron pruebas localmente: la skill de seguridad exige aislamiento de sistema operativo que este entorno no ofrece; Docker Engine local tampoco está disponible.

Este plan refleja las rutas y reglas visibles en el código. La existencia de un controlador no prueba que todo su flujo esté implementado ni que una regla fiscal esté aceptada.

## Prioridades

| Prioridad | Riesgo | Criterio de salida |
|---|---|---|
| P0 | Dinero, stock, sesión/permisos, correlativos y estados de comprobantes | Pruebas unitarias, API e integración real con PostgreSQL para los caminos críticos; cero fallos conocidos |
| P1 | Compras, documentos, archivos, SIRE, mototaxis y reportes | Casos de éxito, rechazo y persistencia; seguridad por permiso y validación de entradas |
| P2 | Navegación general, responsive, accesibilidad y rendimiento | Playwright y axe en rutas reales; k6 en entorno desechable con límites aprobados |

## Capas

1. **Unitarias:** `node:test` con `tsx`; reglas puras y validaciones reales del servicio. Sin llamadas a proveedores ni PostgreSQL.
2. **Integración PostgreSQL:** PostgreSQL 16 desechable; migraciones Drizzle desde cero, metadatos del esquema, relaciones y precisión `numeric`. Las pruebas deben rechazar hosts remotos y nombres de base que no terminen en `_test`.
3. **API:** NestJS/Fastify y PostgreSQL con datos ficticios. Hay 8 pruebas HTTP de autenticación, rutas protegidas, validación, cookie y CORS; la matriz amplia de permisos por rol sigue pendiente.
4. **E2E web:** Playwright abre el frontend Vite real y usa NestJS/Fastify y PostgreSQL desechable. Se agregó un primer flujo de acceso y permisos de navegación; los escenarios comerciales y simuladores de proveedores siguen pendientes.
5. **Seguridad y supply chain:** Gitleaks, Trivy de secretos e imágenes, auditoría de dependencias y 4 pruebas HTTP de controles básicos corren en CI. Faltan pruebas amplias de permisos y límites por módulo.
6. **Docker/CI:** Compose de testing separado, base interna y datos ficticios. Publicación condicionada a los gates; despliegue automático permanece deshabilitado sin autorización explícita.

## Reglas de ejecución

- No usar la base local de desarrollo, la base productiva ni credenciales reales de proveedores.
- Las pruebas de integración solo aceptan `localhost`, loopback o el servicio `db`, y una base cuyo nombre termina en `_test`.
- No emitir comprobantes reales ni ejecutar carga/estrés contra VPS o servicios externos.
- No considerar un `build` como prueba funcional, ni un test omitido como aprobado.
- Mantener trazas, capturas y reportes únicamente con datos sintéticos.

## Próximos bloques

1. Establecer umbrales progresivos de cobertura LCOV sin excluir módulos críticos; la línea actual es 63.82 %, ramas 73.99 % y funciones 65.86 %.
2. Ampliar integraciones a pagos, compras, correlativos y otras transiciones comerciales P0.
3. Completar los flujos Playwright P0 y añadir simuladores externos.
4. Completar la matriz API de permisos por rol y errores de contrato.
5. Añadir accesibilidad automatizada, carga k6, persistencia tras reinicio y fallos controlados de gates CI.
