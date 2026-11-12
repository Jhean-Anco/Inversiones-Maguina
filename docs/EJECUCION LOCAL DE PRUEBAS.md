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

La suite verifica el nombre y versión de la base, tablas/relaciones clave y escalas `numeric`. La prueba rechaza hosts remotos y bases que no terminen en `_test`. No inserta ni borra datos de negocio.

Para parar únicamente este proyecto Compose:

```powershell
docker compose --project-name magina-integration-test --env-file config/pruebas-postgres.env -f compose.integration.yaml down
```

El volumen de pruebas se conserva por defecto. Para eliminarlo, primero verifica que el nombre del proyecto sea exactamente `magina-integration-test`; luego usa `down --volumes` solo para ese proyecto y únicamente cuando quieras recrear la base desechable desde cero.

## Suites aún no disponibles

`test:api`, `test:e2e`, `test:security`, `test:coverage` y `test:all` serán comandos de salida cuando sus respectivas suites estén implementadas. La cobertura medida y los reportes de Playwright tampoco están disponibles todavía. No reportes esas suites como aprobadas.

## Ejecución completa

El pipeline GitHub ejecuta typecheck, build, migraciones sobre PostgreSQL vacío, repetición de migraciones, pruebas unitarias, integración y escaneo de imágenes. El workflow debe ampliarse cuando se agreguen las suites API/E2E y el escaneo de secretos Gitleaks. No actives el job de despliegue productivo para validar pruebas.
