# Arquitectura actual y límites

Este documento describe el alcance implementado. La emisión electrónica se realiza por medio de NubeFact; la aplicación conserva los datos básicos de la venta y la respuesta del proveedor.

## Tecnologías

| Área | Tecnología |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| POS web | React + Vite + TypeScript |
| API | NestJS + Fastify + TypeScript |
| Datos | PostgreSQL + Drizzle ORM |
| Comprobantes | Integración con NubeFact REST |

## Dominios implementados

- Autenticación y permisos mediante sesión protegida.
- Catálogo, productos, presentaciones, entradas, saldos y movimientos de inventario.
- Clientes, ventas de productos o servicios, pagos operativos y actualización de existencias.
- Emisión de boletas de venta mediante NubeFact, con configuración básica del emisor y consulta de comprobantes.

## Venta y emisión

La API valida los datos de la venta, conserva una clave de idempotencia, registra el ingreso y actualiza el inventario en una transacción. Después solicita a NubeFact la emisión de una boleta. Las credenciales, la ruta y la serie de boleta se configuran en el servidor.

La integración es síncrona. Si se pierde la respuesta remota, la venta queda con el estado disponible y no se reenvía automáticamente; se debe revisar su estado en NubeFact antes de volver a intentar. La integración no incluye otros libros, registros, declaraciones, regímenes, retenciones, percepciones, detracciones ni conciliación fiscal.

Los campos de IGV que forman parte del detalle de venta se mantienen para construir la solicitud básica del comprobante a NubeFact. No existe un módulo separado para administrar obligaciones o regímenes tributarios.

## Datos y seguridad

PostgreSQL almacena importes como `numeric` y cantidades con escalas explícitas. Los tokens de NubeFact se mantienen en el servidor y no se exponen al frontend.

Las migraciones anteriores permanecen como historial de la base y preservan datos existentes. No deben regenerarse migraciones destructivas para retirar tablas o columnas históricas sin una copia de seguridad y un plan explícito de conservación.

## Fuera del alcance actual

- Registro de compras para libros electrónicos o SIRE.
- Retenciones, percepciones, detracciones y SPOT.
- Configuración de régimen tributario, condición de contribuyente o declaraciones.
- Notas de crédito/débito, guías, anulaciones electrónicas o baja de comprobantes.
- Reintento remoto automatizado, colas y almacenamiento local de archivos electrónicos.

Consulta [Configuración de producción](CONFIGURACION_PRODUCCION.md) y [Auditoría de variables y seguridad](AUDITORIA_VARIABLES_SEGURIDAD.md) para el despliegue y la protección de credenciales.

