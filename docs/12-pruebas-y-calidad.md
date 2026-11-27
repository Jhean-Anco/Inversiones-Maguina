# 12. Pruebas y calidad

**Propósito:** enumerar lo que los scripts ejecutan. **Estado:** scripts inspeccionados; no se ejecutaron suites durante esta reconstrucción.

| Comando | Alcance declarado |
|---|---|
| `pnpm typecheck` | typecheck de workspaces vía Turbo |
| `pnpm build` | compilación de workspaces |
| `pnpm test:unit` | pruebas unitarias API |
| `pnpm test:integration` | integración con `DATABASE_URL` |
| `pnpm test:api` | pruebas HTTP usando `API_BASE_URL` |
| `pnpm test:security` | controles HTTP de seguridad |
| `pnpm test:e2e` | Playwright con config API, frontend/API reales |
| `pnpm test:all` | suites API completas y E2E |
| `pnpm test:coverage` | cobertura V8 suites API |
| `pnpm test:web` / `pnpm test:web:coverage` | pruebas Vitest del frontend (dominio, servicios, hooks, formateadores e impresión) |
| `pnpm --filter @magina/api test:local:coverage` | unitarias + integración API sin servidor HTTP (útil en local; exige `DATABASE_URL` de una BD `magina_test` desechable) |

**Umbrales bloqueantes:** API 90 % de líneas, ramas y funciones sobre `src/**` (sin specs, `main.ts` ni comandos de consola; ajustable solo de forma explícita con `COVERAGE_MIN`). Frontend 90 % de líneas, sentencias y funciones, y 85 % de ramas, sobre dominio, servicios, impresión, utilidades, hooks y formateadores/cálculos de páginas; las vistas se validan con Playwright.

Las pruebas de integración exigen `NODE_ENV=test`; el runner inspecciona la URL para evitar destinos inseguros. CI prepara PostgreSQL 16, migra base vacía, levanta API, corre pruebas HTTP/E2E, publica LCOV como artefacto y audita dependencias. La presencia del job no equivale a resultado verde del SHA actual.

**Fuentes:** scripts de raíz, `apps/api/scripts/run-tests.mjs`, Playwright config, workflow. **Limitaciones:** no reportar porcentaje de cobertura sin artefacto de ejecución asociado al commit.
