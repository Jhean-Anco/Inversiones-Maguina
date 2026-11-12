# Ejecución local de pruebas

## Requisitos

- Node.js 22 o superior.
- Corepack y pnpm 10.20.0.
- Docker Engine activo para PostgreSQL de integración.
- Nunca usar la base local habitual, datos comerciales reales ni credenciales de NubeFact/SUNAT/API Perú.

## Pruebas unitarias

Desde la raíz del monorepositorio:

```powershell
corepack pnpm test:unit
```

El ejecutor entrega a las pruebas un entorno con valores ficticios y no hereda variables de proveedores. Incluye build de dependencias del workspace mediante Turbo; no implica que la cobertura global cumpla el objetivo.

## Integración PostgreSQL

Compose publica el puerto de PostgreSQL únicamente en loopback. El archivo de configuración usa credenciales ficticias y la base `magina_test`.

```powershell
docker compose --project-name magina-integration-test --env-file config/pruebas-postgres.env -f compose.integration.yaml up -d --wait db
$env:DATABASE_URL = 'postgres://ci:ci-only-password@127.0.0.1:55432/magina_test'
$env:NODE_ENV = 'test'
corepack pnpm --filter @magina/database db:migrate
corepack pnpm test:integration
```

La suite verifica el nombre y versión de la base, tablas/relaciones clave, precisión `numeric`, rollback de ventas, concurrencia e idempotencia. Las pruebas comerciales insertan únicamente fixtures sintéticos con claves aleatorias y limpian exclusivamente los registros que crearon. El ejecutor rechaza hosts remotos y bases que no sean `magina_test` con credenciales ficticias.

Para parar únicamente este proyecto Compose:

```powershell
docker compose --project-name magina-integration-test --env-file config/pruebas-postgres.env -f compose.integration.yaml down
```

El volumen de pruebas se conserva por defecto. Para eliminarlo, primero verifica que el nombre del proyecto sea exactamente `magina-integration-test`; luego usa `down --volumes` solo para ese proyecto y únicamente cuando quieras recrear la base desechable desde cero.

## API y seguridad HTTP

Los comandos requieren la misma PostgreSQL desechable migrada y una API local iniciada con valores ficticios. En una segunda terminal PowerShell, desde la raíz:

```powershell
$env:NODE_ENV = 'test'
$env:DATABASE_URL = 'postgres://ci:ci-only-password@127.0.0.1:55432/magina_test'
$env:FRONTEND_ORIGIN = 'http://localhost:5173,http://localhost:4173'
$env:AUTENTICACION_SECRETO = 'x' * 40
$env:NUBEFACT_RUTA = 'https://example.invalid/api'
$env:NUBEFACT_TOKEN = 'ci-only-fake-token'
$env:PORT = '3000'
node apps/api/dist/main.js
```

En una tercera terminal:

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:3000'
corepack pnpm test:api
corepack pnpm test:security
corepack pnpm test:e2e
corepack pnpm test:all
corepack pnpm test:coverage
```

`test:e2e` requiere `DATABASE_URL`, `NODE_ENV=test`, una API real en `localhost:3000` y Chromium instalado con `corepack pnpm exec playwright install chromium`. Inicia el frontend Vite en `localhost:4173`, crea un usuario sintético sin permisos en `magina_test` y valida login incorrecto/correcto, permisos visibles, cierre de sesión y redirección de una ruta protegida. Solo elimina las filas creadas por la prueba.

`test:all` requiere `DATABASE_URL` y `API_BASE_URL`; ejecuta las cuatro categorías de API y el flujo E2E de acceso. `test:coverage` ejecuta las cuatro categorías de API y genera `apps/api/coverage/lcov.info`. No uses credenciales reales. La cobertura no incluye el frontend ni tiene aún umbrales mínimos.

## E2E de navegador

La suite Playwright inicial verifica el flujo de acceso contra frontend Vite, API NestJS/Fastify y PostgreSQL reales. Las pruebas E2E de catálogo, compras, ventas, crédito, facturación, SIRE, mototaxis, reportes y recuperación siguen pendientes.

## Ejecución completa

GitHub Actions ejecuta typecheck, build, migraciones repetidas, pruebas unitarias, integración, API, seguridad, una prueba E2E de acceso, cobertura LCOV, auditoría de dependencias, Gitleaks, Trivy, construcción/escaneo de imágenes y smoke tests. Publicación y despliegue productivo permanecen condicionados a `main`; no actives el despliegue para validar pruebas.
