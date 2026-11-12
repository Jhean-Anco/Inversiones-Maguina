# 10. Variables de entorno

**Propósito:** inventario de variables descubiertas en `.env.example`, accesos de aplicación y Compose. **Estado:** verificación estática; nombres de CI/Dokploy se indican por separado. Nunca guardar secretos reales aquí.

| Variable | Aplicación | Obligatoria | Predeterminado observado | Ambiente | Sensibilidad |
|---|---|---:|---|---|---|
| `NODE_ENV` | API | no | según runtime | todos | interna |
| `DATABASE_URL` | API/database | sí | ninguno | todos | secreto |
| `DATABASE_POOL_MAX` | database | no | 10 (Compose prod: 10) | todos | interna |
| `DATABASE_IDLE_TIMEOUT_SECONDS` | database | no | 20 | todos | interna |
| `PORT` | API | no | 3000 | servidor | interna |
| `FRONTEND_ORIGIN` | API | sí | ninguno | servidor | configuración |
| `TRUST_PROXY` | API | no | false | servidor | configuración |
| `AUTENTICACION_SECRETO` | API | sí | ninguno | servidor | secreto |
| `AUTENTICACION_DURACION_SEGUNDOS` | API | no | 28800 | servidor | interna |
| `AUTENTICACION_DURACION_RECORDAR_SEGUNDOS` | API | no | 2592000 | servidor | interna |
| `NUBEFACT_RUTA`, `NUBEFACT_TOKEN` | API | sí al iniciar | ninguno | servidor | token secreto; URL restringida |
| `NUBEFACT_TIMEOUT_MS` | API | no | 20000 | servidor | interna |
| `REGIMEN_TRIBUTARIO` | API | no | código: NRUS si vacío; ejemplo/Compose: RER | servidor | configuración; discrepancia por validar |
| `DESCUENTO_MAXIMO_PORCENTAJE` | API | no | 0 | servidor | configuración |
| `SUNAT_SIRE_RUC`, `SUNAT_SIRE_USUARIO_SOL`, `SUNAT_SIRE_CLAVE_SOL`, `SUNAT_SIRE_CLIENT_ID`, `SUNAT_SIRE_CLIENT_SECRET` | API | para usar SIRE | ninguno | servidor | confidencial/secretos |
| `APIS_PERU_TOKEN` | API | no | vacío | servidor | secreto |
| `UPLOADS_DIR` | API | no | `storage` | servidor | ruta interna |
| `IMAGEN_MAXIMO_BYTES` | API | no | 5242880 | servidor | interna |
| `VITE_API_URL` | web/build | no | vacío; ejemplo usa localhost:3000 | build/navegador | público; nunca incluir secreto |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | PostgreSQL/Compose | dependen del perfil | magina, postgres, puertos perfil | local/servidor | contraseña secreta |
| `API_BASE_URL`, `E2E_BASE_URL`, `CI` | pruebas | según suite | base E2E: localhost:4173 | CI/pruebas | configuración |
| `PATH` | runner de pruebas | entorno del sistema | heredado del proceso | pruebas/host | no secreto |
| `MAGINA_BUILD_SHA` | salud API | no | `local` | build/runtime | identificador público |
| `BUILD_SHA`, `DEPLOY_SHA`, `GHCR_OWNER`, `GHCR_API_IMAGE`, `GHCR_WEB_IMAGE`, `GHCR_OPS_IMAGE` | Docker/deploy | perfil producción | algunos nombres de imagen tienen default | despliegue | no secreto |
| `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID`, `DOKPLOY_ENV_UPDATE_ATOMIC_VERIFIED`, `PRODUCTION_DEPLOY_ENABLED` | workflow | condicional | no aplica | GitHub | API key secreta; otros config |

Solo las variables `VITE_*` pasan al bundle del navegador. No declarar exhaustividad de variables de acciones de terceros fuera del repositorio. `REGIMEN_TRIBUTARIO` tiene valor de ejemplo `RER`, pero la función muestra fallback `NRUS`; Compose prod establece `RER`: resolver explícitamente al configurar. `POSTGRES_PORT` solo aparece para exposición local; no es entrada del contenedor productivo.

**Fuentes:** `configuracion-entorno.ts`, clientes, Vite, Compose, Dockerfiles y workflow. **Pendiente:** control automático de deriva entre inventario, código y YAML.
