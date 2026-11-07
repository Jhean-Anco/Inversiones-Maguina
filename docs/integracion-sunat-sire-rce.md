# Integración de consulta SIRE Compras

La API de la aplicación consulta la propuesta del Registro de Compras Electrónico (RCE) de SUNAT y permite descargar el archivo asociado. Este flujo es de consulta: no acepta propuestas, no registra preliminares y no reemplaza libros en SUNAT.

## Configuración del servidor

Completa estas variables en el entorno privado de la API. No las incluyas en el frontend, en Git ni en mensajes:

- `SUNAT_SIRE_RUC`
- `SUNAT_SIRE_USUARIO_SOL`
- `SUNAT_SIRE_CLAVE_SOL`
- `SUNAT_SIRE_CLIENT_ID`
- `SUNAT_SIRE_CLIENT_SECRET`

Las credenciales de API se generan en SUNAT Operaciones en Línea. El servidor combina RUC y usuario SOL para autenticarse, obtiene y mantiene en memoria el token temporal, y nunca devuelve los secretos al cliente.

## Rutas

Todas las rutas requieren sesión y permiso `INVENTARIO.LEER`.

- `GET /inventario/sunat-sire/configuracion`: informa si las cinco variables están configuradas; no confirma que SUNAT acepte las credenciales.
- `GET /inventario/sunat-sire/periodos`: consulta los periodos RCE habilitados para el RUC.
- `GET /inventario/sunat-sire/propuesta?periodo=AAAAMM`: solicita la propuesta completa del periodo en CSV.
- `GET /inventario/sunat-sire/propuesta?periodo=AAAAMM&fechaInicio=AAAA-MM-DD&fechaFin=AAAA-MM-DD`: solicita una propuesta limitada a fechas de emisión del mismo periodo.
- `GET /inventario/sunat-sire/ticket?periodo=AAAAMM&numero=TICKET`: consulta el estado y los archivos habilitados para descargar.
- `GET /inventario/sunat-sire/archivo?periodo=AAAAMM&numero=TICKET&nombre=ARCHIVO.zip&tipo=CODIGO`: descarga un ZIP únicamente cuando SUNAT ya habilitó ese archivo para el ticket.

La solicitud de propuesta genera un ticket en SUNAT. Se debe consultar el ticket y descargar el archivo cuando su estado sea terminal. La salida se entrega como ZIP tal como la prepara SUNAT; aún no convierte automáticamente sus filas en compras ni movimientos de inventario.

## Integración de interfaz pendiente

Para registrar una compra de repuestos, el flujo de interfaz todavía debe leer el CSV del ZIP y prellenar proveedor, fecha, tipo y número de comprobante. El usuario debe agregar y confirmar los productos y cantidades recibidos antes de guardar, porque la propuesta RCE no sustituye la validación física de la mercadería ni el detalle por artículo del comprobante.
