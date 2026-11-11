# Emisión de comprobantes con NubeFact

El código utiliza el mismo flujo en desarrollo y en el servidor. `NUBEFACT_RUTA` y `NUBEFACT_TOKEN` indican a qué cuenta se envían las solicitudes; las series se administran en la base de datos. El frontend no recibe el token.

## Configuración

Configura `NUBEFACT_RUTA` y `NUBEFACT_TOKEN` en el servidor. Esos valores apuntan a la cuenta NubeFact que procesará las solicitudes. Administra las series y correlativos en **Configuración > Series**. Desarrollo y servidor ejecutan el mismo flujo de código.

## Afectación tributaria

Para el perfil operativo de NRUS configurado en este sistema, el detalle enviado a NubeFact se arma como operación inafecta (`tipo_de_igv: 9`), con IGV cero y total inafecto igual al valor de la venta. SUNAT indica que en los comprobantes emitidos por sujetos del NRUS no se debe discriminar el impuesto. La clasificación y representación fiscal deben coincidir con el régimen real del emisor y validarse antes de producción.

## Prueba histórica en la cuenta de prueba

El 2026-11-02 se envió a la cuenta DEMO una boleta técnica por S/ 10.00, con una línea de servicio, afectación 9, IGV cero, total inafecto S/ 10.00 y envío automático a SUNAT desactivado. NubeFact respondió HTTP 200, asignó serie BBB1 y correlativo 5, devolvió enlace PDF y no devolvió errores. La respuesta incluyó `aceptada_por_sunat: false`. Como el payload tenía desactivado el envío automático, no se interpreta como aceptación de SUNAT. Esto demuestra que el proveedor procesó la trama de prueba, no que SUNAT haya aceptado el comprobante ni que el criterio tributario esté certificado.

La cuenta de prueba descrita arriba fue procesada con el comportamiento anterior del sistema. Actualmente las respuestas se manejan con estados genéricos, sin ramificación por cuenta o ambiente.

Antes de usar una cuenta real, verifica el régimen activo del RUC y ejecuta el piloto acordado; no uses estos resultados históricos de prueba como comprobantes reales.
