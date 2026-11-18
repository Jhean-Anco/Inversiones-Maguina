# CI/CD y promoción a producción

## Diagnóstico y cambios

El repositorio tenía un solo workflow (`pipeline.yml`) que ejecutaba la suite completa en cada push de cualquier rama. El workflow ya restringe los pushes automáticos a `main`, mantiene validación obligatoria para Pull Requests a `main` y conserva construcción, publicación en GHCR y despliegue Dokploy ligados al SHA.

Cambios en esta propuesta local:

- `pipeline.yml` solo valida Pull Requests a `main` y pushes posteriores a `main`; no hay ejecuciones automáticas para `development`, `develop`, `feature/*`, `fix/*`, `hotfix/*`, `test/*` ni otras ramas auxiliares.
- Las comprobaciones de código y las comprobaciones de imágenes se ejecutan en paralelo para PRs. `production-quality-gate` falla si cualquiera falla, se cancela o se omite.
- Se agregó Biome 2.6.6 como linter, con `pnpm lint` aplicado al código fuente y scripts. El preset explícito activa errores de variables locales no usadas y `debugger`; el parser permite los decoradores de parámetros que usa Nest. El chequeo de tipos sigue cubriendo TypeScript.
- Se usa el conjunto API con cobertura una sola vez; el build, TypeScript, E2E, migraciones, Gitleaks, CodeQL, `pnpm audit`, Trivy, Docker Compose y persistencia siguen siendo controles bloqueantes.
- La publicación requiere el guard de PR fusionado y que la validación post-merge de `quality` también haya terminado bien. El despliegue necesita una publicación exitosa y conserva la verificación SHA, los controles de salud y la restauración de imágenes.
- El servicio productivo `migrate` aplica Drizzle al iniciar el despliegue. Se retiró `clean-uploads.mjs` de ese comando: antes borraba imágenes y adjuntos persistentes en cada despliegue. El script continúa disponible y su prueba solo lo ejecuta sobre archivos temporales.
- El guard de migraciones rechaza ediciones de migraciones históricas y varias operaciones destructivas habituales. Es una detección por patrones, no un analizador SQL completo; los cambios de esquema requieren revisión de compatibilidad y estrategia expand-contract.
- `release-promotion.yml` crea una rama determinista `release/<12 caracteres SHA>` desde el SHA exacto y abre un PR a `main`. La rama estable evita abrir candidatos repetidos para el mismo commit.

## Inventario de workflows

| Workflow | Uso | Ejecución automática |
| --- | --- | --- |
| `pipeline.yml` | Calidad, seguridad, migración aislada, imágenes, gate, publicación y despliegue | PR a `main`; push a `main` |
| `release-promotion.yml` | Promoción voluntaria de un SHA a PR | Solo `workflow_dispatch`, ejecutado desde `main` |

No se ejecutan suites completas automáticamente al hacer push a ramas de desarrollo. Las acciones externas existentes continúan fijadas a commits inmutables.

## Promover un SHA

1. Completa los commits en `development` o en otra rama auxiliar y sube los cambios normalmente.
2. En GitHub, abre **Actions → Promoción deliberada a main → Run workflow** y selecciona la rama `main` para ejecutar el workflow.
3. Indica `source_branch` y el SHA completo de 40 caracteres que quieres promover.
4. El workflow confirma que ese SHA pertenece a la rama indicada, crea `release/<SHA12>` desde ese commit y abre el PR a `main`.
5. Espera `production-quality-gate`, revisa CodeQL y los resultados de seguridad, resuelve conversaciones y actualiza la rama candidata si `main` avanzó.
6. Haz merge manual cuando las condiciones configuradas estén aprobadas. No hay auto-merge.

La rama candidata no incorpora cambios posteriores de la rama de desarrollo. Para promover otros cambios, vuelve a ejecutar el workflow con el nuevo SHA; se generará otra rama determinista.

## GitHub App para crear PRs

La promoción necesita una GitHub App instalada solo en este repositorio. Dale únicamente:

- **Contents: Read and write**, para crear la referencia candidata.
- **Pull requests: Read and write**, para abrir el PR.

En **Settings → Secrets and variables → Actions**, configura:

- Variable `RELEASE_APP_CLIENT_ID`: Client ID de la App.
- Secret `RELEASE_APP_PRIVATE_KEY`: clave privada PEM de la App.

Instala la App solo en `Jhean-Anco/Inversiones-Maguina`. No le concedas bypass del Ruleset. El workflow solicita un token de instalación acotado al repositorio y a esos dos permisos; no usa PAT ni `GITHUB_TOKEN` para crear el PR. Esto permite que el evento del PR inicie la validación automáticamente, sin la aprobación manual que GitHub puede exigir a PRs creados con `GITHUB_TOKEN`.

## Protección remota de `main`

La inspección de solo lectura en GitHub confirmó que ya existe una protección clásica activa para `main`; no hace falta crear un Ruleset para cumplir esta función. La regla actual requiere PR, exige rama actualizada y requiere ambos jobs de validación que el workflow publica para PRs: `Typecheck, build, tests y migraciones limpias` (`quality`) y `Construir, escanear y probar imágenes` (`images`). `production-quality-gate` es el indicador agregado y falla si alguno de esos jobs falla, se cancela o se omite. La regla también aplica a administradores, bloquea force-push y borrado. No exige aprobaciones, lo que evita una aprobación imposible si solo hay una persona desarrollando.

La configuración recomendada al conservar esta regla es mantener ambos checks requeridos y, si hay conversaciones de revisión, activar **Require conversation resolution before merging**. No conceder bypass a la GitHub App de promoción ni activar auto-merge. La regla requerida para checks debe corresponder a los nombres reales de los jobs de GitHub Actions; no se debe reemplazar por `production-quality-gate` hasta que ese check haya corrido en GitHub y esté disponible para seleccionarlo. Como alternativa futura, se puede convertir a un Ruleset de rama dirigido solo a `main`, con PR obligatorio, estos mismos checks, rama actualizada, cero bypass, sin force-push ni eliminación y resolución de conversaciones. Evitar duplicar reglas clásicas y Rulesets sin verificar cómo se combinan.

### Estado remoto observado

El 17 de noviembre de 2026, la página **Settings → Rules → Rulesets** mostró que no hay Rulesets creados y avisó que existen reglas clásicas de protección convertibles. En **Settings → Branches** se observó una regla clásica que aplica a `main`. La regla exige PR, checks aprobados y que la rama esté actualizada; sus checks requeridos son `Typecheck, build, tests y migraciones limpias` y `Construir, escanear y probar imágenes`. También está activado **Do not allow bypassing the above settings**; permitir force-push y eliminar ramas están desactivados. Las aprobaciones humanas y la resolución de conversaciones no están requeridas.

La sesión autenticada permitió abrir el formulario de edición de esa regla y mostró el control **Save changes**; esto confirma una ruta de administración visible para la cuenta conectada, pero no demuestra permiso efectivo de guardado porque no se intentó guardar. La API de Rulesets devolvió `[]` y el endpoint de branch protection del conector devolvió `403 Resource not accessible by integration`; ese 403 corresponde al conector y no contradice la inspección de solo lectura en navegador. No se guardó ni convirtió la regla, ni se creó un Ruleset.

La página de edición de la regla clásica está accesible desde **Settings → Branches**, lo que aporta una ruta visible para revisar y administrar la protección existente. No se verificó la capacidad de guardar cambios, por lo que no se recomienda convertir la regla ni activar nuevas restricciones hasta que una persona administradora confirme esa capacidad de recuperación. El estado efectivo confirmado es la regla clásica existente; no se creó ni activó un Ruleset.

## Pruebas de bases de datos y despliegue

El workflow de PR crea un PostgreSQL efímero `magina_test`, aplica las migraciones dos veces y ejecuta suites API y E2E contra el entorno local aislado. Los jobs de contenedores levantan `compose.test.yaml` con `.env` ficticio y validan salud, persistencia PostgreSQL y persistencia de archivos de prueba. Ninguna comprobación de CI apunta a la base productiva.

Al desplegar, `compose.prod.yaml` sí aplica migraciones a la base productiva como parte del flujo de Dokploy; CI no ejecuta ese servicio contra producción. El rollback automático restaura las referencias de imágenes y pide a Dokploy iniciar la versión previa, pero no revierte migraciones de base de datos. Por eso las migraciones deben ser compatibles hacia atrás y los cambios destructivos requieren plan expand-contract y aprobación explícita antes de llegar a `main`.

El despliegue está condicionado a la variable `PRODUCTION_DEPLOY_ENABLED=true` y necesita `DOKPLOY_URL`, `DOKPLOY_API_KEY` y `DOKPLOY_COMPOSE_ID` como secretos de Actions. No se habilitaron ni se probaron contra producción.

## Validaciones y escenarios

| Escenario | Mecanismo | Evidencia disponible |
| --- | --- | --- |
| Push auxiliar sin CI completa | Solo trigger `push` a `main` | Inspección de triggers; no se hizo push remoto |
| PR a `main` | Pipeline completo y gate único | `actionlint`, formato y 21 pruebas de scripts pasan localmente; ejecución en GitHub pendiente |
| Test, escaneo, imagen o migración fallidos/omitidos | Gate `always()` exige éxito de ambos jobs | Pruebas locales simulan `failure`, `cancelled`, `skipped` y resultados ausentes para ambos jobs; la ejecución remota del check sigue pendiente |
| Cambios posteriores al PR | Evento `synchronize`; requerido check del SHA actual | Revisado en configuración; evento remoto pendiente |
| Push directo, force-push o borrado de `main` | Protección remota de `main` | Regla clásica inspeccionada en navegador: requiere PR, no permite bypass, force-push ni borrado. No se intentaron operaciones de escritura; la API de branch protection del conector responde 403. Rulesets sigue vacío. |
| Merge a `main` | Guard exige PR fusionado, run PR exitoso y `quality` post-merge exitoso | Mock tests locales; ejecución remota pendiente |
| GHCR y Dokploy | Publicación del SHA; despliegue condicionado y verificación de health | No se publicó ni desplegó desde este trabajo; no se verificó la configuración productiva de Actions |
| Push a `development` durante validación | Sin workflow de push en ramas auxiliares; grupo de concurrencia por PR | Verificación estructural; escenario remoto pendiente |

### Evidencia local del 17 de noviembre de 2026

- `node --test` de guards, gate, promoción, despliegue y archivos: 31/31 aprobadas. `pnpm format:check`, `actionlint` en ambos workflows y `git diff --check` terminaron sin errores.
- Biome `pnpm lint` pasó sobre 203 archivos fuente, configuración y scripts. `pnpm typecheck` pasó en los tres workspaces; `pnpm test:unit` pasó 40/40 y el build de API, base de datos y web pasó.
- La API pasó 65/65 pruebas de cobertura y el flujo E2E local 9/9. El stack Docker aislado aplicó las migraciones en PostgreSQL vacío; API y web quedaron sanas. Se verificaron CORS, CSP, SHA de compilación y persistencia de una fila y un archivo tras reiniciar contenedores.
- Las imágenes locales API, ops y web pasaron Trivy 0.70.0 sin hallazgos HIGH o CRITICAL. `pnpm audit --audit-level high` pasa; el audit completo reporta tres vulnerabilidades MODERATE (`esbuild`, `glob`, `minimatch`).
- El guard contra `origin/main` bloquea la migración `0181_motionless_sharon_carter.sql` por operaciones destructivas. Es el resultado esperado del control y deja el pipeline sin aprobación para este árbol hasta que la migración tenga una estrategia compatible revisada.
- No se ejecutó Gitleaks localmente; el workflow sí incluye la acción, pero su resultado aún requiere una ejecución remota. El intento local de Trivy filesystem para secretos fue detenido tras exceder el tiempo y recursos razonables del entorno Windows, así que ese control también queda pendiente de una ejecución CI. Tampoco se han ejecutado PRs de prueba, publicación GHCR, despliegue Dokploy ni escenarios de protección de rama.
- La API de Rulesets devolvió `[]`; en navegador se verificó una regla clásica activa para `main` y sus valores visibles. No se modificó nada remoto. El permiso de guardar cambios desde la cuenta conectada aún no se ha probado.

Para reproducir localmente un control: `pnpm format:check`, `pnpm typecheck`, `pnpm build`, `pnpm test:coverage`, `pnpm test:e2e`, `pnpm --filter @magina/database db:migrate`, `pnpm audit --audit-level high` y `node --test .github/scripts/*.test.mjs`. Las comprobaciones Docker requieren Docker disponible y `.env` ficticio como el workflow; nunca uses credenciales o URLs productivas para reproducirlas.
