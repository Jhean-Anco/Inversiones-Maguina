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

Completa en `.env` las credenciales DEMO de NubeFact y API Perú si vas a usar esas integraciones. `.env` está ignorado por Git: no lo publiques ni copies secretos al frontend. La plantilla `.env.example` contiene solo valores de desarrollo.

Para crear el primer administrador:

```powershell
corepack pnpm --filter @magina/api admin:crear
```

El comando solicita los datos interactivamente. Luego registra los datos fiscales en **Facturación electrónica → Datos del emisor**; para el ambiente DEMO usa datos de prueba. Las variables de NubeFact permanecen en el servidor.

## Funciones disponibles en esta primera versión

- Catálogo de productos, categorías y marcas.
- Entradas, consulta de movimientos y ajustes unitarios de stock.
- Clientes básicos y ventas con cálculo de precio/precio por cantidad en API, IGV, descuento limitado y descuento de existencias.
- Emisión DEMO o productiva de boletas de venta mediante NubeFact según el ambiente configurado.
- Configuración del emisor y consulta paginada de comprobantes dentro de Facturación electrónica.
- Permisos de API basados en asignaciones de rol y claves de idempotencia para evitar duplicar ventas ante repetición de solicitudes.

Esta lista no incluye caja, pagos mixtos/crédito, almacenes múltiples, anulaciones, devoluciones ni notas de crédito/débito. La emisión productiva requiere variables reales, datos del emisor coincidentes con NubeFact y un piloto autorizado; este checkout no acredita un CPE productivo.

## Construcción y validación

```powershell
corepack pnpm typecheck
corepack pnpm build
```

Si el frontend y la API se encuentran en orígenes distintos, define `VITE_API_URL` a una URL HTTPS **al compilar**. Si comparten origen y reverse proxy, déjala vacía. La compilación de producción rechaza localhost y HTTP.

Consulta [Configuración de producción](docs/CONFIGURACION_PRODUCCION.md), [Auditoría de variables y seguridad](docs/AUDITORIA_VARIABLES_SEGURIDAD.md), la [auditoría de preentrega](docs/AUDITORIA_PREENTREGA_INVENTARIO_FACTURACION.md) y el [modelo de personas y acceso](docs/MODELO_PERSONAS_Y_ACCESO.md).

