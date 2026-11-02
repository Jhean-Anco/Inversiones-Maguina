# Emisión de boletas con NubeFact

El sistema emite boletas de venta mediante NubeFact. Este negocio está acogido al Nuevo RUS y la API solo permite registrar boletas. La integración usa las credenciales, la serie de boleta y el ambiente configurados en el servidor; la interfaz permite registrar los datos básicos del emisor y consultar comprobantes emitidos.

## Configuración

En el gestor de secretos configura `NUBEFACT_AMBIENTE`, `NUBEFACT_RUTA`, `NUBEFACT_TOKEN` y `NUBEFACT_SERIE_BOLETA`. Mantén las credenciales fuera del frontend y del repositorio. En **Facturación electrónica > Datos del emisor**, registra RUC, razón social, domicilio y datos comerciales del emisor.

## Flujo disponible

1. Registra o selecciona un cliente.
2. Crea una venta; el sistema emite una boleta de venta.
3. El sistema calcula los importes del comprobante, registra la venta y envía la emisión a NubeFact.
4. Consulta el estado y la respuesta de NubeFact en la lista de comprobantes.

La emisión DEMO es solo una prueba del intercambio con el proveedor. No se ha ejecutado una validación en esta revisión; antes de usar producción, confirma las credenciales, series y datos del emisor con la cuenta de NubeFact.
