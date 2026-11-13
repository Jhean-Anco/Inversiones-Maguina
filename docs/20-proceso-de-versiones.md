# 20. Proceso de versiones

**Propósito:** documentar señales verificadas en Git/Actions. **Estado:** configuración de rama actual y workflow observados; política formal de release no hallada.

El checkout inspeccionado está en `test/quality-gates-e2e` con upstream `origin/test/quality-gates-e2e`. El workflow corre PR hacia `main` o `feature/docker-cicd-production`, y push a `main` o `test/quality-gates-e2e`. La publicación de contenedores se identifica por SHA y deploy de producción solo desde push a `main` bajo flags aprobatorios.

Secuencia de colaboración reproducible: crear rama desde base vigente, hacer cambios, ejecutar `pnpm format:check`, `pnpm typecheck`, `pnpm build` y suites aplicables, abrir PR y atender workflow. No se inventan nombres de ramas obligatorias, versión semántica, proceso de release o política de aprobación no presente en el repo.

El workflow intenta rollback de app al SHA previo ante fallo de humo cuando el script devuelve `previous_sha`; esto no sustituye una estrategia de rollback de esquema. Migraciones son parte del despliegue y pueden tener compatibilidad propia; evaluar antes de revertir imagen.

**Fuentes:** `git branch` del checkout y workflow/scripts. **Limitaciones:** estado remoto de PR, tags/releases y reglas de protección requieren GitHub.
