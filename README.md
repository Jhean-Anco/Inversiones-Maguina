# Inversiones Maguiña

Monorepo TypeScript para el POS de una tienda, inventario, ventas y facturación electrónica.

## Estructura

```text
apps/
  api/          API modular con NestJS y Fastify
  web/          React + Vite
packages/
  database/     PostgreSQL + Drizzle ORM y migraciones
```

## Requisitos

- Node.js 22 o superior.
- Corepack y pnpm 10.
- Docker Compose para PostgreSQL local.


## Desarrollo local

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
corepack pnpm install
docker compose up -d
corepack pnpm --filter @magina/database db:migrate
corepack pnpm dev
```

Configura `NUBEFACT_RUTA` y `NUBEFACT_TOKEN` en `.env` para indicar la cuenta NubeFact de esta instalación. Desarrollo y servidor ejecutan el mismo código; el endpoint y el token seleccionan la cuenta. `.env` está ignorado por Git: no lo publiques ni copies secretos al frontend. La plantilla `.env.example` contiene valores locales.

Para crear el primer administrador:

```powershell
corepack pnpm --filter @magina/api admin:crear
```

El comando solicita los datos interactivamente. Luego registra los datos fiscales en **Facturación electrónica → Datos del emisor**; deben coincidir con la cuenta indicada por `NUBEFACT_RUTA` y `NUBEFACT_TOKEN`. Las credenciales permanecen en el servidor.

## Funciones disponibles en esta primera versión

- Catálogo de productos, categorías y marcas.
- Entradas, consulta de movimientos y ajustes unitarios de stock.
- Clientes básicos y ventas con cálculo de precio/precio por cantidad en API, IGV, descuento limitado y descuento de existencias.
- Emisión de comprobantes mediante un flujo común de NubeFact; la cuenta depende de la ruta y las credenciales configuradas en cada despliegue.
- Configuración del emisor y series documentales en la aplicación, con consulta paginada de comprobantes.
- Permisos de API basados en asignaciones de rol y claves de idempotencia para evitar duplicar ventas ante repetición de solicitudes.

Las ventas admiten condición contado o crédito, pagos iniciales y pagos posteriores, y emisión de notas de crédito/débito sobre comprobantes emitidos. No reemplaza un sistema contable ni incluye cierre de caja, almacenes múltiples, ni un flujo automatizado para anular comprobantes o recibir devoluciones físicas. La operación con una cuenta real requiere credenciales, series y datos del emisor coincidentes, además de un piloto autorizado; la compilación no acredita una emisión aceptada por SUNAT.

## Construcción y validación

```powershell
corepack pnpm typecheck
corepack pnpm build
```

Si el frontend y la API se encuentran en orígenes distintos, define `VITE_API_URL` a una URL HTTPS **al compilar**. Si comparten origen y reverse proxy, déjala vacía. La compilación de producción rechaza localhost y HTTP.

Consulta [Configuración de producción](docs/CONFIGURACION_PRODUCCION.md), [Auditoría de variables y seguridad](docs/AUDITORIA_VARIABLES_SEGURIDAD.md), la [auditoría de preentrega](docs/AUDITORIA_PREENTREGA_INVENTARIO_FACTURACION.md) y el [modelo de personas y acceso](docs/MODELO_PERSONAS_Y_ACCESO.md).

