# Auditoría QA 2026 — avance de ejecución

**Fecha de corte:** 2026-11-15  
**Entorno observado:** interfaz local en `localhost:5173`; API local en `localhost:3000`; PostgreSQL local accesible por el servicio de desarrollo.  
**Alcance del informe:** avance, no informe final. No se modificó código fuente. En esta continuación se crearon dos registros financieros locales sintéticos autorizados con prefijo QA-2026; no se registraron pagos. El usuario confirmó que la base local `magina` está autorizada para pruebas QA con datos `QA-2026` y que la sesión quedó iniciada.

## 1. Estado de preparación y seguridad

- La interfaz se abrió con una sesión de administrador y mostró 33 permisos en la revisión anterior.
- La API respondió en salud con base de datos disponible.
- La base contiene registros comerciales históricos y referencias a documentos del proveedor fiscal. Aunque el usuario autorizó explícitamente su uso local para QA, no se ha demostrado aislamiento técnico de integraciones externas.
- La configuración local contiene credenciales de NubeFact. El código de emisión envía la solicitud a `NUBEFACT_RUTA`, usa `NUBEFACT_TOKEN` y marca el envío automático a SUNAT. No se llamó a ese servicio.
- SIRE no quedó acreditado como configurado.
- En esta continuación se hicieron dos escrituras de prueba locales; no se enviaron comprobantes. El usuario autorizó agregar registros locales `QA-2026`; los casos que requieran identificadores tributarios quedan limitados mientras no se disponga de datos de prueba permitidos. No hay autorización para transmitir comprobantes ficticios a un endpoint real.
- No se utilizaron ni se incluyen en este informe documentos personales ni nombres de clientes existentes.

## 2. Cobertura observada

La exploración visual es parcial. Se visitaron algunas pantallas y se leyeron sus estados, pero no se ha completado el inventario de módulos, pestañas, acciones e interacciones exigido por el plan maestro. No se calcula todavía un porcentaje global ni un porcentaje de aprobación: el denominador de casos descubiertos sigue incompleto y no se ejecutó ningún flujo comercial integral.

Estados de esta matriz: **APROBADO** solo para la interacción descrita y efectivamente observada; **FALLIDO** cuando la evidencia visual confirmó un defecto; **NO EJECUTADO** para pruebas pendientes. Una pantalla que carga no acredita la integridad de sus operaciones.

| Módulo | Submódulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Inicio | Resumen | Carga del panel y tarjetas/gráficos | APROBADO (carga de pantalla solamente) | GUI y árbol accesible; muestra 10 repuestos activos, 1 con stock, 9 sin stock y 0 unidades de mototaxi | — |
| Contactos | Clientes | Listar, paginación y estructura de tabla | FALLIDO visual | GUI de escritorio y árbol accesible; dos registros existentes, celdas visibles con textos pegados | QA-001 |
| Contactos | Clientes | Crear/editar/buscar/validar/historial y vincular una venta | NO EJECUTADO | Requiere entorno autorizado para escrituras | — |
| Contactos | Clientes | Intentar guardar formulario vacío | FALLIDO (validación observada) | GUI: al guardar sin número de documento, el navegador muestra "Completa este campo" y no guarda | QA-007 |
| Contactos | Proveedores | Abrir directorio vacío y comprobar disponibilidad declarada para compras | APROBADO (carga de pantalla solamente) | GUI y árbol accesible; 0 registros | — |
| Contactos | Proveedores | Crear/editar/duplicados/estado/vincular compra e historial | NO EJECUTADO | Requiere entorno autorizado para escrituras | — |
| Contactos | Conductores | Consultar directorio y abrir/cancelar formulario; crear y vincular a guia pendientes | APROBADO (consulta de pantalla) | GUI: cero registros; formulario cancelado sin datos | — |
| Catálogos | Categorías | Abrir listado y revisar 12 de 21 registros | FALLIDO visual | GUI; nombres de tarjetas aparecen truncados | QA-004 |
| Catálogos | Categorías | Pasar a página 2 y comprobar registros 13–21 de 21 | APROBADO (paginación) | Cambio de interfaz confirmado en GUI y árbol accesible | — |
| Catálogos | Marcas | Navegación e interacciones | NO EJECUTADO | — | — |
| Inventario | Repuestos / precios | Abrir listado, leer 10 productos y precios; no se cambió ningún valor | FALLIDO visual | GUI y árbol accesible; miniaturas rotas en las filas visibles y encabezado final “PRODUCTO” sobre controles de acción | QA-002, QA-003 |
| Inventario | Repuestos | Alta: validacion de precio bloquea dos intentos; edicion, desactivacion, busqueda y stock pendientes | FALLIDO (alta) | GUI; QA-008 y seccion 7; lista permanece en 10 | QA-008 |
| Inventario | Movimientos y ajustes | Consultar movimientos existentes, filtro y paginación | APROBADO (consulta de pantalla solamente) | GUI y árbol accesible; 11 movimientos, 10 en página inicial; se ven entradas, salidas y referencias | — |
| Inventario | Movimientos y ajustes | Conteo por tamaño de ventana | OBSERVACIÓN PENDIENTE | Se había observado 6 filas en ventana estrecha y 10 al maximizar; falta repetir con dimensiones medidas para determinar si el tamaño es adaptable o un defecto | — |
| Inventario | Movimientos y ajustes | Crear ajustes positivos/negativos, motivo, responsable y reversión | NO EJECUTADO | Requiere entorno autorizado para escrituras | — |
| Ingresos | Ventas de repuestos | Consulta previa de listado | APROBADO (consulta de pantalla solamente) | Dos ventas preexistentes; documentos aparecen rechazados por SUNAT en la sesión anterior; no se abrieron enlaces externos | — |
| Ingresos | Cotizaciones | Calcular línea de servicio QA transitoria y descartar formulario | APROBADO (cálculo y descarte; sin persistencia) | GUI: 1 servicio a S/ 1.00 produjo total S/ 1.00; tras descartar, lista sigue en 0 cotizaciones | — |
| Ingresos | Ventas de repuestos | Consultar tipos, totales, estado fiscal y acciones disponibles | OBSERVACIÓN (consulta solamente) | GUI: 2 documentos históricos (factura S/ 528.43 y boleta S/ 1.00), ambos “Rechazado por SUNAT”; acciones de NC/ND visibles; enlaces externos no abiertos | — |
| Ingresos | Cotizaciones | Abrir y cerrar formulario vacío sin guardar | APROBADO (cancelación sin persistencia observada) | Sesión anterior: formulario mostró alerta de cliente y pidió confirmar descarte al cerrar | QA-005, QA-006 (pendientes de reproducir) |
| Ingresos | Órdenes de servicio | Consultar listado existente | APROBADO (consulta de pantalla solamente) | Sesión anterior: una orden preexistente; no se editó | — |
| Configuración | Series | Consultar series y abrir/cancelar edición de serie activa | APROBADO (solo lectura / cancelación) | Sesión anterior: cuatro series; edición cancelada sin guardar | — |
| Finanzas | Cuentas y medios de pago | Consultar cuentas activas y resumen mensual sin modificar datos | APROBADO (consulta solamente) | GUI: 3 cuentas activas; entradas, salidas y neto del periodo en S/ 0.00; identificadores financieros omitidos | — |
| Reportes | Inventario | Consultar existencias y movimientos del 1 al 15 de noviembre de 2026 | APROBADO (consulta solamente) | GUI: 10 productos activos, 1 con stock, 9 sin stock, 0 con movimiento; Bujía NGK C7HSA con 10 unidades | — |
| Reportes | Ingresos | Consultar ventas y notas internas del 1 al 15 de noviembre de 2026 | APROBADO (consulta solamente) | GUI: 0 ventas, ingresos S/ 0.00, promedio S/ 0.00 y 0 notas internas | — |
| Egresos | Compra de mototaxis | Consultar listado, filtros y estado vacío | APROBADO (consulta solamente) | GUI: 0 compras; mensaje “Aún no hay compras registradas”; flujo de alta no guardado | — |
| Egresos | Gastos operativos | Crear egreso QA-2026 sin pago inmediato y verificar persistencia tras recarga | APROBADO (registro y persistencia GUI) | GUI: S/ 1.00 total, S/ 0.00 pagado, saldo S/ 1.00 tras recarga | — |
| Egresos | Activos y herramientas | Crear activo QA-2026 sin pago inmediato y verificar persistencia tras recarga | APROBADO (registro y persistencia GUI) | GUI: modelo QA-2026-MODELO-001, S/ 1.00 total, S/ 0.00 pagado y saldo S/ 1.00 tras recarga | — |
| Egresos, finanzas, mototaxis, reportes, guías, notas correctivas, permisos y demás pantallas | — | Navegación, controles, cálculos y flujos | NO EJECUTADO | El recorrido integral sigue pendiente | — |

## 3. Incidencias visuales registradas

### QA-001 — Celdas de clientes concatenan contenido

- **Módulo / pantalla:** Contactos → Clientes (`/clientes`).
- **Tipo / prioridad:** Visual y usabilidad / P3.
- **Estado:** Confirmado visualmente en escritorio; falta evaluar otras resoluciones y causas.
- **Precondiciones:** Directorio con los dos clientes preexistentes.
- **Pasos observados:** Abrir `/clientes` con sesión autenticada y revisar las columnas Cliente, Documentos y Contacto directo.
- **Esperado:** Nombre, tipo de cliente, documento, teléfono y disponibilidad de correo presentados como campos distinguibles.
- **Obtenido:** En la captura visible se pegan el nombre con “Cliente persona natural”, el teléfono con “Sin correo” y algunos datos de columnas contiguas; dificulta el escaneo de filas.
- **Evidencia:** Captura de pantalla emitida por Computer Use en la sesión del 2026-11-15 y árbol accesible de la tabla.
- **Recomendación:** Corregir el espaciado/estructura de subcampos y revisar anchos, envoltura y alineación en escritorio, tablet y móvil.

### QA-002 — Encabezado de acciones del catálogo de repuestos mal rotulado

- **Módulo / pantalla:** Inventario → Repuestos (`/inventario/productos`).
- **Tipo / prioridad:** Visual y accesibilidad semántica / P3.
- **Estado:** Confirmado en encabezado accesible y captura visual.
- **Esperado:** La columna de botones tenga un encabezado como “Acciones”.
- **Obtenido:** El encabezado final repite “PRODUCTO”, mientras que las celdas contienen editar y desactivar.
- **Evidencia:** Captura de Computer Use y árbol accesible de la tabla.
- **Recomendación:** Cambiar el encabezado de la columna y verificar su lectura con tecnologías de asistencia.

### QA-003 — Miniaturas de productos rotas

- **Módulo / pantalla:** Inventario → Repuestos (`/inventario/productos`).
- **Tipo / prioridad:** Visual / P3.
- **Estado:** Confirmado para las seis filas visibles en la captura; falta comprobar las cuatro filas restantes y la causa.
- **Esperado:** Imagen válida o marcador de ausencia con diseño intencional.
- **Obtenido:** Iconos de imagen rota visibles en las miniaturas de las filas mostradas.
- **Evidencia:** Captura de Computer Use del listado.
- **Recomendación:** Corregir las rutas/recursos o presentar un fallback de imagen sin error del navegador.

### QA-004 — Tarjetas de categorías truncan nombres

- **Módulo / pantalla:** Catálogos → Categorías (`/inventario/categorias`).
- **Tipo / prioridad:** Visual / P3.
- **Estado:** Confirmado visualmente en escritorio; falta verificar si existe tooltip u otra forma de leer el nombre completo sin abrir edición.
- **Esperado:** Nombre identificable en la tarjeta.
- **Obtenido:** Varias etiquetas quedan como “Accesorio…”, “Admisión …”, “Carrocería…”, entre otras.
- **Evidencia:** Captura de Computer Use; árbol accesible contiene el nombre completo.
- **Recomendación:** Mostrar el nombre completo mediante ajuste de espacio, envoltura o ayuda accesible al pasar/enfocar.

### QA-005 — Aviso de cliente al abrir cotización vacía

- **Módulo / pantalla:** Ingresos → Cotizaciones.
- **Tipo / prioridad:** UX / P3.
- **Estado:** Observado una vez; pendiente de reproducir y aclarar si es validación prematura.
- **Obtenido:** En la sesión anterior se mostró “Selecciona un cliente” al abrir el formulario antes de iniciar el ingreso.
- **Evidencia:** Observación de Computer Use en la sesión anterior; captura no exportada a archivo.

### QA-006 — Confirmación de descarte al cerrar cotización vacía

- **Módulo / pantalla:** Ingresos → Cotizaciones.
- **Tipo / prioridad:** UX / P3.
- **Estado:** Observado una vez; pendiente de confirmar en formulario realmente intacto.
- **Obtenido:** Al cerrar el formulario sin datos, la interfaz pidió confirmar descarte.
- **Evidencia:** Observación de Computer Use en la sesión anterior; se eligió descartar y se volvió a la lista sin persistencia visible.

### QA-007 — Alta de cliente exige identificador antes de guardar

- **Módulo / pantalla:** Contactos → Clientes (`/clientes`).
- **Tipo / prioridad:** Validación / pendiente de evaluar como defecto.
- **Estado:** Confirmado por interfaz; la intención de la regla comercial no está definida.
- **Pasos:** Abrir "Crear cliente" y pulsar "Guardar cliente" sin completar campos.
- **Obtenido:** El formulario bloquea el guardado y muestra "Completa este campo" en el número de documento, antes de validar los demás datos.
- **Límite de la prueba:** No se ingresó documento inventado. La interfaz exige un identificador, pero no se proporcionó un DNI/RUC ficticio autorizado por un servicio de pruebas.
- **Evidencia:** Árbol accesible de Computer Use del 2026-11-15; se canceló el formulario y el directorio siguió mostrando 2 registros.
- **Recomendación:** Confirmar si el identificador debe ser obligatorio para todos los tipos de cliente y ofrecer un flujo seguro de datos de QA, sin consultas externas ni uso de identificadores reales.

## 4. Límites y siguientes pasos

1. Completar el mapa de pantallas y acciones desde la GUI, incluyendo el resto de submódulos y variantes.
2. Reproducir y documentar los hallazgos visuales en resoluciones apropiadas; conservar capturas en archivo si la herramienta lo permite.
3. Resolver la provisión de identificadores sintéticos permitidos por el backend para poder guardar clientes/proveedores sin inventar DNI/RUC.
4. Confirmar una configuración de integración fiscal de pruebas o impedir técnicamente cualquier llamada de emisión antes de crear comprobantes ficticios. La configuración observada muestra ruta y token de NubeFact y el código activa envío automático a SUNAT.
5. Ejecutar los flujos integrales que sean seguros, verificando persistencia y conciliación; excluir cualquier paso que transmita o realice pagos externos.
6. Completar la matriz y el mapa de pantallas, calcular cobertura solo con denominador definido y emitir el veredicto final exigido por el prompt maestro.




### QA-008 - Alta de repuesto de prueba no completada

- **Modulo / pantalla:** Inventario / Repuestos (`/inventario/productos`).
- **Tipo / prioridad:** Funcional / P2 provisional.
- **Estado:** FALLIDO reproducible en dos intentos; el alta no persiste. Causa tecnica pendiente de aislar.
- **Precondiciones:** Sesion local autenticada; usuario confirmo que la base local `magina` esta autorizada para datos `QA-2026`.
- **Pasos observados:** Abrir el alta, ingresar el nombre `QA-2026 REPUESTO PRUEBA`, seleccionar categoria Filtros y marca NGK; en el paso de precios ingresar 2 como precio General para la unidad base y continuar; en el paso opcional siguiente intentar guardar.
- **Resultado esperado:** El producto se guarda y aparece en el listado tras la operacion.
- **Resultado obtenido:** La interfaz permanecio en el formulario y mostro el aviso "Agrega un precio general para la unidad base". Se cerro el formulario sin confirmacion de guardado. Luego se busco el nombre completo: la lista mostro "Mostrando 0 de 0" y "No hay precios para mostrar"; al borrar el filtro volvio a "Mostrando 1-10 de 10". No se observo producto nuevo ni cambio persistido.
- **Evidencia:** Interaccion visible en GUI local y comprobacion de busqueda en el listado despues de cerrar el formulario, 2026-11-15.
- **Limite:** El valor del precio se ingreso mediante teclado y se observo en pantalla como 2,00 antes de continuar. No se consulto la peticion de red ni el estado de base de datos para determinar por que el formulario retuvo el aviso. No se afirma que el producto se haya creado.
- **Recomendacion:** Repetir con captura de consola/red y confirmar que el estado del precio general base llega al formulario; revisar el guardado solo despues de que el paso de precios valide correctamente.


## 5. Continuacion del recorrido GUI - 2026-11-15

Se amplio la inspeccion visual, sin guardar cambios, en Inicio, Ordenes de servicio, Compras de repuestos y Marcas. El menu expone los grupos Ingresos (Ordenes de servicio, Cotizaciones, Venta de repuestos, Venta de mototaxis, Guias de remision), Egresos (Compra de repuestos, Compra de mototaxis, Gastos operativos, Activos y herramientas), Catalogos (Categorias, Marcas), Inventario, Contactos (Clientes, Proveedores, Conductores), Finanzas, Configuracion y Reportes. Este inventario del menu no implica que todas las rutas o acciones esten auditadas.

En Marcas se observaron filtros por estado y tipo, 26 marcas en tres paginas, con 12 tarjetas en la primera. En Ordenes de servicio se observo una orden existente con acciones de imprimir, editar, emitir documento y enlaces de contacto; no se accionaron las funciones de contacto ni emision. En Compras de repuestos se observaron dos registros. La ficha de la compra con importe S/ 100 mostro una linea de 10 unidades, subtotal S/ 100 y la nota de que el stock se actualizo. El resumen de la misma compra, sin embargo, reporto 0 productos. La segunda compra del listado mostraba 0 productos y total S/ 0; no se abrio. Los identificadores personales y tributarios visibles se omitieron del reporte.

### QA-009 - Conteo de articulos de compra difiere entre listado y detalle

- **Modulo / pantalla:** Egresos / Compra de repuestos (`/egresos/compras`).
- **Tipo / prioridad:** Integridad de interfaz y conciliacion / P2 provisional.
- **Estado:** Discrepancia confirmada visualmente en una compra existente; falta comprobar si solo afecta el resumen o tambien otros calculos/reportes.
- **Precondiciones:** Sesion local autenticada; consulta de registros preexistentes, sin editarlos.
- **Pasos observados:** En el listado, abrir el detalle de una compra de repuestos cuyo importe mostrado es S/ 100 y comparar el conteo de articulos entre ambas vistas.
- **Resultado esperado:** El numero de productos del listado coincide con la cantidad de lineas del detalle.
- **Resultado obtenido:** El listado mostraba 0 productos. El detalle mostraba 1 articulo, cantidad 10.000 unidades, precio unitario S/ 10.0000, subtotal y total registrado S/ 100.00, y el texto "El stock se actualizo al registrar esta compra". El pago visible era S/ 10.00 y el saldo pendiente S/ 90.00, suma que concilia con el total.
- **Evidencia:** GUI local, listado y modal de detalle consultados el 2026-11-15. Se omitieron datos de identidad del proveedor del presente informe.
- **Impacto potencial:** El resumen puede inducir a creer que la compra carece de articulos aunque el detalle y la nota de inventario muestran una linea recibida. Puede dificultar conciliacion y revision operativa.
- **Recomendacion:** Revisar el mapeo del conteo de lineas/articulos en el listado y comprobar que coincida con detalle, movimientos de stock y reportes antes de usar el conteo como dato operativo.

La auditoria sigue parcial. En la primera parte de esta continuacion no se realizaron compras, ventas, pagos, ajustes de existencias ni emisiones. En la extension posterior se crearon dos egresos de prueba por S/ 1.00 cada uno, sin registrar pagos ni emisiones.


## 6. Continuacion del recorrido financiero y reportes - 2026-11-15

Se consultaron las pantallas de cuentas y medios de pago, series de documentos y el reporte de ingresos. En cuentas se muestran tres cuentas activas y un selector de periodo por dia, mes o anio. Para noviembre de 2026, los totales visibles de entradas, salidas y neto eran S/ 0.00. La pantalla aclara que el grafico considera pagos con cuenta asignada y que no representa el saldo bancario disponible cuando no se ha ingresado un saldo inicial. No se modificaron cuentas ni fechas. Por seguridad, se omitieron del informe los numeros de cuenta/CCI y datos de titular que aparecian en la interfaz.

En series de documentos se vieron cuatro registros: dos series de boleta (una activa y otra inactiva), una serie de cotizacion y una serie de orden de servicio, con controles de configuracion. No se editaron. La vista consultada no mostro otras series de documentos fiscales; es necesario contrastarlo con los documentos que la empresa necesita emitir antes de concluir si la configuracion es incompleta.

El reporte de ingresos cargado para el periodo 1 al 15 de noviembre de 2026 presento 0 ventas, S/ 0.00 de ingresos, promedio S/ 0.00 y ninguna nota interna; las secciones por medio de pago, articulo y resumen diario indicaron que no habia ventas en el periodo. Es consistente con el panel de inicio consultado, que tambien dijo que no habia ventas del mes, pero solo describe este intervalo y no concilia periodos historicos.

No se ejecutaron pagos, cobros ni cambios de series. La interfaz ofrece estas vistas, pero la conciliacion de montos con operaciones preexistentes sigue sin probarse.

## 7. Reproduccion del alta de repuesto y contraste de inventario - 2026-11-15

Se repitio el alta mediante la GUI con `QA-2026 REPUESTO REPETICION`, categoria Filtros y marca NGK. En el paso 2 se observo unidad base Unidad (NIU), stock minimo 0, afectacion Gravado con IGV y presentacion base habilitada para compra y venta. La ayuda indica que la afectacion de IGV se envia con el comprobante electronico emitido por NubeFact. No se invoco ninguna emision. El precio General de la unidad base se introdujo como S/ 2.00 mediante teclado y se observo en el control antes de continuar.

En el paso 3, al pulsar Crear repuesto, la aplicacion volvio a mostrar `Agrega un precio general para la unidad base`. Al regresar al paso 2, el propio formulario mostraba General / Unidad base / S/ 2.00 / cantidad minima 1; pese a ese valor visible, al intentar crear de nuevo se reprodujo la misma validacion. Se cerro el formulario sin persistir el producto. El listado regresado mostro 10 productos. No se inspecciono consola, trafico de red ni base para aislar la causa.

La reproduccion confirma el bloqueo funcional del alta en este recorrido, pero no localiza la causa. El precio aparece en pantalla y la validacion de envio lo trata como ausente; se recomienda revisar sincronizacion del estado del formulario y su serializacion antes del guardado. La afectacion de IGV se documenta como superficie de integracion sensible, no como llamada efectuada.

Tambien se reviso el reporte de inventario para el periodo 1 al 15 de noviembre de 2026. La vista mostro 10 productos, 1 con stock y 9 sin stock; reporto cero entradas y salidas en el intervalo, y cero productos con movimiento. La bujia NGK C7HSA mostraba stock actual 10. Esto es compatible con la compra preexistente de 10 unidades observada el 28 de octubre y la indicacion de stock actualizado, pero no demuestra por si solo la conciliacion del libro completo de movimientos ni el origen de todo el saldo.

La tabla de la matriz debe interpretarse junto con estos hallazgos: el alta del producto no se aprobo y el reporte de inventario se consulto solamente. No se guardo un nuevo producto ni se afectaron existencias durante esta continuacion.

## 8. Proveedores: formulario consultado, alta no ejecutada - 2026-11-15

Se abrio el directorio `/personas/proveedores`, que mostro 0 registros y el aviso de que los proveedores creados estaran disponibles al registrar compras. Se inspecciono el formulario de alta sin completar campos: el tipo de documento predeterminado es RUC, incluye numero de documento y boton Buscar, nombres y apellidos, y nombre comercial opcional. No se activo Buscar ni se intento guardar. Sin un identificador de prueba autorizado, no se ingreso RUC inventado ni datos de terceros. Se cancelo el formulario y la pantalla continuo mostrando cero proveedores.

La consulta de pantalla se considera realizada; el alta, validaciones, duplicidad, busqueda, edicion y vinculacion a compras siguen NO EJECUTADAS. No se genero informacion de prueba de proveedor.

## 9. Conductores: directorio y formulario inspeccionados - 2026-11-15

Se consulto `/personas/conductores`: la lista mostro cero registros y explica que los conductores registrados pueden seleccionarse al crear guias de remision. Se abrio el formulario y se observaron tipo de documento DNI predeterminado, numero de documento, nombres, apellidos, numero de licencia y telefono opcional. No se introdujeron datos ni se guardo; se cancelo y se comprobo que el directorio permanecio vacio.

La consulta y apertura/cancelacion quedan verificadas. La creacion, validaciones de identificador/licencia, busqueda y asociacion a una guia permanecen NO EJECUTADAS. La falta de datos de prueba autorizados impide verificar el flujo completo sin usar identificadores personales reales o inventar documentos.
## 10. Egreso operativo QA-2026 creado y verificado - 2026-11-15

Se creo desde la interfaz local un gasto operativo sintetico con fecha 15 de noviembre de 2026, categoria Otro, concepto `QA-2026 GASTO OPERATIVO PRUEBA`, beneficiario `QA-2026 BENEFICIARIO`, documento Sin documento e importe S/ 1.00. Se dejo desmarcada la opcion de registrar pago. El listado mostro el registro con pagos S/ 0.00, sin pagos registrados, total S/ 1.00 y saldo S/ 1.00. Tras recargar la pagina, el mismo registro continuo visible. No se registro ningun abono.

## 11. Activo/herramienta QA-2026 creado y verificado - 2026-11-15

Se creo desde la interfaz local un activo sintetico con fecha 15 de noviembre de 2026, categoria Herramientas de taller, concepto `QA-2026 HERRAMIENTA DE PRUEBA`, beneficiario `QA-2026 BENEFICIARIO`, documento Sin documento, modelo `QA-2026-MODELO-001` e importe S/ 1.00. Se dejo desmarcada la opcion de registrar pago. El listado mostro el registro con pagos S/ 0.00, sin pagos registrados, total S/ 1.00 y saldo S/ 1.00; tras recargar la pagina, el registro siguio visible. No se registro ningun abono.

Ambos registros fueron autorizados por el usuario como datos locales QA-2026. Son evidencia de creacion y persistencia visibles en la GUI, no de conciliacion contable completa ni de aislamiento tecnico de integraciones externas.
## 12. Revalidacion GUI de inventario y cuentas - 2026-11-15

Se volvio a consultar `/reportes/inventario`: para el periodo 1 al 15 de noviembre de 2026 muestra 10 productos activos, 1 con stock, 9 sin stock y 0 productos con movimiento. La tabla lista 10 productos; la Bujia NGK C7HSA figura con stock de 10 unidades, mientras entradas y salidas del periodo aparecen en cero. Esta lectura vuelve a confirmar lo ya registrado en la seccion 7 y no verifica por si sola el libro historico completo.

En `/finanzas/cuentas` se observaron tres cuentas activas (una bancaria y dos de caja/efectivo). El resumen del mes y el grafico por cuenta muestran entradas, salidas y neto de S/ 0.00. La propia pantalla advierte que el grafico resume pagos registrados con cuenta asignada y no representa saldo bancario disponible si no se ingreso saldo inicial. No se abrieron acciones de edicion/desactivacion ni se modificaron cuentas. Numeros de cuenta, CCI y datos de titular fueron omitidos.

En una primera tentativa, Computer Use interrumpio la navegacion al subreporte de ingresos porque no pudo validar con suficiente confianza la URL actual en Windows. El subreporte se abrio despues desde el menu visible y se documento en la seccion 13; el bloqueo inicial no fue un defecto confirmado de la aplicacion.

Las capturas fueron observadas durante la sesion, pero no se guardaron como archivos de evidencia en el repositorio. La auditoria sigue en curso y no se calcula cobertura global mientras el inventario de casos y acciones descubiertos siga incompleto.
## 13. Revalidacion del reporte de ingresos y compras de mototaxis - 2026-11-15

El subreporte `/reportes/ingresos`, abierto desde el menu, mostro para el 1 al 15 de noviembre de 2026: 0 ventas registradas, ingresos totales S/ 0.00, promedio por venta S/ 0.00, y valor referencial de notas internas S/ 0.00 con 0 notas. Las secciones de ingresos por medio de pago, articulos de mayor ingreso y resumen diario indicaron que no habia ventas en el periodo. Esto concuerda con la consulta previa anotada en la seccion 6; no constituye conciliacion historica.

El listado `/mototaxis/compras` mostro 0 compras y el estado vacio “Aun no hay compras registradas”. No se registro una compra ni se afecto caja, deuda o inventario. En otra ventana Chrome se observo un formulario de compra de mototaxi sin enviar y ya rellenado con identificadores sinteticos; no se cambio, guardo ni cancelo ese formulario porque su origen no pudo atribuirse a esta ejecucion. Esta ventana ajena al recorrido controlado impide tratar esos valores como evidencia de una prueba nuestra. La compra QA sigue pendiente y requiere un proveedor de prueba permitido; no se invento identificacion tributaria.

La busqueda `QA-2026` en Gastos operativos devolvio 1 de 1 registro, el gasto sintetico creado en esta auditoria con saldo S/ 1.00. No se abrio ni ejecuto “Registrar abono”.
## 14. Cotizacion transitoria y revision del historial de ventas - 2026-11-15

Se abrio el formulario de nueva cotizacion desde `/ingresos/cotizaciones`. El listado inicial no contenia cotizaciones y la vista previa de serie mostro `CO01-000001`; la fecha de emision era 15 de noviembre de 2026 y la validez predeterminada 30 de noviembre. La busqueda de cliente solicita DNI de forma predeterminada y ofrece busqueda y alta de cliente. El catalogo pide al menos dos caracteres para buscar repuestos; la cotizacion admite agregar servicios.

En una cotizacion no guardada se agrego solo una linea de servicio sintetica `QA-2026 SERVICIO PRUEBA TRANSITORIO`, cantidad 1 y precio S/ 1.00. La interfaz calculo importe y total cotizado en S/ 1.00. Se cerro mediante la confirmacion Descartar cotizacion; el listado siguio mostrando 0 cotizaciones. Esto valida un calculo aritmetico simple y el descarte de formulario, pero no prueba impuestos, guardado, serie persistida, asociacion con cliente, impresion ni trazabilidad. No se uso DNI ni se transmitieron datos.

En `/ingresos/ventas/repuestos` se observaron 2 documentos historicos del 26 de octubre de 2026: una factura por S/ 528.43 y una boleta por S/ 1.00. Ambos aparecen con pago Efectivo / Contado y estado `Rechazado por SUNAT`. La interfaz ofrece para ambos abrir/imprimir, descargar XML, compartir por WhatsApp y emitir notas de credito o debito. No se abrieron enlaces NubeFact/WhatsApp ni se accionaron las notas. Se omitieron del informe identidad, documento y telefono del cliente visible en una fila.

La presencia de botones de nota correctiva en documentos rechazados se registra como superficie de riesgo que requiere validar reglas fiscales y de negocio, no como defecto confirmado. El reporte de ingresos del periodo de noviembre no incluye estas ventas de octubre; por ello no puede usarse para conciliarlas. No se realizo una venta nueva porque la configuracion fiscal observada apunta a NubeFact/SUNAT y no se ha confirmado un entorno de homologacion aislado.
## 15. Venta de mototaxis: historial vacio - 2026-11-15

Se abrio desde el submenu visible `/ingresos/ventas/mototaxis`. El listado indico `Mostrando 0-0 de 0` y `No hay ventas para mostrar`. No se creo una venta ni se invoco un comprobante o una integracion externa. La busqueda y paginacion se ven disponibles, pero no se verificaron con registros; el flujo de venta y sus efectos sobre inventario, pagos y documentos sigue NO EJECUTADO por el riesgo de transaccion comercial/fiscal con integracion NubeFact no aislada.

## 16. Guias de remision: lista vacia y serie no configurada - 2026-11-15

La lista `/ingresos/guias` indico 0 guias y el texto `Las guias emitidas apareceran aqui`. Se abrio el formulario `Nueva guia de remision` y se inspeccionaron los campos sin completarlos: destinatario (tipo y numero de documento, nombre/razon social y direccion), motivo y tipo de transporte, peso y bultos, fechas, datos del transportista, placa, ubigeos y direcciones de partida/llegada, bienes trasladados (descripcion, codigo, unidad y cantidad) y observaciones opcionales.

El encabezado del propio formulario mostro `FALTA CONFIGURAR SERIE`; el boton `Emitir guia en NubeFact` aparecio deshabilitado. Se cancelo el formulario sin ingresar datos ni transmitir informacion. Es un bloqueo observable de emision/configuracion de esta funcionalidad; requiere definir la serie de guia aplicable y luego verificarla en un entorno de pruebas de NubeFact antes de emitir. No se intento emitir ni se considera probado el flujo de validacion o persistencia.

## 17. Segunda lectura de compras de repuestos y cobertura añadida - 2026-11-15

La matriz se complementa con estas comprobaciones visuales de esta continuación:

| Módulo | Submódulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Egresos | Compra de repuestos | Abrir ambos detalles del listado | FALLIDO (conteo del listado no coincide con detalle) | GUI: los dos renglones del listado dicen 0 productos; el primero tiene una línea de 10 unidades por S/100 y el segundo cinco líneas en el detalle | QA-009 |
| Egresos / inventario | Registro técnico de prueba | Leer origen, importes, líneas y advertencia del detalle interno | OBSERVACIÓN; efecto en kardex no verificado | GUI: 5 artículos de una unidad con costo unitario y subtotal S/0.00; total S/0.00, sin proveedor, comprobante ni pago; nota `PRUEBA NubeFact DEMO` indica ingreso técnico y que no representa compra real, pero también muestra que el stock se actualizó | — |
| Ingresos | Ventas de mototaxis | Consultar historial | APROBADO (consulta solamente) | GUI: 0 ventas, lista vacía | — |
| Ingresos | Guías de remisión | Consultar lista y abrir/cancelar formulario sin emitir | BLOQUEADO (serie faltante para emisión) | GUI: 0 guías; formulario muestra `FALTA CONFIGURAR SERIE` y emisión NubeFact deshabilitada | — |

Al abrir ahora el segundo detalle, el registro interno `ENT-D4CDF3BE07` mostró cinco líneas: una unidad de cada producto, costo unitario S/0.0000 y subtotal S/0.00; total registrado S/0.00. El proveedor figura como No especificado, no hay identificación, documento, número ni pago. La nota identifica expresamente el registro como prueba NubeFact DEMO, ingreso técnico por SKU, y aclara que no es una compra real. A la vez, el pie dice que el stock se actualizó al registrar esta compra. Por tanto, no se clasifica como compra comercial; queda pendiente consultar el libro de movimientos y el estado actual de esos cinco SKU para determinar el efecto cuantitativo y su trazabilidad. Los SKU y nombres personales que no aportan al hallazgo se omiten.

La segunda ficha confirma que el resumen del listado también subcuenta líneas en este registro (0 frente a 5); el hallazgo QA-009 se reproduce en dos de dos compras consultadas, aunque aún no se conoce si es solo un defecto del contador visual. No se modificaron compras, existencias ni pagos.

## 18. Conciliacion visual del historial de movimientos - 2026-11-15

Desde el submenu visible se abrio `/inventario/movimientos-ajustes`. La vista ofrecio selector `Todos los movimientos` y opciones visibles Entradas, Salidas y Ajustes, un buscador por repuesto/codigo/motivo, paginacion y accion para crear ajuste. La lista total indico 11 movimientos, en paginas de 10 y 1. Se leyeron ambas paginas sin crear ni editar ajustes.

Los registros visibles muestran una entrada de +10 unidades de Bujia NGK C7HSA el 28 de octubre de 2026 vinculada a `ENT-B01208AF4C`. El ingreso tecnico `ENT-D4CDF3BE07` de 26 de octubre muestra cinco entradas de +1 unidad, una por cada articulo de su detalle a costo cero. Cinco movimientos de salida de -1 unidad cada uno, a las 11:17 p. m., muestran la misma referencia de ingreso `ING-20261026-5A7A8F4C`. Para esos cinco SKU el par visible +1/-1 da neto cero; para la bujia la entrada visible suma 10. Esta conciliacion entre movimientos observados es consistente con la pantalla de inventario consultada (un repuesto con stock y nueve sin stock), pero no sustituye el conteo fisico ni verifica periodos anteriores a los movimientos listados.

No se selecciono un filtro ni se busco SKU porque Computer Use termino la interaccion al informar que no podia validar con suficiente confianza la URL actual en Windows. Ese bloqueo de herramienta no se atribuye al ERP. Por tanto, las opciones de filtro/search quedaron vistas pero no probadas; los ajustes de stock siguen sin ejecutarse.

## 19. Filtros y busqueda del historial de stock - 2026-11-15

Se verificaron las opciones visibles del selector del historial: Todos los movimientos, Entradas, Salidas y Ajustes. `Entradas` devolvio 6 de 11 movimientos; `Salidas` devolvio 5 de 11, todos con variacion -1 y la misma referencia `ING-20261026-5A7A8F4C`; `Ajustes` devolvio 0 y el estado vacio `Aun no hay movimientos`. Con el filtro general y la busqueda `Cadena`, la tabla devolvio 4 resultados (entrada y salida de Lubricante de cadena Motul C3 y de Cadena reforzada Riffel). Se limpio la busqueda y se restauro el filtro general; la lista quedo de nuevo en 1-10 de 11.

| Modulo | Submodulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Inventario | Movimientos y ajustes | Filtrar Entradas, Salidas y Ajustes | APROBADO (filtro de lectura) | GUI: 6 entradas, 5 salidas, 0 ajustes | — |
| Inventario | Movimientos y ajustes | Buscar por nombre parcial y limpiar la busqueda | APROBADO (busqueda de lectura) | GUI: `Cadena` devuelve 4 filas; al limpiar vuelve a 11 movimientos | — |

La busqueda coincide por nombre parcial para esos dos productos y sus entradas/salidas. No se comprobaron busqueda por SKU, caracteres acentuados/insensibles, filtros combinados, exportacion ni navegacion por teclado. No se creo un ajuste.

## 20. Catalogo e informacion de mototaxis - 2026-11-15

Se reviso `/inventario/mototaxis` desde el menu lateral. El catalogo de modelos activos muestra un unico modelo: Bajaj RE 4S LPG (MOT-E2D6A92608), categoria L5, motor 199 cc, GLP, capacidad `Sin dato`, estado Activo. Se consulto su ficha: unidades en inventario 0, disponibles 0, reservadas 0, vendidas 0; no hay registros de compra ni venta, y el precio de lista actual aparece `Sin registros`. En la consulta de precios, el precio de venta para la lista figura en 0 y el boton Guardar precio de venta deshabilitado; no se cambio ningun dato. Esto impide comprobar precio, compras, trazabilidad de unidades/VIN y venta desde esta entidad usando los datos actuales.

| Modulo | Submodulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Inventario | Catalogo de modelos de mototaxi | Listar modelo activo y abrir ficha de detalle | APROBADO (consulta de lectura); solo 1 modelo | GUI: Bajaj RE 4S LPG, MOT-E2D6A92608, 0 unidades | — |
| Inventario | Lista de precios de mototaxi | Consultar precio e historial | BLOQUEADO por ausencia de registros; precio lista 0, guardar deshabilitado | GUI: sin compras ni historial; cero unidades | — |
| Inventario | Ajustes de inventario de mototaxis | Abrir el submenu | NO EJECUTADO: el menu no quedo desplegado en la sesion | GUI: el intento de expandir el grupo no mostro los submenus | — |

Esta inspeccion solo confirma el estado visible del catalogo y la ficha. No se crearon modelos, unidades, compras ni ajustes. La busqueda del catalogo y sus filtros no se probaron.

## 21. Directorio de clientes: lectura y resguardo de datos - 2026-11-15

Se abrio `/clientes` y el directorio mostro 2 registros existentes en una sola pagina, con buscador por nombre, contacto, correo o documento y accion para crear cliente. Los registros contienen datos de identificacion personal y contactos; se omiten de este informe y no se editaron. No se creo un nuevo cliente, porque el directorio visible no estaba vacio y no se confirmo que esos datos fueran fixtures descartables. La busqueda, ficha, edicion, validaciones y persistencia quedaron NO EJECUTADAS. La prueba integral cliente-venta permanece pendiente por el limite fiscal descrito en el apartado 14.

| Modulo | Submodulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Contactos | Clientes | Abrir y listar registros existentes | APROBADO (consulta de solo lectura) | GUI: 2 registros en una pagina; se omiten datos personales | — |
| Contactos | Clientes | Buscar, crear, editar y probar validaciones | NO EJECUTADO para evitar afectar datos existentes sin identificar fixture QA | GUI: acciones disponibles en directorio; ninguna accion ejecutada | — |

## 22. Proveedores: alta bloqueada por identificador requerido - 2026-11-15

El directorio `/personas/proveedores` estaba vacio. El formulario muestra documento RUC, numero de documento obligatorio con boton Buscar inicialmente deshabilitado, nombres, apellidos y nombre comercial opcional. Al intentar Guardar proveedor con el formulario vacio, la interfaz bloqueo el envio con validacion `Completa este campo`. No se ingreso ni invento un RUC/DNI: el flujo solicita identificacion valida y no se proporciono un identificador de pruebas permitido por el servicio. Se cancelo el formulario y el listado continuo vacio. El alta y la asociacion con compras quedan BLOQUEADAS por esta restriccion; no se guardo ningun registro.

| Modulo | Submodulo | Funcionalidad / caso observado | Resultado | Evidencia | Incidencia |
|---|---|---|---|---|---|
| Contactos | Proveedores | Consultar directorio | APROBADO (solo lectura) | GUI: 0 proveedores registrados | — |
| Contactos | Proveedores | Intentar guardar sin campos requeridos | FALLIDO controlado: el formulario evita alta vacia | GUI: validacion nativa `Completa este campo` en numero de documento | — |
| Contactos / egresos | Proveedores -> compra | Crear proveedor y asociarlo a compra | BLOQUEADO: requiere identificador de prueba valido, no disponible | GUI: RUC requerido; no se uso identificador inventado | — |

La visibilidad visual del formulario tambien mostro que al contraer el menu lateral durante la navegacion el contenido pasa a una barra solo de iconos; no se midio adaptabilidad en resoluciones menores.
