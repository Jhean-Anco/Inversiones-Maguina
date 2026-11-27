# Auditoría de flujos de egresos e inventario

**Propósito:** registrar qué se verificó en compras y egresos (dinero e inventario), qué se corrigió y qué sigue pendiente. **Verificación:** pruebas de integración sobre PostgreSQL desechable, principalmente `apps/api/src/modulos/egresos/flujos-egresos-inventario.integration.spec.ts`.

## Regla de negocio

Toda compra o egreso tiene un efecto en dinero (pagos, cuentas, saldo por pagar) y, en compras, un efecto en inventario. Ambos se registran y revierten en una sola transacción.

## Matriz de escenarios

| Escenario | Esperado | Antes | Después |
|---|---|---|---|
| Compra de repuestos al contado | Pago, saldo y movimiento ENTRADA | Correcto; el pago se fechaba el día del registro | El pago usa la fecha de la compra |
| Compra de repuestos a crédito o parcial | Saldo por pagar | No existe: la suma de pagos debe igualar el total | Sin cambios (ver riesgos) |
| Fecha futura / total del documento menor que lo recibido | Rechazo claro | Fecha aceptada; el total menor fallaba con error 500 | 400 |
| Reenvío de la misma compra de repuestos | Una sola compra | Se duplicaba si no era factura o boleta con RUC | `claveIdempotencia` opcional; la web la envía |
| Anulación de compra de repuestos | Revertir stock, caja y costos | No existía | `POST inventario/entradas-stock/:id/anular` |
| Anulación con stock ya vendido o ajustado | 409 sin cambios | No aplica | Verificado, incluida la concurrencia con un retiro |
| Doble anulación | Una sola reversión | No aplica | 409 en la segunda |
| Compras y ajustes concurrentes | Saldo exacto, nunca negativo | Correcto | Verificado |
| Ajuste por conteo o sentido | Saldo y kardex | Correcto; el costo promedio incluía todas las compras | Excluye compras anuladas |
| Compra de mototaxis con garantías | Stock por modelo, pago, garantía | Correcto | Verificado |
| Misma factura o boleta de mototaxis dos veces | Rechazo | Se aceptaba sin clave de idempotencia | 409 |
| Pago de saldo de mototaxis simultáneo o repetido | Un solo pago | La clave se consultaba antes del bloqueo (riesgo de error 500) | Bloqueo primero |
| Anulación de compra de mototaxis | Revertir stock, pagos, garantías y unidades | No existía | `POST mototaxis/compras/:id/anular` |
| Anulación con unidades salidas o garantías con reclamos | 409 sin cambios | No aplica | Verificado |
| Egreso con pagos parciales y total | Saldo correcto | Correcto | Verificado |
| Sobrepago y pago duplicado concurrentes | Rechazo / un solo pago | Correcto | Verificado |
| Alta simultánea con el mismo motor | 409 | Error 500 | 409 |
| Anulación de egreso o de un pago | Devolver saldo, conservar historial | No existía | `POST inventario/mototaxis/:id/anular` y `.../pagos/:pagoId/anular` |
| Cuentas, flujo y composición de caja | Pagos anulados no cuentan | No aplica | Filtrados en todas las consultas de Finanzas |
| Costos, promedios, ficha de proveedor y reportes | Ignorar compras anuladas | No aplica | Filtrados (excepto lo indicado en riesgos) |
| Listado de compras de repuestos | Total paginado según el filtro | El total ignoraba el filtro de pago | Corregido; página fuera de rango devuelve la última |

## Anulación

- Migración aditiva `0195_anulacion_compras_egresos.sql`: estado, fecha, usuario y motivo en compras, egresos y pagos; permisos `INVENTARIO.ANULAR`, `MOTOTAXIS.ANULAR` y `EGRESOS.ANULAR` para ADMINISTRADOR y GERENTE. La única sentencia `DROP CONSTRAINT` reemplaza la restricción de tipos de movimiento para admitir `ANULACION_COMPRA`.
- Nada se borra. El inventario se revierte con movimientos nuevos (`ANULACION_ENTRADA`, `ANULACION_COMPRA`).
- El motivo es obligatorio (5 a 500 caracteres). La corrección se hace anulando y registrando de nuevo.
- Al anular un egreso de mototaxi, motor y chasis se renombran con prefijo `ANUL-<código>` para liberar el índice único.
- La web ofrece «Anular compra» en repuestos y mototaxis. Los egresos solo tienen API: no existe pantalla web que los liste.

## Riesgos residuales

1. La anulación borra el pago del periodo en que se hizo: los flujos pasados cambian. No se registra un reingreso de dinero con fecha de anulación.
2. El costo promedio usado al vender (`ingresos.service.ts` y `nota-venta-edicion.service.ts`) debe excluir compras anuladas con `lineaRepuestoVigente`.
3. El stock es fungible: se permite anular si el saldo alcanza, aunque las unidades concretas provengan de otra compra. El costo guardado en ventas anteriores no se recalcula.
4. Repuestos no admite crédito ni pagos posteriores. Si el total del documento supera lo recibido, la compra queda «con saldo pendiente» sin forma de pagarlo.
5. Los pagos solo salen de cuentas en PEN. Una compra o egreso en USD/EUR deja la cuenta sin saldo conciliable y los resúmenes por periodo suman el importe sin conversión.
6. No se controla saldo insuficiente en cuentas.
7. Los ajustes de stock por sentido no tienen clave de idempotencia (el conteo y `saldoEsperado` mitigan reenvíos).
8. En el reporte de inventario una compra anulada aparece como entrada y salida; el neto es correcto.
9. El documento impreso de una compra anulada no lleva marca de anulación.
10. Cambiar el estado de la cuenta justo durante un pago no está bloqueado (la cuenta se valida antes de la transacción).
