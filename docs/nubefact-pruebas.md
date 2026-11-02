# Emisión de boletas con NubeFact

El sistema permite registrar boletas mediante NubeFact. Mantiene separadas las ventas internas (nota de venta) de las boletas que envía al proveedor. La emisión usa las credenciales, serie y ambiente configurados en el servidor; el frontend no recibe el token.

## Configuración

Configura `NUBEFACT_AMBIENTE`, `NUBEFACT_RUTA`, `NUBEFACT_TOKEN` y `NUBEFACT_SERIE_BOLETA` en el servidor. En **Facturación electrónica > Datos del emisor**, registra los datos que correspondan a la cuenta de NubeFact. Usa valores y credenciales distintos para DEMO y PRODUCCIÓN.

## Afectación tributaria

Para el perfil operativo de NRUS configurado en este sistema, el detalle enviado a NubeFact se arma como operación inafecta (`tipo_de_igv: 9`), con IGV cero y total inafecto igual al valor de la venta. SUNAT indica que en los comprobantes emitidos por sujetos del NRUS no se debe discriminar el impuesto. La clasificación y representación fiscal deben coincidir con el régimen real del emisor y validarse antes de producción.

## Validación en DEMO

El 2026-11-02 se envió a la cuenta DEMO una boleta técnica por S/ 10.00, con una línea de servicio, afectación 9, IGV cero, total inafecto S/ 10.00 y envío automático a SUNAT desactivado. NubeFact respondió HTTP 200, asignó serie BBB1 y correlativo 5, devolvió enlace PDF y no devolvió errores. La respuesta incluyó `aceptada_por_sunat: false`. Como el payload tenía desactivado el envío automático, no se interpreta como aceptación de SUNAT. Esto demuestra que el proveedor procesó la trama de prueba, no que SUNAT haya aceptado el comprobante ni que el criterio tributario esté certificado.

El sistema marca una emisión DEMO como `EMITIDO_DEMO` cuando NubeFact entrega el PDF y no devuelve error, aunque `aceptada_por_sunat` sea falso. En PRODUCCIÓN se exige `aceptada_por_sunat: true`.

Antes de operar en PRODUCCIÓN, verifica el régimen activo del RUC y ejecuta el piloto acordado con la cuenta productiva; no uses estos resultados DEMO como comprobantes reales.
