# 11. Docker y contenedores

**Propósito:** documentar perfiles declarados. **Estado:** inspección de archivos; no se construyeron ni iniciaron contenedores aquí.

Compose incluye `compose.dev.yaml`, `compose.test.yaml`, `compose.integration.yaml`, `compose.prod.yaml` y `docker-compose.yml` (base local PostgreSQL). Producción organiza `db`, `migrate`, `api` y `web`; la API espera migración terminada, monta `uploads-data`, usa filesystem de solo lectura y healthcheck `/health`. Web expone puerto 80 a red Dokploy externa. PostgreSQL y migraciones quedan en red privada; `dokploy-network` debe existir antes del despliegue.

Dockerfiles: `api.Dockerfile`, `web.Dockerfile`, y variantes dev. La imagen ops construye comandos de migración. No se inventan tags: workflow publica `sha-${github.sha}` en GHCR.

```powershell
docker compose -f compose.dev.yaml config
docker compose -f compose.dev.yaml up -d
docker compose -f compose.dev.yaml down
```

Revisar primero el perfil y `.env`; `down` no elimina volúmenes salvo que se agregue `-v`. Para producción la fuente es `compose.prod.yaml`, que requiere variables y red externa; no usar valores de desarrollo. **Fuentes:** YAML raíz y Dockerfiles. **Limitaciones:** ejecución no comprobada, no reportar límites efectivos de recursos sin leer host runtime.
