# Flujo de documentos recibidos y egresos

## Objetivo

Centralizar en Egresos los comprobantes que SUNAT informa como emitidos a la empresa y los documentos que se registren manualmente. Un documento importado es un pendiente por revisar: todavía no confirma el pago ni la recepción de bienes.

## Flujo operativo

1. **Importar documentos** desde SIRE por periodo. Guardar referencia del periodo, ticket y origen de cada documento para permitir reintentos sin duplicar registros.
2. **Revisar el comprobante** con proveedor, RUC, tipo y número, fecha, moneda e importes disponibles. Conservar inconsistencias y datos que requieran validación.
3. **Clasificar** el documento como compra de repuestos, compra de mototaxi, gasto operativo o activo/herramienta.
4. **Completar la recepción y el detalle operativo**:
   - Repuestos: asociar líneas del documento con productos/presentaciones y registrar las cantidades físicamente recibidas.
   - Mototaxi: registrar la unidad y confirmar motor, chasis y datos de recepción.
   - Activo/herramienta: completar identificación y recepción.
   - Gasto operativo: confirmar concepto y categoría.
5. **Registrar pagos por separado**. Importar o revisar el comprobante no genera un pago. Cada pago debe tener fecha, importe, medio y cuenta cuando corresponda.
6. **Cerrar el documento en ERP** enlazándolo con la compra, egreso o activo creado. La entrada de inventario solo ocurre en la confirmación de recepción.

## Estados propuestos

- `PENDIENTE_REVISION`: importado o ingresado, aún sin validar.
- `OBSERVADO`: faltan datos o hay importes/identidad por revisar.
- `PENDIENTE_RECEPCION`: clasificado como bien, falta confirmar su recepción.
- `REGISTRADO`: enlazado a la operación del ERP.
- `DESCARTADO`: el usuario decidió no procesarlo; se conserva el motivo y la referencia para auditoría operativa.

## Reglas de integridad

- La identidad del documento debe considerar empresa receptora, proveedor/emisor, tipo de comprobante, serie y correlativo. El número por sí solo no identifica una factura.
- Los reintentos de importación son idempotentes; se actualizan los datos de origen sin crear una segunda operación.
- Un documento `REGISTRADO` apunta a una sola operación de destino. La transición y la creación/enlace de la operación deben ejecutarse en una transacción.
- Los importes tributarios recuperados son informativos para el flujo comercial. No se calculan libros, declaraciones ni aceptaciones o reemplazos en SUNAT.
- El RCE no acredita por sí mismo la recepción física ni el detalle comercial de artículos. Esos datos se confirman en el proceso de egresos del ERP.

## Interfaz basada en el ERP actual

- Mantener el encabezado compartido `ListadoMaestro`, las tarjetas/tablas existentes, controles de búsqueda y paginación, botones primarios y estilos de formularios actuales.
- No agregar una pantalla o submodulo independiente de documentos recibidos. La busqueda y la importacion de SIRE se ofrecen dentro del formulario de la operacion que se esta registrando.
- Reutilizar el selector en compra de repuestos, compra de mototaxi, gastos operativos y activos/herramientas. Precargar proveedor, documento, fecha e importe; completar ahi el detalle operativo y confirmar la recepcion cuando corresponda.
- Mantener la interfaz adaptable a móvil, tema oscuro, foco visible y accesibilidad del teclado según los componentes compartidos actuales.

## Implementación actual y límites

La interfaz expone el selector compartido en los formularios de compra de repuestos, compra de mototaxi, gasto operativo y activo/herramienta. Desde cada formulario se buscan documentos ya importados o se solicita al SIRE la propuesta del periodo. Al elegir uno, se clasifica para ese destino y se precargan sus datos; no se crea un registro independiente que obligue a salir del proceso.

El backend mantiene el registro, la deduplicacion, el origen SIRE y el enlace transaccional del comprobante con la operacion guardada. La importacion no crea pagos ni inventario por si sola. Un comprobante asignado a otro destino no se puede reclasificar desde otro formulario.

El CSV RCE contiene datos del comprobante, pero no reemplaza el detalle de productos ni la constatación física. Las cantidades, presentaciones y datos de cada unidad deben completarse durante la recepción en el formulario operativo correspondiente. La vista enlaza el documento al egreso/compra al guardar ese formulario.

Para usar SIRE en el entorno local deben completarse las variables `SUNAT_SIRE_*` del `.env` con credenciales vigentes. La integración externa no está validada con la cuenta de la empresa todavía. La importación inicial se limita a la propuesta RCE disponible por periodo; no sincroniza automáticamente facturas futuras ni procesa pagos. La bandeja conserva el comprobante para revisión y no lo marca pagado ni incrementa stock antes de que el usuario complete el registro y la recepción.
