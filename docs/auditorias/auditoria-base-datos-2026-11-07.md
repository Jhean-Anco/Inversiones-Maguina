# Auditoría de base de datos y uso desde la aplicación

**Fecha:** 7 de noviembre de 2026  
**Repositorio:** `D:\PROYECTOS WEB\inversiones-magina`  
**Alcance:** revisión estática del esquema, migraciones y consultas del checkout; contraste de solo lectura contra la base configurada localmente. No se modificaron tablas, datos ni migraciones.

## Resumen ejecutivo

La inquietud sobre tablas sobrantes está respaldada por evidencia: PostgreSQL tiene **70 tablas públicas**, mientras `packages/database/src/esquema/index.ts` declara **57**. Diecisiete tablas de la base no aparecen en el esquema actual; la búsqueda en `apps/api/src` y `apps/web/src` no encontró referencias de aplicación a ellas. Quince están vacías en esta base. Dos tienen registros y requieren una decisión de retención antes de retirarlas.

Hay además un desfase de migraciones que afecta directamente a lo que se está trabajando: el journal local contiene 159 entradas y la base tiene aplicadas 155, hasta `0155_brand_usage_scope`. Las migraciones `0156_guias_remision`, `0157_mototaxi_stocktake` y `0158_conductores` están pendientes. Las cuatro tablas que agregan no existen todavía en la base conectada, aunque ya figuran en el esquema local y el código.

No recomiendo borrar tablas directamente. Primero corresponde revisar dependencias fuera del código web/API, conservar un respaldo y retirar candidatas mediante una migración explícita.

## Evidencia y hallazgos

### 1. Tablas heredadas candidatas a retiro — prioridad alta

Estas 17 tablas existen en PostgreSQL, no están declaradas en el esquema Drizzle actual ni tienen referencias localizadas en los directorios de API y web:

- **Sin filas en la base consultada (15):** `declaraciones_igv_621`, `declaraciones_percepcion_697`, `declaraciones_retencion_626`, `dias_no_laborables_fiscales`, `evidencias_declaracion_igv_621`, `evidencias_declaracion_percepcion_697`, `evidencias_declaracion_retencion_626`, `evidencias_perfil_fiscal_emisor`, `historial_perfil_fiscal_emisor`, `igv_servicios_no_domiciliados`, `importaciones_propuesta_rce`, `ingresos_cobros_grupos`, `ingresos_detracciones`, `ingresos_spot_rce_anotaciones` y `pagos_igv_servicios_no_domiciliados`.
- **Con filas:** `ingresos_correlativos` tiene 1; `reglas_tributarias` tiene 3.

La aplicación actual se centra en ventas, inventario, compras de mototaxis y emisión/archivo de documentos. Las tablas de declaraciones, pagos de obligaciones y reglas tributarias aparentan pertenecer a funcionalidades contables/fiscales que no forman parte del alcance de emisión de documentos. La tabla `ingresos_correlativos` parece legado: el servicio actual usa `correlativos_documentos_internos` para notas de venta y el antiguo correlativo no está modelado en el esquema. `reglas_tributarias` requiere confirmar si se conserva por trazabilidad antes de retirarla.

**No clasificar como sobrantes** las tablas necesarias para emitir y archivar: `ingresos`, `ingresos_detalle`, `comprobantes_relacionados`, `nubefact_correlativos`, `correlativos_documentos_internos`, `configuracion_emisor_facturacion`, `guias_remision` cuando se aplique su migración, y las tablas de personas, productos, existencias y pagos usadas por operaciones actuales.

### 2. Desfase entre esquema, migraciones y base — prioridad crítica

- Esquema local: 57 tablas.
- Base consultada: 70 tablas públicas.
- Tablas presentes solo en el esquema local: `guias_remision`, `ajustes_inventario_mototaxis`, `ajustes_inventario_mototaxis_detalle`, `conductores`.
- Migraciones presentes en el journal pero no aplicadas en la base: `0156_guias_remision`, `0157_mototaxi_stocktake`, `0158_conductores`.

La base está en `0155_brand_usage_scope`. Por ello, las consultas del código local que usen las cuatro tablas nuevas fallarán contra esta base hasta aplicar esas migraciones. No se aplicaron durante la auditoría.

### 3. Duplicidad/inconsistencia de información — prioridad alta

- **Identidad de personas:** `personas` conserva `tipo_documento_id` y `numero_documento`; `personas_documentos` almacena documentos por persona. La migración `0035_link_existing_dni_customers.sql` agrega documentos secundarios al nuevo catálogo sin eliminar los campos antiguos. El servicio usa ambos caminos. Hay riesgo de que el documento principal y la relación de documentos diverjan si se actualizan por separado.
- **Contactos de clientes:** correo, teléfono y nombre de contacto viven en `clientes`; también existe `personas_contactos` para contactos por persona. El servicio de ingresos todavía lee/escribe las columnas directas de `clientes`; el comando de administrador usa `personas_contactos`. Definir una fuente canónica antes de ampliar el uso del catálogo genérico.
- **Afectación IGV de productos:** `productos.afectacion_igv` ya expresa `GRAVADO`, `EXONERADO` o `INAFECTO`, mientras `productos.afecto_igv` guarda el booleano derivable. No se observa una restricción que garantice que ambos valores coincidan.
- **Imágenes de productos:** coexisten `productos.ruta_imagen` y la galería `productos_imagenes.ruta_imagen`. Podrían ser conceptos legítimos (portada y galería), pero la portada repetida crea riesgo de divergencia; definirla como elemento principal de la galería o documentar la diferencia.
- **Precios y presentaciones:** `precios_productos` guarda `producto_id` y `presentacion_id`, aunque la presentación ya pertenece a un producto. Sin una restricción compuesta, se puede asociar un precio al producto A y a una presentación del producto B.

Hay campos redundantes en snapshots de ventas y compras; esos snapshots pueden ser necesarios para conservar lo emitido o comprado aunque cambie el catálogo. No propongo normalizarlos sin revisar los requisitos de historial/documento.

### 4. Índices — prioridad alta/mediana

- La inspección de metadatos detectó **61 columnas de claves foráneas sin índice cuyo primer campo sea esa columna**. Algunas operativas para revisar primero: `ingresos.cliente_id`, `ingresos_detalle.presentacion_id`, `ingresos_detalle.mototaxi_unidad_id`, `productos.marca_id`, `productos.unidad_base_codigo`, `precios_productos.presentacion_id` y `precios_productos.tipo_lista_precio_id`. No conviene añadirlas todas sin revisar consultas y selectividad; los índices también penalizan escrituras y ocupan espacio.
- `dias_no_laborables_fiscales` tiene un índice normal y otro único sobre `fecha`, duplicando la misma ruta de búsqueda. La tabla está vacía y no aparece en el código actual.
- `productos_imagenes` tiene un índice simple por `producto_id` y un índice único `(producto_id, orden)`; el segundo ya permite búsquedas por el prefijo `producto_id`. `imagenes_mototaxis` presenta el mismo patrón con `(unidad_id, orden)` y el índice simple de `unidad_id`.
- Las estadísticas de `pg_stat_user_indexes` muestran muchos índices con cero usos, pero sin conocer el periodo desde el último reinicio/reset y con una base pequeña no es evidencia suficiente para eliminarlos. Se debe medir después de observar carga representativa.

### 5. Consultas SQL — prioridad mediana

- Los listados de ingresos y guías usan paginación por `OFFSET`; en tablas grandes el costo de páginas profundas aumenta. Valorar paginación por cursor si el volumen lo justifica.
- El listado de ingresos ejecuta lectura paginada y conteo total; confirmar los planes con `EXPLAIN (ANALYZE, BUFFERS)` en un entorno representativo y revisar filtros/búsqueda antes de agregar índices.
- Hay lecturas `.select().from(...)` que traen todas las columnas para vistas de detalle o historial. Reducir columnas en las rutas de lista cuando no se necesiten los campos JSON de respuesta fiscal u otros datos grandes.
- No se obtuvo una muestra de tráfico, consultas lentas ni medición con `EXPLAIN ANALYZE`; por eso esta parte identifica candidatos de código y esquema, no demuestra una degradación en producción.

## Plan recomendado

1. **Alinear entorno:** verificar que esta sea la base objetivo; aplicar las migraciones 0156–0158 únicamente en el entorno previsto y verificar que las tablas nuevas estén disponibles.
2. **Cerrar inventario de sobrantes:** revisar scripts, tareas programadas, reportes, integraciones y respaldos históricos. Confirmar por tabla responsable de negocio y retención.
3. **Retirar de forma segura:** para las 15 tablas vacías, generar migración que las retire en grupos aprobados; para `ingresos_correlativos` y `reglas_tributarias`, respaldar/exportar las filas y confirmar si se archivan o migran. No usar `DROP` manual.
4. **Resolver fuentes canónicas:** decidir documento principal/secundario, contacto principal, afectación IGV e imagen principal; luego imponer consistencia con restricciones y una migración de datos revisable.
5. **Optimizar índices con evidencia:** priorizar FK consultadas y filtros de listados; comparar planes antes/después con volumen representativo. Retirar duplicados solo tras verificar dependencias y reconstruir los índices del esquema.
6. **Operación SQL:** revisar paginación, columnas proyectadas y límites de listados; habilitar registro de consultas lentas con parámetros sensibles redactados y monitorear duración/filas leídas.

## Límites de esta auditoría

- Las estadísticas son de la base configurada en el entorno local y sus contadores dependen del último reset; no representan necesariamente producción ni un periodo conocido.
- No se leyeron filas de negocio salvo los conteos agregados de las tablas candidatas indicadas; no se inspeccionó su contenido.
- La búsqueda de referencias cubrió `apps/api/src` y `apps/web/src`, no procesos externos, consultas manuales, herramientas de BI ni integraciones fuera del repositorio.
- El checkout ya tenía cambios locales antes de la auditoría; se conservaron sin modificación.
- No se ejecutaron pruebas, migraciones, `ANALYZE`, `VACUUM`, cambios de índices ni escrituras en la base.
