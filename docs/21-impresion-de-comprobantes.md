# Impresión de comprobantes

Cómo se imprime todo documento que emite el sistema. No hay pantalla de configuración de impresoras.

## Dos tamaños

Cada menú de impresión ofrece exactamente **A4** y **Ticket** (80 mm). La salida se decide sola:

| Tamaño | Salida |
| --- | --- |
| A4 | PDF archivado de NubeFact (comprobantes, notas y guías que lo tengan). Si no hay PDF, representación A4 propia con el diálogo del sistema. Safari y móviles abren el PDF en una pestaña. |
| Ticket | 1) Impresora USB/serie o Bluetooth ya autorizada en el navegador: ESC/POS directo, sin diálogo. 2) La primera vez, selector del navegador (serie en escritorio; Bluetooth donde no haya puertos serie). 3) Sin API compatible o si se cierra el selector: diálogo de impresión del sistema. |

NubeFact siempre emite el PDF en A4 (`formato_de_pdf: "A4"`). El ticket es de diseño propio: NubeFact solo conserva un PDF por comprobante, en el formato pedido al emitir, y no permite obtener el otro después (verificado en su entorno de pruebas).

Detalles:

- Cerrar el selector se recuerda como «usar el diálogo del sistema» y no se vuelve a preguntar. Para volver a elegir impresora, borra los datos del sitio en el navegador.
- Si el envío directo falla (impresora apagada o fuera de alcance), se abre el diálogo del sistema y se muestra el motivo.
- Web Bluetooth y Web Serial requieren Chrome o Edge y HTTPS. En navegadores que no conservan el permiso Bluetooth al recargar, el selector reaparece una vez por sesión.
- En escritorio, la primera elección usa puertos serie (incluye Bluetooth clásico emparejado); una impresora solo BLE se usa allí a través del sistema.
- El puerto serie usa 9600 baudios.

El último tamaño usado se recuerda en cada equipo (`localStorage`); por defecto es Ticket.

## Imprimir al emitir

Al registrar una venta o guardar una cotización se imprime automáticamente en el tamaño elegido (en ventas, el de la vista previa; en cotizaciones, el último usado). La impresora se resuelve en el clic, antes de guardar, porque el navegador exige un gesto del usuario. Un fallo de impresión nunca deshace ni bloquea el registro: se avisa y se puede reimprimir desde el listado.

## Documentos imprimibles

| Documento | Dónde | Origen de los datos |
| --- | --- | --- |
| Boleta, factura, nota de venta | Ventas y pantalla de emisión | `GET /impresion/ingresos/:id` |
| Nota de crédito y de débito | Panel de notas de la venta | `GET /impresion/ingresos/:id/notas/:notaId` |
| Orden de servicio | Listado de órdenes | Datos cargados en pantalla |
| Cotización | Listado de cotizaciones y al guardar | Datos cargados en pantalla |
| Guía de remisión | Listado de guías | PDF de NubeFact en A4; representación propia con los bienes del comprobante de origen en Ticket o sin PDF |
| Compra de repuestos | Detalle de la compra | Datos cargados en pantalla |
| Compra de mototaxis | Listado de compras | Resumen del listado |

## Diseño del ticket

El ticket sigue el diseño del ticket de NubeFact. Es el mismo en la impresión directa (ESC/POS) y en el diálogo del sistema (HTML), y el A4 propio comparte el cuerpo:

1. Logo, nombre comercial, razón social, RUC, dirección y teléfono, centrados.
2. Título y serie-número.
3. Bloque `ADQUIRIENTE` (en documentos no electrónicos, `CLIENTE`; en compras, el rótulo de cada documento) con nombre, documento y dirección.
4. `FECHA EMISIÓN`, `FECHA DE VENC`, `MONEDA` e `IGV`. Los dos últimos solo si el documento tiene importes; el IGV solo si se detalla.
5. Tabla `CANT.` · `DESCRIPCIÓN` · `P/U` · `TOTAL`. Si ningún ítem trae precio (guías), se omite la columna P/U.
6. Totales (`OP. GRAVADA`, `IGV`, `TOTAL`…), `IMPORTE EN LETRAS` y `FORMA DE PAGO`.
7. QR, leyenda, `Consulta en <url>` (solo comprobantes electrónicos y si la empresa tiene `urlConsultaComprobantes`) y `Resumen:` con el hash.

No incluye el texto «Autorizado mediante Resolución de Intendencia…» de NubeFact: ese número no está en el sistema.

### Logo

Sale de `apps/web/public/logo.webp`. Como la térmica es de 1 bit, se reduce a 288 puntos de ancho (mitad del papel) y se tramea con Floyd–Steinberg (`logo-ticket.ts`). La impresión directa lo envía como imagen raster (`GS v 0`) y el HTML incrusta el mismo bitmap como PNG, para que ambas salidas se vean igual. Se carga una sola vez; si falla la carga o la impresora no soporta imágenes, el ticket se imprime igual sin logo. Para cambiarlo, reemplaza `logo.webp` conservando la proporción.

## Representación de comprobantes

Los endpoints de impresión requieren `INGRESOS.LEER`. Para comprobantes electrónicos se arma desde la trama exacta enviada a NubeFact (`datos_nubefact.solicitud`) y su respuesta vigente: `codigo_hash` y `cadena_para_codigo_qr`. Si falta la cadena QR, se construye con el formato SUNAT (`RUC|tipo|serie|número|IGV|total|fecha|tipo doc|número doc|hash|`).

Un comprobante rechazado o con error de emisión devuelve 409 y no se imprime. Si está anulado, pendiente de confirmación o en trámite de baja, se imprime con una advertencia visible.

## Datos del emisor

Se toman de la fila única de `configuracion_empresa` (`GET/PUT /empresa`; escribir requiere `FINANZAS.ADMINISTRAR`). Si la tabla está vacía se usan las variables `EMPRESA_RUC`, `EMPRESA_RAZON_SOCIAL`, `EMPRESA_DIRECCION`, `EMPRESA_TELEFONO` y `EMPRESA_MENSAJE_PIE` (ver [variables de entorno](10-variables-de-entorno.md)). Sin ninguna de las dos fuentes se imprime igualmente, con una advertencia.

## Código

- Backend: `apps/api/src/modulos/impresion/` y `apps/api/src/modulos/empresa/`.
- Frontend: `apps/web/src/impresion/` (selección de salida, ESC/POS, plantillas, logo y documentos internos) y `apps/web/src/components/impresion/menu-impresion.tsx`. Cada listado arma su documento en un archivo `documento-*.ts` junto a la pantalla.
