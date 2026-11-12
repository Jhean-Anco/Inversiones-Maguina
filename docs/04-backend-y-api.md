# 04. Backend y API

**Propósito:** describir la API desde los controladores. **Verificación:** rutas y permisos se obtienen del código; contratos de respuesta no se generalizan. No se encontró configuración Swagger/OpenAPI en los manifiestos y fuentes revisados.

Servidor NestJS 11 con adaptador Fastify 5. Módulos raíz: autenticación, personas, almacenamiento, inventario, ingresos, reportes, egresos, mototaxis y finanzas. Cada módulo conecta controladores y proveedores; revisar `*.module.ts` para dependencias concretas. La API usa prefijos declarados en cada `@Controller`, sin prefijo global observado en `main.ts`.

El inventario de endpoints se genera directamente desde decoradores `@Controller`, `@Get`, `@Post`, `@Patch`, `@Put` y `@Delete` en `apps/api/src`. Para cada operación se requiere consultar su método de controlador y servicio; algunos cuerpos se tipan como `unknown`, y no hay DTO declarativo que permita publicar un contrato preciso. Los errores HTTP provienen de excepciones NestJS y validaciones explícitas.

| Controlador | Prefijo |
|---|---|
| Salud | `/health` |
| Autenticación | `/autenticacion` |
| Ingresos | `/ingresos` |
| Egresos y compras de mototaxi | `/egresos`, `/inventario/mototaxis` |
| Finanzas | `/finanzas/cuentas` |
| Inventario | `/inventario/productos`, `/categorias`, `/marcas`, `/imagenes`, `/movimientos-stock`, `/entradas-stock`, `/sunat-sire` |
| Personas | `/personas/conductores`, `/personas/consulta-identidad`, `/personas/proveedores` |
| Reportes | `/reportes` |
| Archivos | `/archivos` |
| Mototaxis | `/mototaxis` |

La lista completa de operaciones se conserva en el código fuente, que es el contrato autorizado. En particular, `unknown` en algunos controladores impide afirmar esquema de entrada; no se inventan respuestas ni efectos sin leer servicio y pruebas correspondientes.

El catálogo de método, ruta, nombre del manejador, decoradores de guardia/permisos y parámetros de transporte se regenera en [catálogo de endpoints](catalogo-de-endpoints.md) con `pnpm docs:api`. Las respuestas, errores por operación y escrituras deben contrastarse en servicio y pruebas.

**Fuentes:** `apps/api/src/modulo-aplicacion.ts`, `apps/api/src/modulos/**/*.controller.ts`, servicios y pruebas `*.spec.ts`.
