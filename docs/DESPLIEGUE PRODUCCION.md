# Despliegue de producción

## Arquitectura

GitHub Actions valida cada pull request a `main` y cada push a `main`. El flujo bloquea la publicación si fallan el typecheck, build, pruebas, migración sobre PostgreSQL vacío, auditoría de dependencias, escaneo de secretos, construcción de imágenes, validación de Compose o escaneo de vulnerabilidades.

Después de CI, publica en GHCR tres imágenes ligadas al SHA completo: API, web y operaciones (migraciones y alta inicial del administrador). La compose de Dokploy solo consume imágenes existentes; no compila en el VPS. Las etiquetas tienen la forma `sha-<40 caracteres>` y los digests quedan en el resumen de GitHub Actions.

La primera promoción a producción sigue deshabilitada hasta autorizarla y verificar la integración con la instancia Dokploy 0.31.0. El job `deploy` requiere las variables de repositorio `PRODUCTION_DEPLOY_ENABLED=true` y `DOKPLOY_ENV_UPDATE_ATOMIC_VERIFIED=true`, los secretos `DOKPLOY_URL`, `DOKPLOY_API_KEY`, `DOKPLOY_COMPOSE_ID` y el entorno GitHub `production`. No activar estos controles antes de revisar la versión, permisos, reglas de aprobación y respuesta real de la API en la instancia. El script consulta `compose.one`, modifica solo `DEPLOY_SHA` conservando el resto del entorno, vuelve a leerlo y aborta si detecta diferencias; luego llama a `compose.deploy`.

La API `compose.saveEnvironment` sustituye el texto completo del entorno y no documenta control de concurrencia compare-and-swap. El script vuelve a comprobar el resultado, pero esto no elimina una carrera con una edición manual concurrente. Por ese motivo el job falla cerrado por defecto. Si no se demuestra un procedimiento atómico seguro en Dokploy, mantener CD desactivado y desplegar imágenes manualmente desde Dokploy hasta acordar un mecanismo seguro.

El PostgreSQL `maguina` de prueba que ya existe en Dokploy no se modifica ni se elimina. Este Compose crea una instancia de produccion aislada con volumenes nuevos. Si se pretende convertir la instancia existente en produccion, detenerse antes del despliegue y acordar primero una migracion explicita; no conectar produccion al servicio de prueba por defecto.

## Preparar Dokploy

1. Crear en el proyecto `inversiones-maguina` una aplicación Docker Compose y desactivar los despliegues automáticos por cambios en Git.
2. Usar `compose.prod.yaml` como archivo de Compose. El servidor debe poder descargar las imágenes privadas de GHCR con un token de lectura de paquetes.
3. Configurar las variables de entorno que aparecen en la siguiente sección desde Dokploy. No subir un `.env` productivo al repositorio ni incluirlo en una imagen.
4. Configurar el frontend en el puerto interno `80` con el dominio `inversionesmaguina.network`; configurar el API en el puerto `3000` con `api.inversionesmaguina.network`. Usar la gestión de dominios de Dokploy para que Traefik agregue sus reglas y TLS. La compose no duplica labels de Traefik.
5. El servicio `db` solo pertenece a la red interna `private`, no publica puertos y conserva PostgreSQL en `postgres-data`. `/data/uploads` se persiste por separado en `uploads-data`.
6. Revisar el Preview Compose de Dokploy y verificar que web/API se conectan a `dokploy-network`, mientras DB y migración siguen privadas. No crear otro PostgreSQL ni reemplazar la base de prueba existente.
7. Antes del primer despliegue, verificar DNS, firewall, HTTPS, lectura GHCR, variables y política de respaldo. La primera publicación productiva requiere autorización explícita.

## Prueba local de contenedores de producción

Usar únicamente valores ficticios y una base/volúmenes desechables. En `.env`, establece una contraseña local simple URL-safe, `AUTENTICACION_SECRETO` aleatorio de prueba de más de 32 caracteres, `NUBEFACT_RUTA=https://example.invalid/api`, `NUBEFACT_TOKEN=token-ficticio-local`, el origen de prueba y `REGIMEN_TRIBUTARIO=RER`. No uses credenciales reales ni emitas comprobantes.

```powershell
docker compose --env-file .env -f compose.test.yaml up --build -d
docker compose --env-file .env -f compose.test.yaml ps
Invoke-WebRequest http://localhost:8080/health
Invoke-WebRequest http://localhost:3000/health
docker compose --env-file .env -f compose.test.yaml logs --tail 100
docker compose --env-file .env -f compose.test.yaml down
```

El Compose de prueba publica solo en loopback y crea volúmenes `test-*` independientes. `down` conserva esos volúmenes para no borrar datos accidentalmente.

## Variables de Dokploy

Configurar `GHCR_OWNER` en minúsculas, `DEPLOY_SHA` como SHA completo, `POSTGRES_DB=maguina`, `POSTGRES_USER=maguina_app`, `POSTGRES_PASSWORD`, `DATABASE_URL` (host `db`, puerto `5432`, base `maguina` y credenciales URL-encoded), `FRONTEND_ORIGIN=https://inversionesmaguina.network`, `AUTENTICACION_SECRETO` aleatorio exclusivo de producción, `NUBEFACT_RUTA`, `NUBEFACT_TOKEN`, `REGIMEN_TRIBUTARIO=RER` (valor indicado actualmente, pendiente de corroboración fiscal) y las demás variables que se necesiten de `.env.example`: sesiones, `TRUST_PROXY=true`, pool PostgreSQL, timeout NubeFact, `SUNAT_SIRE_*`, `APIS_PERU_TOKEN`, descuento e imágenes. No copiar los valores de desarrollo.

La API valida credenciales NubeFact durante el arranque. No usar la cuenta productiva hasta confirmar token, series, datos del emisor y autorización del negocio. `VITE_API_URL` se incorpora al compilar el frontend y es pública; nunca poner secretos en ella.

## Migraciones y administrador inicial

En cada cambio de `DEPLOY_SHA`, Compose inicia `migrate` después de `pg_isready`. API espera que el contenedor de migraciones termine correctamente; un fallo impide que API arranque. `migrate` usa la imagen `ops` del mismo SHA y ejecuta Drizzle Kit directamente. No ejecutar `drizzle push`, no inicializar la base automáticamente y no borrar volúmenes.

La imagen de operaciones también contiene el comando interactivo inicial. Ejecutarlo una sola vez, solo con autorización y respaldos verificados: desde Dokploy, crear un contenedor one-off con la imagen `inversiones-maguina-ops:sha-<SHA aprobado>`, entorno productivo y comando `node apps/api/dist/comandos/crear-administrador.js`. El proceso pregunta los datos en la terminal; no pegarlos en logs o CI. El comando rechaza crear otra cuenta si ya existe un administrador.

## Cambios de esquema

La CI aplica todas las migraciones versionadas a PostgreSQL 16 vacío, lo que comprueba que el historial se puede aplicar desde cero. En producción, revisar cada migración antes de merge. Para cambios incompatibles se necesita una secuencia expandir/migrar/contraer en versiones separadas. Obtener y verificar un respaldo restaurable antes de cambios de esquema productivos; la migración nunca restaura o revierte datos automáticamente.

## Publicación, recuperación y comprobación

Una vez activada y aprobada la integración, los merges de `main` pasan por CI, generan imágenes nuevas por SHA y solo después pueden llamar a Dokploy. La concurrencia de GitHub evita dos CD simultáneos. Si la etapa de CI o escaneo falla, no se publican imágenes. Si Dokploy falla, no se ejecutan pasos automáticos de recuperación de base de datos.

Después de un despliegue autorizado comprobar:

- `https://inversionesmaguina.network/health` responde `200`.
- `https://api.inversionesmaguina.network/health` responde con API y PostgreSQL saludables y su `buildSha` coincide con el SHA aprobado.
- `https://inversionesmaguina.network/build-info.json` publica el SHA incorporado en la imagen web. El job CD compara ambos SHA y detiene la promoción si no coinciden; al completar, registra la versión, hora UTC y resultado en el resumen de Actions.
- Conserva los digests publicados en Actions y, durante la primera verificación, coteja el digest de cada imagen que Dokploy ejecuta con el digest publicado.
- Un usuario de prueba inicia sesión; la navegación API funciona y se guardan/leen adjuntos de prueba.
- Se han restaurado y cotejado los respaldos de PostgreSQL y archivos en un ambiente separado.

Si falla el despliegue de Dokploy o el humo HTTPS y ya existe un SHA anterior, el workflow intenta volver a desplegar ese SHA y verifica que API y frontend vuelvan a servirlo. Esto solo recupera la aplicacion; no revierte ni restaura datos. Si es la primera version o el rollback no pasa salud, se requiere intervencion manual. Para volver a la versión anterior de aplicación, cambiar `DEPLOY_SHA` a su SHA aprobado y volver a desplegar en Dokploy después de verificar la compatibilidad del esquema. No restaurar la base automáticamente ni ejecutar migraciones inversas destructivas.

## Pendientes externos antes de producción

- Credenciales de lectura GHCR en Dokploy, secretos API, Compose ID y `DOKPLOY_URL`.
- Comprobar experimentalmente la compatibilidad de `compose.one`, `compose.saveEnvironment` y `compose.deploy` en Dokploy 0.31.0, incluida la preservación de todas las variables y protección frente a cambios simultáneos.
- Crear y probar aprobación/entorno protegido de GitHub; habilitar reglas de rama en `main` según el plan disponible.
- Configurar DNS, TLS y firewall de Hostinger.
- Seleccionar almacenamiento externo cifrado para respaldos, retención y credenciales. No existe destino definido en el repositorio; verificar una restauración de DB y adjuntos antes de publicar.
- Ejecutar el primer despliegue productivo solo tras autorización explícita.
