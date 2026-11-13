# 17. Operación y monitoreo

**Propósito:** identificar comprobaciones operativas implementadas. **Estado:** los healthchecks están configurados en Compose; operación real no observada.

API `GET /health` ejecuta `select 1` y responde estado, servicio, base de datos y SHA (`MAGINA_BUILD_SHA` o `local`); ante error devuelve 503 y estado no disponible. Web tiene healthcheck Nginx `/health`. PostgreSQL usa `pg_isready`. El workflow productivo consulta API por HTTPS y `build-info.json` para comparar SHA.

Los logs de API en el workflow se redirigen a archivo temporal solo durante diagnóstico CI. No se identificó en lo inspeccionado servicio centralizado de logs, alertas o panel de métricas. Revisar `docker compose ps`, logs del servicio y healthcheck desde el host sin exponer secretos.

**Fuentes:** `modulo-aplicacion.ts`, Dockerfiles/Nginx, compose, pipeline. **Limitaciones:** no se documenta SLA ni monitoreo externo sin configuración probada.
