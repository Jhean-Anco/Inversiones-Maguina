# Auditoría de variables de entorno y seguridad

**Fecha:** 26 de octubre de 2026  
**Alcance:** código fuente API/base de datos/frontend, `.env.example`, `.gitignore` y `docker-compose.yml`. Se revisó el `.env` local únicamente para comprobar nombres y presencia de valores; este informe no contiene valores del archivo.

## Resultado

- El `.env` real está cubierto por `.gitignore` con `.env` y `.env.*`; `.env.example` es la única excepción explícita.
- No se detectaron asignaciones literales de tokens, JWT o contraseñas en los archivos fuente TypeScript/JavaScript/YAML revisados.
- No se imprimieron ni copiaron los valores del `.env` a terminal, documentación o frontend.
- `NODE_ENV=production` ahora rechaza configuración crítica incompleta y valores conocidos de desarrollo.
- Este checkout no tiene metadatos Git; por eso no se pudo verificar si un `.env` fue incluido históricamente en commits o remotos.

## Variables protegidas del servidor

| Variable | Uso | Regla |
|---|---|---|
| `DATABASE_URL` | Credenciales y conexión a PostgreSQL | Secreto del servidor; usar TLS/SSL que exija el proveedor. |
| `AUTENTICACION_SECRETO` | Firma de sesiones JWT | Solo servidor, aleatorio y exclusivo por ambiente; producción exige 32+ caracteres y rechaza marcadores comunes de desarrollo. |
| `NUBEFACT_TOKEN` | Autenticación de emisión | Solo servidor; corresponde a la cuenta NubeFact configurada en ese despliegue. |
| `NUBEFACT_RUTA` | Endpoint de NubeFact | Solo servidor; la ruta configurada recibe las solicitudes de emisión. |
| `APIS_PERU_TOKEN` | Consulta de DNI/RUC mediante dniruc.apisperu.com | Solo servidor; nunca exponerlo en el frontend ni en respuestas HTTP. |
| `POSTGRES_PASSWORD` | Contenedor PostgreSQL de desarrollo | Solo desarrollo local, ignorado por Git y nunca reutilizar en producción. |

Las respuestas de estado exponen el régimen tributario y booleanos de configuración (`credencialesConfiguradas`, `seriesConfiguradas`, etc.). No envían el token ni la ruta, y no distinguen cuentas DEMO y PRODUCCIÓN.

## Variables operativas ahora configurables

- Aplicación: `NODE_ENV`, `PORT`, `FRONTEND_ORIGIN`, `TRUST_PROXY`.
- Navegador/build: `VITE_API_URL`; es público y queda compilado en el bundle. En producción admite HTTPS o cadena vacía para mismo origen; bloquea localhost y HTTP.
- Sesión: `AUTENTICACION_DURACION_SEGUNDOS`, `AUTENTICACION_DURACION_RECORDAR_SEGUNDOS`.
- PostgreSQL/contenedor local: `DATABASE_POOL_MAX`, `DATABASE_IDLE_TIMEOUT_SECONDS`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PORT`.
- Archivos: `UPLOADS_DIR`, `IMAGEN_MAXIMO_BYTES`. Producción exige ruta absoluta para ubicar un volumen persistente.
- Política comercial: `DESCUENTO_MAXIMO_PORCENTAJE`; producción lo limita por línea y, si no se define, queda en 0 %.


## Controles del código

- [configuracion-entorno.ts](../apps/api/src/configuracion-entorno.ts) valida ambiente, puerto, CORS, JWT, NubeFact, series, tiempos, límite de imagen y volumen.
- [main.ts](../apps/api/src/main.ts) configura CORS por orígenes explícitos, confianza de proxy y límite multipart.
- [autenticacion.controller.ts](../apps/api/src/modulos/autenticacion/autenticacion.controller.ts) emite cookies HttpOnly, SameSite Lax y Secure en producción.
- [guardia-permiso.ts](../apps/api/src/modulos/autenticacion/guardia-permiso.ts) valida permisos en la API según el rol persistido.
- [docker-compose.yml](../docker-compose.yml) requiere `POSTGRES_PASSWORD` y publica los puertos de desarrollo en loopback.

## Riesgos y tareas pendientes

1. No hay limitador de intentos de inicio de sesión distribuido; protege `/autenticacion/iniciar-sesion` en el proxy hasta incorporarlo al API.
3. El token de NubeFact y los datos del cliente/productos se envían al proveedor al emitir; valida contrato, conservación de datos y privacidad con el cliente.
4. `UPLOADS_DIR` requiere volumen persistente y respaldo. El código local no configura S3, restauración ni replicación.
5. El `POSTGRES_PASSWORD=postgres` del `.env.example` es exclusivamente una conveniencia local; no es una contraseña de despliegue.
6. No hay CI, escaneo automatizado de secretos ni repositorio Git verificable en este checkout. Activa secret scanning y protección de ramas al restaurar/publicar el repositorio.
7. No hay comandos de `lint` configurados ni pruebas automatizadas; build y TypeScript no sustituyen tests de seguridad, autorización ni integraciones.

## Regla para preparar producción

Carga secretos mediante variables del servicio de despliegue/secret manager, nunca mediante el frontend ni el bundle estático. Configura `NODE_ENV=production`, las credenciales de la cuenta NubeFact que corresponda a ese despliegue, origen HTTPS, series autorizadas en la base de datos, conexión segura, volumen persistente y `VITE_API_URL` correcto al compilar el frontend. El código de emisión es el mismo en todos los despliegues; sigue [Configuración de producción](CONFIGURACION_PRODUCCION.md).
