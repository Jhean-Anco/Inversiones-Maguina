# 18. Solución de problemas

**Propósito:** diagnóstico basado en validaciones explícitas. **Estado:** mensajes y configuración inspeccionados, no reproducidos aquí.

| Síntoma | Verificación |
|---|---|
| API no inicia por variable requerida | revisar `DATABASE_URL`, `FRONTEND_ORIGIN`, secreto de auth y NubeFact en `configuracion-entorno.ts` |
| `DATABASE_URL` inválida | usar URL `postgres:`/`postgresql:` válida y probar conectividad desde el contenedor API |
| sesión no funciona entre orígenes | revisar HTTPS/origen exacto, CORS `credentials`, URL API y cookie; confirmar navegador |
| rechazo de `VITE_API_URL` | usar URL válida; HTTPS salvo HTTP loopback; valor vacío es relativo |
| migración no puede conectar | comprobar `DATABASE_URL`, salud de PostgreSQL y orden `migrate` antes de API |
| imagen no encuentra build | comprobar que workflow completo finalizó y usar SHA exacto publicado |
| despliegue no corre | confirmar push a `main` y flags de repositorio exigidos; PR no activa job deploy |
| healthcheck 503 | revisar conectividad API→PostgreSQL y logs; endpoint ejecuta `select 1` |

No copiar contraseñas/tokens en incidencias ni logs. **Fuentes:** validadores, Vite config, compose y workflow. Para fallas de proveedores, confirmar primero configuración y consultar respuestas controladas de servicio; no reutilizar credenciales reales en pruebas locales.
