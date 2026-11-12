# 14. Despliegue en Dokploy

**Propósito:** explicar el mecanismo versionado, no el estado de una cuenta remota. **Verificación:** flujo del script/workflow inspeccionado; no se contactó Dokploy.

`compose.prod.yaml` espera red externa `dokploy-network`, variables de PostgreSQL/API, `GHCR_OWNER`, `DEPLOY_SHA` completo, URL/token de NubeFact, origen frontend y secreto de autenticación. La API se publica a través de la red Dokploy; frontend sirve HTTP interno en puerto 80. No hay evidencia en el repositorio para afirmar configuración de Traefik, DNS o certificados en una instancia determinada.

Al hacer push a `main`, el job solo despliega cuando dos variables de repositorio autorizan la operación. El script `.github/scripts/deploy-dokploy.mjs` recibe `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID`, SHA objetivo y condición de actualización atómica; preservación de entorno se implementa en ese script. Después se exigen salud y SHA esperado de API/web. Rollback automático intenta restaurar el SHA previo si el paso de despliegue falla y existe `previous_sha`.

Antes de habilitar producción, revisar secretos/variables del repositorio, variables Compose y restauración. No ejecutar manualmente con SHA no aprobado. **Fuentes:** workflow, script de despliegue, compose prod y healthchecks. **Limitación:** falta confirmar existencia/validez de la aplicación y servicios Dokploy externos.
