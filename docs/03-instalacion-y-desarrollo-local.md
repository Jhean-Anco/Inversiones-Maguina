# 03. Instalación y desarrollo local

**Propósito:** reproducir el arranque en Windows. **Estado:** comandos derivados de scripts; no ejecutados en esta reconstrucción.

Requisitos declarados: Node.js `>=22`, pnpm `10.20.0` por Corepack, Git; Docker Desktop es necesario para los perfiles de contenedores. PostgreSQL puede ser local o el contenedor del Compose raíz.

```powershell
corepack enable
corepack prepare pnpm@10.20.0 --activate
Copy-Item .env.example .env
corepack pnpm install --frozen-lockfile
docker compose up -d
corepack pnpm --filter @magina/database db:migrate
corepack pnpm dev
```

Complete `.env` con valores de desarrollo propios. `apps/api/src/configuracion-entorno.ts` exige URL PostgreSQL, origen frontend, secreto de al menos 32 caracteres y URL/token de NubeFact HTTPS. Las credenciales SIRE y API Perú son condicionales a esas integraciones. `POSTGRES_PORT` en `.env.example` es 5433, enlazado a loopback por el Compose raíz. La API usa puerto 3000; Vite usa 5173 y la URL local `VITE_API_URL` del ejemplo.

Para desarrollo por separado: `corepack pnpm --filter @magina/api dev` o `corepack pnpm --filter @magina/web dev`; el script API compila primero el paquete de base de datos. No ejecutar migraciones contra datos productivos desde un entorno local.

**Fuentes:** `.env.example`, scripts de raíz/workspaces, `compose.dev.yaml`, `apps/api/src/main.ts`, `configuracion-entorno.ts`. **Limitación:** confirmar acceso PostgreSQL, credenciales de proveedores y configuración local antes de atribuir éxito.
