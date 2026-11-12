<!-- Generated from Drizzle TypeScript declarations by scripts/documentar-datos.mjs. -->

## Catalogo estructural de tablas y columnas

Tipos y propiedades se extraen estaticamente de la llamada builder declarada; el tipo identifica el constructor Drizzle y no expande longitudes/precision. Los defaults se indican como presentes, sin mostrar valores calculados. Se listan nombres de indices/checks declarados; los miembros de indices compuestos y constraints de tabla no se desglosan. Revisar SQL de migraciones para historia y estado de bases existentes.

### `ajustes_inventario_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `modelo_id` | `uuid` | NOT NULL | FK | - | modelosMototaxis.id |
| `cantidad_sistema` | `integer` | NOT NULL | - | - | - |
| `cantidad_contada` | `integer` | NOT NULL | - | - | - |
| `motivo` | `varchar` | NOT NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `ajustes_inventario_mototaxis_modelo_fecha_idx`
- CHECK `ajustes_inventario_mototaxis_cantidades_ck`
- CHECK `ajustes_inventario_mototaxis_motivo_ck`


### `ajustes_inventario_mototaxis_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `ajuste_id` | `uuid` | NOT NULL | FK | - | ajustesInventarioMototaxis.id |
| `unidad_id` | `uuid` | NOT NULL | FK | - | unidadesMototaxis.id |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `ajustes_inventario_mototaxis_detalle_unico`
- INDEX `ajustes_inventario_mototaxis_detalle_unidad_idx`
- CHECK `ajustes_inventario_mototaxis_detalle_tipo_ck`


### `archivos_locales`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `tipo_archivo` | `varchar` | NOT NULL | - | - | - |
| `entidad_tipo` | `varchar` | NOT NULL | - | - | - |
| `entidad_id` | `uuid` | NOT NULL | - | - | - |
| `ruta_relativa` | `text` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `mime_type` | `varchar` | NOT NULL | - | - | - |
| `tamano_bytes` | `integer` | NOT NULL | - | - | - |
| `sha256` | `varchar` | NULL | - | - | - |
| `url_fuente` | `text` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `archivos_locales_entidad_idx`


### `cargos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `categorias_productos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `ruta_imagen` | `text` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `categorias_productos_nombre_lower_unico`


### `clientes`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `persona_id` | `uuid` | NULL | PK, FK | - | personas.id |
| `nombre_comercial` | `varchar` | NULL | - | - | - |
| `contacto_nombre` | `varchar` | NULL | - | - | - |
| `correo` | `varchar` | NULL | - | - | - |
| `telefono` | `varchar` | NULL | - | - | - |
| `direccion_fiscal` | `varchar` | NULL | - | - | - |
| `direccion_entrega` | `varchar` | NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `clientes_activo_idx`


### `compras_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `proveedor_persona_id` | `uuid` | NOT NULL | FK | - | proveedores.personaId |
| `fecha` | `date` | NOT NULL | - | - | - |
| `documento_tipo` | `varchar` | NOT NULL | - | - | - |
| `documento_numero` | `varchar` | NULL | - | - | - |
| `moneda` | `varchar` | NOT NULL | - | yes | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `compras_mototaxis_proveedor_fecha_idx`
- INDEX `compras_mototaxis_fecha_idx`
- CHECK `compras_mototaxis_documento_tipo_ck`
- CHECK `compras_mototaxis_moneda_ck`
- CHECK `compras_mototaxis_total_ck`


### `compras_mototaxis_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `compra_id` | `uuid` | NOT NULL | FK | - | comprasMototaxis.id |
| `modelo_id` | `uuid` | NOT NULL | FK | - | modelosMototaxis.id |
| `orden` | `integer` | NOT NULL | - | - | - |
| `cantidad` | `integer` | NOT NULL | - | - | - |
| `costo_unitario` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `compras_mototaxis_detalle_compra_idx`
- INDEX `compras_mototaxis_detalle_modelo_idx`
- CHECK `compras_mototaxis_detalle_cantidad_ck`
- CHECK `compras_mototaxis_detalle_costo_ck`


### `comprobantes_relacionados`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `ingreso_origen_id` | `uuid` | NOT NULL | FK | - | ingresos.id |
| `tipo_comprobante` | `varchar` | NOT NULL | - | - | - |
| `codigo_motivo` | `integer` | NOT NULL | - | - | - |
| `motivo` | `varchar` | NOT NULL | - | - | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `serie` | `varchar` | NOT NULL | - | - | - |
| `numero` | `integer` | NOT NULL | - | - | - |
| `subtotal` | `numeric` | NOT NULL | - | - | - |
| `igv` | `numeric` | NOT NULL | - | - | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | - | - |
| `inventario_devuelto` | `boolean` | NOT NULL | - | yes | - |
| `huella_solicitud` | `varchar` | NULL | - | - | - |
| `datos_nubefact` | `jsonb` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `comprobantes_relacionados_origen_idx`
- UNIQUE INDEX `comprobantes_relacionados_serie_numero_unico`
- UNIQUE INDEX `comprobantes_relacionados_huella_uq`
- CHECK `comprobantes_relacionados_tipo_ck`
- CHECK `comprobantes_relacionados_motivo_ck`
- CHECK `comprobantes_relacionados_importes_ck`


### `comprobantes_relacionados_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `comprobante_relacionado_id` | `uuid` | NOT NULL | FK | - | comprobantesRelacionados.id |
| `ingreso_detalle_id` | `uuid` | NOT NULL | FK | - | ingresosDetalle.id |
| `cantidad` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `comprobantes_relacionados_detalle_unico`
- INDEX `comprobantes_relacionados_detalle_origen_idx`
- CHECK `comprobantes_relacionados_detalle_cantidad_ck`


### `conductores`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `persona_id` | `uuid` | NULL | PK, FK | - | personas.id |
| `numero_licencia` | `varchar` | NOT NULL | - | - | - |
| `telefono` | `varchar` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `conductores_licencia_unica`
- INDEX `conductores_activo_idx`


### `correlativos_documentos_internos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `tipo` | `varchar` | NULL | PK | - | - |
| `ultimo_numero` | `integer` | NOT NULL | - | yes | - |
Restricciones e indices declarados:

- CHECK `correlativos_documentos_internos_numero_ck`


### `cotizaciones`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `cliente_id` | `uuid` | NOT NULL | FK | - | clientes.personaId |
| `detalles` | `jsonb` | NOT NULL | - | yes | - |
| `observacion` | `text` | NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `vigente_hasta` | `date` | NULL | - | - | - |
| `ingreso_id` | `uuid` | NULL | FK | - | ingresos.id |
| `clave_emision` | `varchar` | NOT NULL | UNIQUE | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `cotizaciones_cliente_fecha_idx`
- INDEX `cotizaciones_estado_fecha_idx`
- UNIQUE INDEX `cotizaciones_ingreso_uq`
- CHECK `cotizaciones_estado_ck`


### `cuentas_financieras`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `entidad` | `varchar` | NULL | - | - | - |
| `titular` | `varchar` | NULL | - | - | - |
| `moneda` | `varchar` | NOT NULL | - | yes | - |
| `numero_cuenta` | `varchar` | NULL | - | - | - |
| `cci` | `varchar` | NULL | - | - | - |
| `numero_tarjeta` | `varchar` | NULL | - | - | - |
| `telefono` | `varchar` | NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `activa` | `boolean` | NOT NULL | - | yes | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `cuentas_financieras_tipo_activa_idx`
- CHECK `cuentas_financieras_tipo_ck`
- CHECK `cuentas_financieras_moneda_ck`
- CHECK `cuentas_financieras_nombre_ck`


### `documentos_recibidos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `periodo_sire` | `varchar` | NULL | - | - | - |
| `ticket_sire` | `varchar` | NULL | - | - | - |
| `emisor_ruc` | `varchar` | NOT NULL | - | - | - |
| `emisor_nombre` | `varchar` | NULL | - | - | - |
| `tipo_documento` | `varchar` | NOT NULL | - | - | - |
| `serie` | `varchar` | NOT NULL | - | - | - |
| `correlativo` | `varchar` | NOT NULL | - | - | - |
| `fecha_emision` | `date` | NULL | - | - | - |
| `moneda` | `varchar` | NULL | - | - | - |
| `total` | `numeric` | NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `destino` | `varchar` | NULL | - | - | - |
| `datos_origen` | `jsonb` | NOT NULL | - | yes | - |
| `egreso_id` | `uuid` | NULL | FK | - | egresosRegistros.id |
| `entrada_stock_id` | `uuid` | NULL | FK | - | entradasStock.id |
| `compra_mototaxi_id` | `uuid` | NULL | FK | - | comprasMototaxis.id |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `importado_en` | `timestamp` | NOT NULL | - | yes | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `documentos_recibidos_estado_fecha_idx`
- INDEX `documentos_recibidos_periodo_idx`
- UNIQUE INDEX `documentos_recibidos_identidad_unique`
- CHECK `documentos_recibidos_estado_ck`
- CHECK `documentos_recibidos_destino_ck`
- CHECK `documentos_recibidos_ruc_ck`


### `egresos_pagos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `egreso_id` | `uuid` | NOT NULL | FK | - | egresosRegistros.id |
| `fecha_pago` | `date` | NOT NULL | - | - | - |
| `importe_pagado` | `numeric` | NOT NULL | - | - | - |
| `medio_pago` | `varchar` | NOT NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `clave_idempotencia` | `uuid` | NOT NULL | UNIQUE | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `egresos_pagos_egreso_fecha_idx`
- INDEX `egresos_pagos_fecha_idx`
- CHECK `egresos_pagos_importe_positivo_ck`
- CHECK `egresos_pagos_medio_pago_ck`


### `egresos_registros`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `ruc_emisor` | `varchar` | NULL | - | - | - |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `categoria` | `varchar` | NOT NULL | - | - | - |
| `concepto` | `varchar` | NOT NULL | - | - | - |
| `beneficiario` | `varchar` | NULL | - | - | - |
| `proveedor_ruc` | `varchar` | NULL | - | - | - |
| `documento_tipo` | `varchar` | NULL | - | - | - |
| `documento_numero` | `varchar` | NULL | - | - | - |
| `moneda` | `varchar` | NOT NULL | - | yes | - |
| `medio_pago` | `varchar` | NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `monto` | `numeric` | NOT NULL | - | - | - |
| `identificador_activo` | `varchar` | NULL | - | - | - |
| `mototaxi_marca` | `varchar` | NULL | - | - | - |
| `mototaxi_modelo` | `varchar` | NULL | - | - | - |
| `mototaxi_numero_motor` | `varchar` | NULL | - | - | - |
| `mototaxi_numero_chasis` | `varchar` | NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `egresos_registros_tipo_fecha_idx`
- INDEX `egresos_registros_ruc_emisor_fecha_idx`
- INDEX `egresos_registros_beneficiario_idx`
- CHECK `egresos_registros_tipo_ck`
- CHECK `egresos_registros_ruc_emisor_ck`
- CHECK `egresos_registros_proveedor_ruc_ck`
- CHECK `egresos_registros_moneda_ck`
- CHECK `egresos_registros_medio_pago_ck`
- CHECK `egresos_registros_monto_positivo_ck`
- CHECK `egresos_registros_mototaxi_datos_ck`
- UNIQUE INDEX `egresos_registros_mototaxi_motor_unique`
- UNIQUE INDEX `egresos_registros_mototaxi_chasis_unique`


### `entradas_stock`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `ruc_emisor` | `varchar` | NULL | - | - | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `tipo_documento` | `varchar` | NOT NULL | - | - | - |
| `numero_documento` | `varchar` | NULL | - | - | - |
| `medio_pago` | `varchar` | NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `monto_pagado` | `numeric` | NULL | - | - | - |
| `proveedor` | `varchar` | NULL | - | - | - |
| `proveedor_tipo_persona` | `varchar` | NULL | - | - | - |
| `proveedor_tipo_documento` | `varchar` | NULL | - | - | - |
| `proveedor_numero_documento` | `varchar` | NULL | - | - | - |
| `proveedor_direccion` | `varchar` | NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `total_documento` | `numeric` | NULL | - | - | - |
| `evidencia_ruta` | `varchar` | NULL | - | - | - |
| `evidencia_nombre` | `varchar` | NULL | - | - | - |
| `evidencia_mime` | `varchar` | NULL | - | - | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `entradas_stock_fecha_idx`
- INDEX `entradas_stock_ruc_emisor_fecha_idx`
- INDEX `entradas_stock_proveedor_idx`
- INDEX `entradas_stock_proveedor_documento_idx`
- CHECK `entradas_stock_proveedor_persona_ck`
- CHECK `entradas_stock_ruc_emisor_ck`
- CHECK `entradas_stock_proveedor_documento_tipo_ck`
- CHECK `entradas_stock_proveedor_documento_numero_ck`
- CHECK `entradas_stock_proveedor_juridico_ruc_ck`
- CHECK `entradas_stock_total_no_negativo_ck`
- CHECK `entradas_stock_pago_ck`
- CHECK `entradas_stock_medio_pago_ck`


### `entradas_stock_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `entrada_id` | `uuid` | NOT NULL | FK | - | entradasStock.id |
| `detalle_documento_id` | `uuid` | NULL | FK | - | entradasStockDocumentoDetalle.id |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `presentacion_id` | `uuid` | NOT NULL | FK | - | productosPresentaciones.id |
| `codigo_producto` | `varchar` | NOT NULL | - | - | - |
| `nombre_producto` | `varchar` | NOT NULL | - | - | - |
| `presentacion` | `varchar` | NOT NULL | - | - | - |
| `unidad_medida_codigo` | `varchar` | NOT NULL | FK | - | unidadesMedida.codigo |
| `cantidad` | `numeric` | NOT NULL | - | - | - |
| `factor_a_unidad_base` | `numeric` | NOT NULL | - | - | - |
| `cantidad_base` | `numeric` | NOT NULL | - | - | - |
| `costo_unitario` | `numeric` | NOT NULL | - | - | - |
| `subtotal` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `entradas_stock_detalle_entrada_idx`
- INDEX `entradas_stock_detalle_producto_idx`
- CHECK `entradas_stock_detalle_cantidad_positiva_ck`
- CHECK `entradas_stock_detalle_factor_positivo_ck`
- CHECK `entradas_stock_detalle_cantidad_base_positiva_ck`
- CHECK `entradas_stock_detalle_costo_no_negativo_ck`


### `entradas_stock_documento_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `entrada_id` | `uuid` | NOT NULL | FK | - | entradasStock.id |
| `orden` | `integer` | NOT NULL | - | - | - |
| `codigo` | `varchar` | NULL | - | - | - |
| `descripcion` | `varchar` | NOT NULL | - | - | - |
| `unidad` | `varchar` | NULL | - | - | - |
| `cantidad` | `numeric` | NOT NULL | - | - | - |
| `costo_unitario` | `numeric` | NOT NULL | - | - | - |
| `descuento` | `numeric` | NOT NULL | - | yes | - |
| `subtotal` | `numeric` | NOT NULL | - | - | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `entradas_stock_documento_detalle_entrada_idx`
- CHECK `entradas_stock_documento_detalle_cantidad_ck`
- CHECK `entradas_stock_documento_detalle_costo_ck`
- CHECK `entradas_stock_documento_detalle_importes_ck`


### `garantias_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `unidad_id` | `uuid` | NOT NULL | FK | - | unidadesMototaxis.id |
| `proveedor_persona_id` | `uuid` | NOT NULL | FK | - | proveedores.personaId |
| `porcentaje_proveedor` | `numeric` | NOT NULL | - | - | - |
| `meses_vigencia` | `integer` | NOT NULL | - | - | - |
| `inicia_en` | `date` | NOT NULL | - | - | - |
| `termina_en` | `date` | NOT NULL | - | - | - |
| `alcance` | `text` | NULL | - | - | - |
| `exclusiones` | `text` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `garantias_mototaxis_unidad_unica`
- INDEX `garantias_mototaxis_proveedor_vigencia_idx`
- CHECK `garantias_mototaxis_porcentaje_ck`
- CHECK `garantias_mototaxis_meses_ck`
- CHECK `garantias_mototaxis_fechas_ck`


### `guias_remision`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `serie` | `varchar` | NOT NULL | - | - | - |
| `numero` | `integer` | NOT NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `datos_nubefact` | `jsonb` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `guias_remision_fecha_idx`
- INDEX `guias_remision_tipo_estado_idx`
- UNIQUE INDEX `guias_remision_correlativo_unico`
- CHECK `guias_remision_tipo_ck`
- CHECK `guias_remision_numero_ck`


### `imagenes_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `unidad_id` | `uuid` | NOT NULL | FK | - | unidadesMototaxis.id |
| `archivo_id` | `uuid` | NOT NULL | FK, UNIQUE | - | archivosLocales.id |
| `orden` | `integer` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `imagenes_mototaxis_unidad_orden_unico`
- INDEX `imagenes_mototaxis_unidad_idx`
- CHECK `imagenes_mototaxis_orden_ck`


### `ingresos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `ruc_emisor` | `varchar` | NULL | - | - | - |
| `fecha` | `date` | NOT NULL | - | - | - |
| `tipo_comprobante` | `varchar` | NOT NULL | - | yes | - |
| `cliente_tipo_documento` | `varchar` | NULL | - | - | - |
| `cliente_numero_documento` | `varchar` | NULL | - | - | - |
| `cliente_nombre` | `varchar` | NULL | - | - | - |
| `cliente_direccion` | `varchar` | NULL | - | - | - |
| `cliente_id` | `uuid` | NULL | FK | - | clientes.personaId |
| `medio_pago` | `varchar` | NOT NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `condicion_pago` | `varchar` | NOT NULL | - | yes | - |
| `fecha_vencimiento_pago` | `date` | NULL | - | - | - |
| `cuotas_pago` | `jsonb` | NOT NULL | - | yes | - |
| `importe_pago_inicial` | `numeric` | NOT NULL | - | yes | - |
| `observacion` | `text` | NULL | - | - | - |
| `datos_nubefact` | `jsonb` | NULL | - | - | - |
| `clave_idempotencia` | `varchar` | NULL | - | - | - |
| `huella_solicitud` | `varchar` | NULL | - | - | - |
| `subtotal` | `numeric` | NOT NULL | - | - | - |
| `tasa_igv` | `numeric` | NOT NULL | - | yes | - |
| `igv` | `numeric` | NOT NULL | - | - | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `ingresos_fecha_idx`
- INDEX `ingresos_ruc_emisor_fecha_idx`
- INDEX `ingresos_cliente_documento_idx`
- UNIQUE INDEX `ingresos_clave_idempotencia_unico`
- CHECK `ingresos_tipo_comprobante_ck`
- CHECK `ingresos_ruc_emisor_ck`
- CHECK `ingresos_medio_pago_ck`
- CHECK `ingresos_condicion_pago_ck`
- CHECK `ingresos_pago_inicial_ck`
- CHECK `ingresos_totales_no_negativos_ck`
- CHECK `ingresos_tasa_igv_ck`


### `ingresos_detalle`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `ingreso_id` | `uuid` | NOT NULL | FK | - | ingresos.id |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `producto_id` | `uuid` | NULL | FK | - | productos.id |
| `mototaxi_unidad_id` | `uuid` | NULL | FK | - | unidadesMototaxis.id |
| `presentacion_id` | `uuid` | NULL | FK | - | productosPresentaciones.id |
| `codigo_producto` | `varchar` | NULL | - | - | - |
| `descripcion` | `varchar` | NOT NULL | - | - | - |
| `presentacion` | `varchar` | NULL | - | - | - |
| `unidad_medida_codigo` | `varchar` | NULL | FK | - | unidadesMedida.codigo |
| `cantidad` | `numeric` | NOT NULL | - | - | - |
| `factor_a_unidad_base` | `numeric` | NULL | - | - | - |
| `cantidad_base` | `numeric` | NULL | - | - | - |
| `precio_unitario` | `numeric` | NOT NULL | - | - | - |
| `descuento` | `numeric` | NOT NULL | - | yes | - |
| `afectacion_igv` | `varchar` | NOT NULL | - | yes | - |
| `afecto_igv` | `boolean` | NOT NULL | - | - | - |
| `subtotal` | `numeric` | NOT NULL | - | - | - |
| `igv` | `numeric` | NOT NULL | - | - | - |
| `total` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `ingresos_detalle_ingreso_idx`
- INDEX `ingresos_detalle_producto_idx`
- CHECK `ingresos_detalle_tipo_ck`
- CHECK `ingresos_detalle_afectacion_igv_ck`
- CHECK `ingresos_detalle_tipo_relacion_ck`
- CHECK `ingresos_detalle_cantidad_positiva_ck`
- CHECK `ingresos_detalle_precio_no_negativo_ck`
- CHECK `ingresos_detalle_descuento_valido_ck`
- CHECK `ingresos_detalle_totales_no_negativos_ck`


### `ingresos_pagos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `ingreso_id` | `uuid` | NOT NULL | FK | - | ingresos.id |
| `fecha_pago` | `date` | NOT NULL | - | - | - |
| `importe_aplicado` | `numeric` | NOT NULL | - | - | - |
| `es_pago_inicial` | `boolean` | NOT NULL | - | yes | - |
| `importe_recibido` | `numeric` | NOT NULL | - | - | - |
| `medio_pago` | `varchar` | NOT NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `referencia_pago` | `varchar` | NULL | - | - | - |
| `observacion` | `varchar` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `clave_idempotencia` | `varchar` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `ingresos_pagos_ingreso_fecha_idx`
- UNIQUE INDEX `ingresos_pagos_pago_inicial_unico`
- UNIQUE INDEX `ingresos_pagos_idempotencia_unico`
- CHECK `ingresos_pagos_importes_ck`
- CHECK `ingresos_pagos_medio_ck`


### `marcas_productos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `uso` | `varchar` | NOT NULL | - | yes | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `ruta_imagen` | `text` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `marcas_productos_nombre_lower_unico`
- CHECK `marcas_productos_uso_ck`


### `modelos_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `marca_id` | `uuid` | NOT NULL | FK | - | marcasProductos.id |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `version` | `varchar` | NULL | - | - | - |
| `precio_venta` | `numeric` | NULL | - | - | - |
| `categoria_vehicular` | `varchar` | NOT NULL | - | yes | - |
| `fabricante` | `varchar` | NULL | - | - | - |
| `pais_fabricacion` | `varchar` | NULL | - | - | - |
| `marca_motor` | `varchar` | NULL | - | - | - |
| `modelo_motor` | `varchar` | NULL | - | - | - |
| `cilindrada_cc` | `integer` | NULL | - | - | - |
| `combustible` | `varchar` | NULL | - | - | - |
| `transmision` | `varchar` | NULL | - | - | - |
| `carroceria` | `varchar` | NULL | - | - | - |
| `capacidad_asientos` | `integer` | NULL | - | - | - |
| `capacidad_carga_kg` | `numeric` | NULL | - | - | - |
| `especificaciones_adicionales` | `text` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `modelos_mototaxis_marca_nombre_version_unico`
- INDEX `modelos_mototaxis_marca_activo_idx`
- CHECK `modelos_mototaxis_categoria_ck`
- CHECK `modelos_mototaxis_cilindrada_ck`
- CHECK `modelos_mototaxis_capacidades_ck`
- CHECK `modelos_mototaxis_precio_venta_ck`


### `movimientos_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `unidad_id` | `uuid` | NOT NULL | FK | - | unidadesMototaxis.id |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `estado_anterior` | `varchar` | NULL | - | - | - |
| `estado_nuevo` | `varchar` | NOT NULL | - | - | - |
| `motivo` | `varchar` | NOT NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `movimientos_mototaxis_unidad_fecha_idx`
- CHECK `movimientos_mototaxis_tipo_ck`
- CHECK `movimientos_mototaxis_estado_ck`


### `movimientos_mototaxis_ventas`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `movimiento_id` | `uuid` | NULL | PK, FK | - | movimientosMototaxis.id |
| `venta_detalle_id` | `uuid` | NOT NULL | FK, UNIQUE | - | ingresosDetalle.id |

### `movimientos_stock`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `origen_tipo` | `varchar` | NOT NULL | - | - | - |
| `origen_id` | `uuid` | NOT NULL | - | - | - |
| `origen_detalle_id` | `uuid` | NOT NULL | - | - | - |
| `cantidad_base` | `numeric` | NOT NULL | - | - | - |
| `costo_unitario_base` | `numeric` | NOT NULL | - | - | - |
| `sentido` | `varchar` | NULL | - | - | - |
| `motivo` | `varchar` | NULL | - | - | - |
| `observacion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `movimientos_stock_origen_detalle_unico`
- INDEX `movimientos_stock_producto_fecha_idx`
- CHECK `movimientos_stock_tipo_ck`
- CHECK `movimientos_stock_cantidad_positiva_ck`
- CHECK `movimientos_stock_costo_no_negativo_ck`
- CHECK `movimientos_stock_sentido_ck`
- CHECK `movimientos_stock_motivo_ck`


### `nubefact_correlativos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `serie` | `varchar` | NOT NULL | - | - | - |
| `tipo_comprobante` | `integer` | NOT NULL | - | yes | - |
| `ultimo_numero` | `integer` | NOT NULL | - | yes | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- CHECK `nubefact_correlativos_tipo_ck`
- CHECK `nubefact_correlativos_numero_ck`


### `ordenes_servicio`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `cliente_id` | `uuid` | NOT NULL | FK | - | clientes.personaId |
| `vehiculo_placa` | `varchar` | NOT NULL | - | - | - |
| `vehiculo_vin` | `varchar` | NULL | - | - | - |
| `vehiculo_marca` | `varchar` | NULL | - | - | - |
| `vehiculo_modelo` | `varchar` | NULL | - | - | - |
| `motivo` | `text` | NOT NULL | - | - | - |
| `diagnostico` | `text` | NULL | - | - | - |
| `notas_trabajo` | `jsonb` | NOT NULL | - | yes | - |
| `detalles` | `jsonb` | NOT NULL | - | yes | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `fecha_recepcion` | `date` | NOT NULL | - | - | - |
| `fecha_cierre` | `date` | NULL | - | - | - |
| `ingreso_id` | `uuid` | NULL | FK | - | ingresos.id |
| `clave_emision` | `varchar` | NOT NULL | UNIQUE | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `ordenes_servicio_cliente_fecha_idx`
- INDEX `ordenes_servicio_vehiculo_idx`
- INDEX `ordenes_servicio_estado_idx`
- UNIQUE INDEX `ordenes_servicio_ingreso_uq`
- CHECK `ordenes_servicio_estado_ck`


### `pagos_compras_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `compra_id` | `uuid` | NOT NULL | FK | - | comprasMototaxis.id |
| `fecha_pago` | `date` | NOT NULL | - | - | - |
| `importe_pagado` | `numeric` | NOT NULL | - | - | - |
| `medio_pago` | `varchar` | NOT NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `clave_idempotencia` | `uuid` | NOT NULL | UNIQUE | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `pagos_compras_mototaxis_compra_fecha_idx`
- CHECK `pagos_compras_mototaxis_importe_ck`
- CHECK `pagos_compras_mototaxis_medio_ck`


### `pagos_entradas_stock`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `entrada_id` | `uuid` | NOT NULL | FK | - | entradasStock.id |
| `fecha_pago` | `date` | NOT NULL | - | - | - |
| `importe_pagado` | `numeric` | NOT NULL | - | - | - |
| `medio_pago` | `varchar` | NOT NULL | - | - | - |
| `cuenta_financiera_id` | `uuid` | NULL | FK | - | cuentasFinancieras.id |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `clasificado_por_usuario_id` | `uuid` | NULL | FK | - | usuarios.id |
| `clasificado_en` | `timestamp` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `pagos_entradas_stock_entrada_fecha_idx`
- CHECK `pagos_entradas_stock_importes_ck`
- CHECK `pagos_entradas_stock_medio_ck`


### `permisos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `modulo` | `varchar` | NOT NULL | - | - | - |
| `accion` | `varchar` | NOT NULL | - | - | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `permisos_modulo_accion_unico`


### `personas`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `tipo_persona_id` | `uuid` | NOT NULL | FK | - | tiposPersona.id |
| `nombres` | `varchar` | NULL | - | - | - |
| `apellido_paterno` | `varchar` | NULL | - | - | - |
| `apellido_materno` | `varchar` | NULL | - | - | - |
| `fecha_nacimiento` | `date` | NULL | - | - | - |
| `razon_social` | `varchar` | NULL | - | - | - |
| `tipo_documento_id` | `uuid` | NOT NULL | FK | - | tiposDocumento.id |
| `numero_documento` | `varchar` | NOT NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `personas_documento_unico`
- INDEX `personas_nombre_idx`
- CHECK `personas_nombre_o_razon_social_ck`


### `personas_contactos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `persona_id` | `uuid` | NOT NULL | FK | - | personas.id |
| `tipo_contacto_id` | `uuid` | NOT NULL | FK | - | tiposContacto.id |
| `valor` | `varchar` | NOT NULL | - | - | - |
| `etiqueta` | `varchar` | NULL | - | - | - |
| `es_principal` | `boolean` | NOT NULL | - | yes | - |
| `verificado_en` | `timestamp` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `personas_contactos_persona_tipo_idx`
- INDEX `personas_contactos_tipo_valor_idx`
- UNIQUE INDEX `persona_contacto_principal_unico`


### `personas_documentos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `persona_id` | `uuid` | NOT NULL | FK | - | personas.id |
| `tipo_documento_id` | `uuid` | NOT NULL | FK | - | tiposDocumento.id |
| `numero_documento` | `varchar` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `personas_documentos_identidad_unico`
- UNIQUE INDEX `personas_documentos_persona_tipo_unico`
- INDEX `personas_documentos_persona_idx`


### `precios_productos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `presentacion_id` | `uuid` | NOT NULL | FK | - | productosPresentaciones.id |
| `tipo_lista_precio_id` | `uuid` | NOT NULL | FK | - | tiposListasPrecio.id |
| `precio` | `numeric` | NOT NULL | - | - | - |
| `cantidad_minima` | `numeric` | NOT NULL | - | yes | - |
| `vigente_desde` | `timestamp` | NULL | - | - | - |
| `vigente_hasta` | `timestamp` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `precios_productos_consulta_idx`
- CHECK `precios_productos_precio_no_negativo_ck`
- CHECK `precios_productos_cantidad_positiva_ck`
- CHECK `precios_productos_vigencia_ck`


### `productos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo_interno` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `descripcion` | `text` | NULL | - | - | - |
| `categoria_id` | `uuid` | NOT NULL | FK | - | categoriasProductos.id |
| `marca_id` | `uuid` | NOT NULL | FK | - | marcasProductos.id |
| `unidad_base_codigo` | `varchar` | NOT NULL | FK | - | unidadesMedida.codigo |
| `stock_minimo` | `numeric` | NOT NULL | - | yes | - |
| `afectacion_igv` | `varchar` | NOT NULL | - | yes | - |
| `afecto_igv` | `boolean` | NOT NULL | - | yes | - |
| `ruta_imagen` | `text` | NULL | - | - | - |
| `ficha_tecnica` | `jsonb` | NOT NULL | - | yes | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `productos_nombre_idx`
- INDEX `productos_categoria_marca_idx`
- CHECK `productos_afectacion_igv_ck`


### `productos_codigos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `tipo` | `varchar` | NOT NULL | - | - | - |
| `codigo` | `varchar` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `productos_codigos_tipo_codigo_unico`
- INDEX `productos_codigos_producto_idx`


### `productos_imagenes`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `ruta_imagen` | `text` | NOT NULL | - | - | - |
| `orden` | `integer` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `productos_imagenes_producto_orden_unico`
- INDEX `productos_imagenes_producto_idx`
- CHECK `productos_imagenes_orden_ck`


### `productos_presentaciones`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `producto_id` | `uuid` | NOT NULL | FK | - | productos.id |
| `unidad_medida_codigo` | `varchar` | NOT NULL | FK | - | unidadesMedida.codigo |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `factor_a_unidad_base` | `numeric` | NOT NULL | - | - | - |
| `se_compra` | `boolean` | NOT NULL | - | yes | - |
| `se_vende` | `boolean` | NOT NULL | - | yes | - |
| `es_base` | `boolean` | NOT NULL | - | yes | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `productos_presentaciones_producto_idx`
- UNIQUE INDEX `productos_presentaciones_base_unica`
- CHECK `productos_presentaciones_factor_positivo_ck`
- CHECK `productos_presentaciones_rol_ck`


### `proveedores`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `persona_id` | `uuid` | NULL | PK, FK | - | personas.id |
| `nombre_comercial` | `varchar` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `observacion` | `text` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `proveedores_activo_idx`


### `reclamos_garantia_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `garantia_id` | `uuid` | NOT NULL | FK | - | garantiasMototaxis.id |
| `fecha` | `date` | NOT NULL | - | - | - |
| `descripcion_falla` | `text` | NOT NULL | - | - | - |
| `costo_total` | `numeric` | NOT NULL | - | - | - |
| `porcentaje_proveedor_aplicado` | `numeric` | NOT NULL | - | - | - |
| `importe_proveedor` | `numeric` | NOT NULL | - | - | - |
| `importe_empresa` | `numeric` | NOT NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `resolucion` | `text` | NULL | - | - | - |
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
Restricciones e indices declarados:

- INDEX `reclamos_garantia_mototaxis_estado_fecha_idx`
- CHECK `reclamos_garantia_mototaxis_costos_ck`
- CHECK `reclamos_garantia_mototaxis_porcentaje_ck`
- CHECK `reclamos_garantia_mototaxis_estado_ck`


### `roles`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `es_sistema` | `boolean` | NOT NULL | - | yes | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |

### `roles_permisos`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `rol_id` | `uuid` | NOT NULL | FK | - | roles.id |
| `permiso_id` | `uuid` | NOT NULL | FK | - | permisos.id |
| `asignado_en` | `timestamp` | NOT NULL | - | yes | - |

### `saldos_stock`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `producto_id` | `uuid` | NULL | PK, FK | - | productos.id |
| `cantidad` | `numeric` | NOT NULL | - | yes | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- CHECK `saldos_stock_cantidad_no_negativa_ck`


### `series_comprobantes`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `tipo_comprobante` | `varchar` | NOT NULL | - | - | - |
| `serie` | `varchar` | NOT NULL | - | - | - |
| `activa` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `series_comprobantes_tipo_serie_uq`
- UNIQUE INDEX `series_comprobantes_activa_tipo_uq`
- CHECK `series_comprobantes_tipo_ck`


### `tipos_contacto`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `tipos_documento`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `longitud_minima` | `integer` | NULL | - | - | - |
| `longitud_maxima` | `integer` | NULL | - | - | - |
| `solo_numeros` | `boolean` | NOT NULL | - | yes | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `tipos_listas_precio`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `tipos_persona`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `nombre` | `varchar` | NOT NULL | UNIQUE | - | - |
| `descripcion` | `varchar` | NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `trabajadores`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `persona_id` | `uuid` | NULL | PK, FK | - | personas.id |
| `codigo_trabajador` | `varchar` | NULL | UNIQUE | - | - |
| `cargo_id` | `uuid` | NULL | FK | - | cargos.id |
| `fecha_ingreso` | `date` | NOT NULL | - | - | - |
| `fecha_cese` | `date` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- CHECK `trabajadores_fechas_ck`


### `unidades_medida`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `codigo` | `varchar` | NULL | PK | - | - |
| `nombre` | `varchar` | NOT NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |

### `unidades_mototaxis`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `codigo` | `varchar` | NOT NULL | UNIQUE | - | - |
| `compra_detalle_id` | `uuid` | NULL | FK | - | comprasMototaxisDetalle.id |
| `modelo_id` | `uuid` | NOT NULL | FK | - | modelosMototaxis.id |
| `vin` | `varchar` | NOT NULL | - | - | - |
| `numero_motor` | `varchar` | NOT NULL | - | - | - |
| `numero_chasis` | `varchar` | NULL | - | - | - |
| `anio_modelo` | `integer` | NULL | - | - | - |
| `color` | `varchar` | NULL | - | - | - |
| `placa` | `varchar` | NULL | - | - | - |
| `estado` | `varchar` | NOT NULL | - | yes | - |
| `costo_adquisicion` | `numeric` | NOT NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `unidades_mototaxis_vin_unico`
- UNIQUE INDEX `unidades_mototaxis_placa_unica`
- INDEX `unidades_mototaxis_modelo_estado_idx`
- INDEX `unidades_mototaxis_motor_idx`
- INDEX `unidades_mototaxis_chasis_idx`
- CHECK `unidades_mototaxis_estado_ck`
- CHECK `unidades_mototaxis_costo_ck`
- CHECK `unidades_mototaxis_anio_ck`


### `usuarios`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `id` | `uuid` | NULL | PK | yes | - |
| `trabajador_id` | `uuid` | NOT NULL | FK, UNIQUE | - | trabajadores.personaId |
| `nombre_usuario` | `varchar` | NOT NULL | - | - | - |
| `correo` | `varchar` | NOT NULL | - | - | - |
| `contrasena_hash` | `varchar` | NOT NULL | - | - | - |
| `activo` | `boolean` | NOT NULL | - | yes | - |
| `requiere_cambio_contrasena` | `boolean` | NOT NULL | - | yes | - |
| `ultimo_acceso_en` | `timestamp` | NULL | - | - | - |
| `creadoEn` | `fechaCreacion` | NULL | - | - | - |
| `actualizadoEn` | `fechaActualizacion` | NULL | - | - | - |
Restricciones e indices declarados:

- UNIQUE INDEX `usuarios_nombre_usuario_lower_unico`
- UNIQUE INDEX `usuarios_correo_lower_unico`


### `usuarios_roles`

| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |
|---|---|---|---|---|---|
| `usuario_id` | `uuid` | NOT NULL | FK | - | usuarios.id |
| `rol_id` | `uuid` | NOT NULL | FK | - | roles.id |
| `asignado_en` | `timestamp` | NOT NULL | - | yes | - |
| `asignado_por_usuario_id` | `uuid` | NULL | FK | - | usuarios.id |
