# 07. Módulos y reglas de negocio

**Propósito:** separar procesos presentes de conclusiones comerciales no demostradas. **Verificación:** estática; comportamiento de extremo a extremo requiere validación funcional.

| Área | Evidencia en código | Estado y límite |
|---|---|---|
| Catálogo e inventario | productos, entradas, movimientos, categorías y marcas | IMPLEMENTADO SIN PRUEBA COMPLETA; verificar cantidades/costos y recepción |
| Compras y egresos | controladores y servicios de egresos y entradas de stock | IMPLEMENTACIÓN PARCIAL como proceso integral; recepción y pago son acciones separadas a verificar |
| Ventas e ingresos | ingreso, detalle, pagos, búsqueda de productos/clientes | IMPLEMENTADO SIN PRUEBA COMPLETA; validar reglas de precio/crédito |
| Créditos y pagos | pagos asociados a ingresos y tablas relacionadas | REQUIERE VALIDACIÓN FUNCIONAL de saldo, mora y contabilización |
| Facturación | NubeFact, series, notas, anulaciones y consultas | BLOQUEADO POR SERVICIO EXTERNO sin credenciales/respuesta real; no equivale a emisión probada |
| Finanzas | cuentas, movimientos y resúmenes | IMPLEMENTADO SIN PRUEBA COMPLETA; conciliación contable pendiente |
| Mototaxis | modelos, compras, unidades, movimientos, garantías | IMPLEMENTADO SIN PRUEBA COMPLETA; validar ciclo físico y comercial |
| Cotizaciones y servicio | controladores de cotización/órdenes dentro de ingresos | REQUIERE VALIDACIÓN FUNCIONAL de conversión y cierre |
| Reportes | módulo/controlador reportes | IMPLEMENTADO SIN PRUEBA COMPLETA; validar cifras con fuente operativa |

Para cada flujo, actor y permisos se determinan en controlador/guards; entradas por método; validaciones y escrituras en servicio/Drizzle; estados y errores deben derivarse de esas funciones y pruebas. Donde no hay evidencia contrastada se conserva `REQUIERE VALIDACIÓN FUNCIONAL`. La existencia de una pantalla o tabla no demuestra que el flujo esté operativamente cerrado.

**Fuentes:** `apps/api/src/modulos/**`, esquema Drizzle, suites unitarias/integración/API/E2E. **Preguntas pendientes:** criterios comerciales para costos, descuentos, crédito, anulaciones, recepción física, garantías y tratamiento de saldos.

## Edición rápida de notas de venta

`PATCH /ingresos/:id/nota-venta` (y su `GET` de precarga) exigen `INGRESOS.CREAR`. Código: `nota-venta-edicion.service.ts` y sus reglas puras en `nota-venta-edicion.util.ts`. En la pantalla de ventas, la acción **Editar** aparece solo en notas de venta registradas.

| Regla | Comportamiento |
|---|---|
| Documentos | Solo `NOTA_VENTA` en estado `REGISTRADO`. Boletas y facturas se rechazan (400): se corrigen con notas de crédito/débito o anulación. |
| Bloqueos (409) | Nota anulada; nota nacida de una orden de servicio; nota con guía de remisión no rechazada; versión desactualizada (`versionDocumento`). |
| Campos | Fecha (no futura), cliente, medio de pago, observación y líneas (agregar, quitar, artículo, cantidad, precio, descuento, afectación). No cambian el código ni el tipo de documento. |
| Importes | Sin IGV desglosado; descuento limitado por `DESCUENTO_MAXIMO_PORCENTAJE`. El precio de repuestos y servicios puede corregirse a mano; una mototaxi solo conserva el precio vendido o adopta el vigente del catálogo. |
| Inventario | En la misma transacción se aplica solo la diferencia por producto y por modelo. Sin stock suficiente no se cambia nada. La salida de cada línea en `movimientos_stock` refleja la cantidad vigente; los modelos registran un movimiento por ajuste. |
| Mototaxis | Con garantía, reclamo o unidad asignada no se cambia modelo, cantidad ni fecha, ni se quita la línea. |
| Dinero | Si los pagos registrados superan el nuevo total se rechaza (409) salvo `confirmarDevolucionExceso`, que reduce o elimina los pagos más recientes. Si el total sube, la diferencia queda como saldo. Cambiar el medio de pago de la nota no reescribe pagos ya registrados. La venta sigue siendo al contado (sin crédito ni cuotas). |
| Auditoría | `ingresos_ediciones` guarda usuario, momento, resumen, estado anterior y posterior, y efectos. Una edición sin cambios no escribe nada. |
| Documento | El HTML archivado se regenera; si falla, la edición se conserva y se registra el error. La impresión se genera en vivo. |
| Anulación posterior | Devuelve al inventario las cantidades vigentes (`efectos-venta.ts`). |
