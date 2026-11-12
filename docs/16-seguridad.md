# 16. Seguridad

**Propósito:** listar controles observables y pendientes, sin certificación. **Estado:** estático; CI ejecuta escáneres cuando corre.

- Sesión JWT/cookie, Argon2 y guards de permisos en rutas según controladores.
- Validación de variables y secretos mínimos en configuración de API.
- CORS restringido por `FRONTEND_ORIGIN`, credenciales habilitadas; producción exige HTTPS salvo loopback local.
- NubeFact exige URL HTTPS sin usuario/contraseña incrustados.
- Compose productivo configura `read_only`, `no-new-privileges`, límites de recursos y redes privadas para PostgreSQL/API.
- GitHub Actions usa permisos mínimos declarados, checkout sin persistir credenciales, Gitleaks/Trivy y `pnpm audit`.
- Vite solo expone configuración prefijada `VITE_`; no colocar tokens de servidor en el bundle.

Los escáneres y pruebas no prueban ausencia de vulnerabilidades. Deben revisarse permisos endpoint por endpoint, rotación de credenciales, política de cookies en `autenticacion.controller.ts`, exposición de uploads, secretos remotos y resultados actuales de escaneo.

**Fuentes:** configuración API, auth/guards, compose prod, workflow, archivos Docker. **Pendiente:** evaluación dinámica completa, threat model y resultados de vulnerabilidades del SHA actual.
