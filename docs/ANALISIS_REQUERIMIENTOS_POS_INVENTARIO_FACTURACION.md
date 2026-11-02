# Alcance vigente: inventario, ventas y comprobantes

El sistema cubre el catálogo y el control básico de inventario, clientes y ventas. Las ventas pueden incluir productos o servicios y actualizar las existencias correspondientes.

## Comprobantes electrónicos

La emisión disponible se limita a boletas de venta a través de NubeFact. La configuración del emisor, los datos de cliente y los importes se utilizan para generar la solicitud del comprobante y mostrar la respuesta de NubeFact.

Los campos de IGV del comprobante se conservan como datos necesarios para la emisión. El producto no ofrece gestión de regímenes, declaraciones, libros electrónicos, retenciones, percepciones, detracciones ni SPOT. Tampoco se ofrecen notas de crédito/débito, guías de remisión o anulaciones electrónicas.

## Persistencia histórica

Las migraciones antiguas de base de datos se conservan para mantener el historial y proteger registros existentes. Sus definiciones históricas no representan funciones disponibles en la aplicación. La migración `0142_basic_purchase_payment_defaults` mantiene la compatibilidad de los pagos operativos de compras sin que la API gestione categorías tributarias.

## Límites de verificación

La compilación de tipos valida la consistencia estática del código. La emisión real requiere credenciales y configuración válidas de NubeFact y una verificación en el ambiente correspondiente; esta revisión no ejecutó una emisión externa.
