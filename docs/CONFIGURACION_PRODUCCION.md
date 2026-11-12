# Preparación del ambiente de producción

El código es de primera versión y el desarrollo local no constituye una certificación de producción. Usa ambientes, bases de datos, cuentas NubeFact y secretos separados para desarrollo y producción.

## Configuración requerida del API

Define estas variables en el gestor de secretos/plataforma donde corre el API. No subas el `.env` real al repositorio ni a la imagen Docker.

| Variable | Producción | Propósito |
|---|---|---|
| `NODE_ENV` | `production` | Identifica el entorno del servidor. En el entorno local usa `development`; esta variable no cambia las reglas de negocio ni la cuenta fiscal. |
| `DATABASE_URL` | URL privada con TLS según proveedor | Conexión a PostgreSQL de producción. |
| `PORT` | Puerto asignado por plataforma | Puerto de escucha del API. |
| `FRONTEND_ORIGIN` | Uno o más orígenes HTTPS separados por coma | Lista CORS permitida; solo origen, sin rutas. |
| `AUTENTICACION_SECRETO` | Aleatorio, exclusivo por ambiente y de al menos 32 caracteres | Firma JWT. No uses el texto de `.env.example`. |
| `AUTENTICACION_DURACION_SEGUNDOS` | Segundos | Duración normal de sesión/JWT. |
| `AUTENTICACION_DURACION_RECORDAR_SEGUNDOS` | Segundos | Duración cuando se marca “recordar”. |
| `TRUST_PROXY` | `true` si hay proxy TLS confiable | Permite que Fastify procese correctamente cabeceras del proxy. |
| `NUBEFACT_RUTA` | URL HTTPS de la cuenta asignada | Endpoint que recibe las solicitudes de emisión. |
| `NUBEFACT_TOKEN` | Secreto del proveedor | Autenticación API solo servidor. |
| Series fiscales | Una serie activa por tipo de documento en **Configuración > Series** | Registra el último correlativo de la cuenta NubeFact configurada. |
| `REGIMEN_TRIBUTARIO` | `NRUS`, `RER`, `RMT` o `GENERAL` | Define las reglas tributarias; NRUS no permite emitir facturas. |
| `NUBEFACT_TIMEOUT_MS` | Milisegundos | Límite de espera a NubeFact. |
| `APIS_PERU_TOKEN` | Token de dniruc.apisperu.com | Habilita las consultas de DNI/RUC desde el servidor; nunca se envía al navegador ni en registros de URL. |
| `UPLOADS_DIR` | Ruta absoluta en volumen persistente | Archivos adjuntos del sistema; un filesystem efimero no es suficiente. |
| `IMAGEN_MAXIMO_BYTES` | Bytes | Límite de subida de imagen. |
| `DESCUENTO_MAXIMO_PORCENTAJE` | 0–100, aprobado por el negocio | Tope de descuento por línea en la API. En producción no configurado equivale a 0 %. |

`VITE_API_URL` se lee **al compilar el frontend**, no al arrancar el API. Déjala vacía para servir API y web bajo el mismo origen/reverse proxy, o configura la URL HTTPS del API si va en otro origen. `VITE_` significa que el valor queda público en el bundle: nunca pongas allí contraseñas, tokens o URLs que incorporen credenciales.


## Almacenamiento de archivos

Los archivos se guardan debajo de `UPLOADS_DIR` en carpetas por tipo y registro. Por ejemplo:

```text
storage/
  imagenes/repuestos/<producto-id>/
  imagenes/categorias/<categoria-id>/
  imagenes/marcas/<marca-id>/
  imagenes/mototaxis/<unidad-id>/
  compras/evidencias/<entrada-id>/
  ventas/facturas/<ingreso-id>/
  ventas/boletas/<ingreso-id>/
  ventas/notas-venta/<ingreso-id>/
```

PostgreSQL conserva la ruta relativa, el tipo MIME, el tamaño y la huella SHA-256; el contenido permanece en el volumen del proyecto y se entrega mediante el punto de acceso autenticado `/archivos/:id/contenido`. Respalda y restaura el volumen junto con la base de datos.

## Orden de puesta en marcha

1. Provisiona PostgreSQL y volumen persistente de imágenes con acceso restringido.
2. Carga variables y secretos productivos en la plataforma; verifica que nunca aparezcan en frontend, logs o respuestas HTTP.
3. Construye base de datos, API y frontend. Corre las migraciones una sola vez con un usuario de despliegue controlado.
4. Inicia el API y comprueba `/health`; debe verificar acceso a PostgreSQL.
5. Inicia el frontend detrás de HTTPS, con `VITE_API_URL` correcto y CORS coincidente con `FRONTEND_ORIGIN`.
6. Inicia sesión con una cuenta administradora, registra los datos del emisor en **Facturación electrónica → Datos del emisor** y comprueba RUC/razón social contra la cuenta de NubeFact.
7. Antes de atender al público, completa un piloto acordado con cliente autorizado y verifica el estado del CPE directamente en NubeFact. No uses datos de prueba ni la emisión DEMO como comprobante real.
8. Verifica respaldos/restauración de PostgreSQL y persistencia/restauración del volumen de imágenes.

## Controles que aporta el código

- La aplicación siempre requiere JWT propio, PostgreSQL, orígenes CORS válidos y credenciales NubeFact. En cada despliegue, las variables deben apuntar a sus servicios y almacenamiento persistente; HTTPS se exige para todo host distinto de loopback local.
- Cookies de sesión `HttpOnly`, `SameSite=Lax` y `Secure` en todos los entornos. Para trabajar localmente usa `localhost` y configura explícitamente `FRONTEND_ORIGIN` y `VITE_API_URL`.
- CORS no usa comodín y acepta una lista explícita de orígenes.
- Las rutas protegidas consultan permisos asignados al rol del usuario en la API.
- Las ventas usan clave de idempotencia y huella de los datos; repetir una clave con un cuerpo distinto se rechaza.
- `/health` consulta PostgreSQL en vez de devolver un `ok` constante.
- Tokens de NubeFact y API Perú permanecen solo en el backend.

## Limitaciones pendientes antes de abrir al público

- GitHub Actions verifica typecheck, build, migraciones, pruebas unitarias, integración, HTTP, seguridad, cuatro escenarios Playwright y builds/escaneos/humo de Docker en ambientes desechables. El run [43234258502](https://github.com/Jhean-Anco/Inversiones-Maguina/actions/runs/43234258502) aprobó el commit `2b6157e49951aa8d83a9851a3d3e57f43de05af8`. La verificación E2E comercial y de accesibilidad con axe, pruebas de carga, restauración aislada y pruebas negativas de los gates siguen pendientes; la cobertura aún está debajo de la meta final.
- No hay un comando general de lint para el código de toda la aplicación; `format:check` valida configuración de workspace y despliegue, mientras el typecheck cubre los paquetes y archivos E2E.
- No se ha probado NubeFact productivo ni un CPE de este negocio. La primera emisión real debe ser un piloto autorizado y revisado.
- Si se pierde una respuesta de NubeFact, la app bloquea la repetición con la misma clave y exige conciliación manual; todavía no consulta/reintenta automáticamente el estado remoto.
- No se ha implementado límite distribuido de intentos de inicio de sesión; configura protección/rate limit en el proxy hasta contar con un mecanismo compartido.
- Los datos del emisor en la aplicación deben coincidir con la cuenta NubeFact.
- Respaldo, monitoreo, TLS, proxy, DNS y restauración dependen de la plataforma productiva y deben verificarse allí.
