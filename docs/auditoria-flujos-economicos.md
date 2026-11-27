# Auditoría de flujos económicos de ventas

**Propósito:** registrar cómo afectan dinero e inventario las ventas (boleta, factura, nota de venta), sus anulaciones y sus notas. **Verificación:** pruebas de integración sobre PostgreSQL desechable con NubeFact simulado (`apps/api/src/modulos/ingresos/efectos-economicos.integration.spec.ts`, `ingresos-ventas.integration.spec.ts`, `ingresos-gestion.integration.spec.ts`). No se probó contra NubeFact ni SUNAT reales.

## Reglas vigentes

- Una venta anulada conserva sus filas de cobro como historial, pero dejan de contar en cuentas, flujo, composición de caja, movimientos, cobranza y reportes. Su saldo pendiente es cero. Los reportes lo reflejan retroactivamente en la fecha original (no se genera un egreso con la fecha de anulación).
- Saldo pendiente = total − parte de las notas de crédito aplicada a la deuda − cobros.
- Una nota de crédito primero reduce la deuda; solo lo cobrado de más sale de la cuenta elegida (`comprobantes_relacionados.importe_reembolsado`, migraciones `0196` y `0197`). Las notas anteriores (valor nulo) se tratan como devueltas por completo.
- Una nota de débito se registra como ingreso cobrado en la cuenta elegida; no cambia el saldo pendiente ni el inventario.
- El API solo emite notas de ajuste de valor (crédito motivo 5, débito motivo 2): ninguna devuelve inventario.
- `codigo_motivo = 7` marca internamente una nota fallida o dada de baja para liberar el índice único (una migración que altere el índice exigiría `DROP`, bloqueado por CI; el 13 está reservado a importes en cero). El motivo enviado a SUNAT se conserva en `datos_nubefact.solicitud`. Si se habilita la devolución por ítem (motivo 7) habrá que redefinir esta marca.

## Matriz de escenarios

| Escenario | Esperado | Antes | Ahora |
|---|---|---|---|
| Baja de boleta/factura pendiente | nada se revierte | nada, pero admitía cobros y notas | nada; cobros y notas devuelven 409 |
| Baja aceptada, repuestos | stock y dinero regresan | stock no regresaba; cobros seguían en cuentas | movimiento `ENTRADA/ANULACION_INGRESO`, cobros excluidos, saldo 0 |
| Baja aceptada, mototaxis | stock del modelo y garantías | stock regresaba (cantidad original); garantía quedaba | cantidad vigente (incluye ediciones) y garantía liberada |
| Baja rechazada o plazo vencido | nada cambia | correcto | correcto, probado |
| Venta con reclamo de garantía | no se anula | se anulaba | 409 antes de llamar a NubeFact |
| Venta con notas vigentes o sin resultado | primero resolver notas | las sin resultado no bloqueaban | bloquea y consulta NubeFact |
| Anular nota de venta | reversa inmediata, una sola vez | no existía | `POST /ingresos/:id/anulacion-interna` (permiso `FACTURACION.ANULAR`) y botón en el listado |
| NC sobre venta con deuda | reduce deuda, reembolsa solo el exceso | salía todo de caja y el saldo no cambiaba | corregido |
| NC total de venta pagada | reembolso total, sin stock | correcto en caja | correcto, probado |
| Dos NC simultáneas | no superan el total | posible carrera y error 500 | bloqueo de la venta; 409/400 |
| ND y su baja | suma y retira ingreso, sin stock | correcto en caja | correcto, probado |
| Baja de NC/ND | deja de afectar y permite otra | no se podía emitir otra (500) | motivo liberado |
| Reintento de nota fallida | reintento o mensaje claro | 500 por índice único | rechazo definitivo: se reemite; sin respuesta: consulta antes; vigente: 409 |
| Archivos de baja de una nota (consulta) | entidad `COMPROBANTE_RELACIONADO` | `INGRESO` | corregido |
| Emitir orden/cotización con repuestos | genera la venta | fallaba | corregido; la venta directa no puede imponer precios |
| Flujo de ingresos, comparativo, resumen, artículos, rentabilidad, cobranza | netos de notas vigentes | solo `reporteIngresos` restaba NC | todos netos de NC y ND |

Fechas de los ajustes: flujo, comparativo y resumen gerencial usan la fecha de la nota; cobranza, rentabilidad y artículos (análisis de las ventas del rango) usan la fecha de la venta.

## Riesgos residuales (requieren decisión del negocio)

1. No existe nota de crédito por devolución (total o por ítem) ni por anulación de la operación; por tanto no hay devolución de mercadería salvo con la baja o la anulación interna.
2. Una boleta o factura rechazada por SUNAT y no reintentada mantiene el stock descontado, no se puede anular y sigue contando en el dashboard (no en `reporteIngresos`). Registrar un comprobante nuevo descuenta stock otra vez.
3. Al anular una venta nacida de una orden o cotización, esta sigue `FACTURADA`/`CONVERTIDA`; el adelanto se considera devuelto junto con la venta.
4. La reversa es retroactiva: un cierre de caja ya conciliado de una fecha anterior cambia al anular.
5. Ventas por medio de pago y mapa de horarios muestran importes brutos (sin restar notas).
6. Una nota de débito se asume cobrada al emitirse aunque la venta sea a crédito.
7. Una nota con respuesta del proveedor ambigua (ni PDF ni error) queda en `ERROR_NUBEFACT` y puede reintentarse; si SUNAT la acepta después, el seguimiento avisa en el registro para revisión manual.
8. Los precios cotizados de una orden se respetan al emitir aunque la lista haya cambiado (la cotización sí lo valida antes).
