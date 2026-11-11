# Propuesta de arquitectura: mototaxis, ventas y control NRUS

**Estado:** diseño previo a implementación
**Alcance:** separación funcional de mototaxis, gestión de compra e inventario por unidad, ventas, garantías, navegación y modelo de datos.

## Decisiones de negocio registradas

- La **boleta de venta** se emite mediante NubeFact y es el único documento que alimenta el indicador operativo NRUS solicitado en el sistema.
- La **nota de venta** es un documento interno de una venta: identifica cliente, fecha, líneas vendidas, total y pago. Se muestra en el dashboard e informes gerenciales y no se envía a SUNAT.
- El indicador operativo presenta las boletas del mes; no genera alertas ni bloqueos de venta por acumulados mensuales. Las notas se reportan por separado.
- Los reportes gerenciales deben permitir ver el total de boletas, las notas internas y el total comercial combinado, sin mezclar sus métricas.
- Las mototaxis son unidades serializadas con un catálogo de modelos; no son productos con cantidad abstracta.
- La venta mantiene un solo proceso para líneas de producto, servicio y mototaxi. La selección de una mototaxi cambia el estado de esa unidad y no el saldo de repuestos.
- En garantías, el proveedor puede cubrir 70% u 80% y la empresa asume el saldo. El porcentaje no reduce automáticamente el costo de compra.

> **Límite del indicador tributario:** que la nota no se emita a SUNAT no determina por sí mismo el tratamiento tributario de una operación. SUNAT define ingresos brutos por las actividades del NRUS y la boleta es el comprobante de venta aplicable. Por lo tanto, el acumulado “solo boletas” debe presentarse como el indicador operativo solicitado, sin rotularlo como cálculo tributario certificado. El tratamiento de ventas reales registradas con nota debe validarse con asesoría contable antes de producción. [SUNAT: Nuevo RUS](https://emprender.sunat.gob.pe/ruc/regimenes-tributarios-mype/nuevo-regimen-unico-simplificado-nuevo-rus) · [DL 937, texto actualizado](https://www.sunat.gob.pe/legislacion/rus/rus.pdf)

## Navegación del aside

| Módulo | Submódulos | Responsabilidad |
|---|---|---|
| Inicio | Dashboard | Indicadores gerenciales y accesos frecuentes. |
| Ventas | Nueva venta · Historial | Registrar productos, servicios y mototaxis con boleta o nota interna. |
| Inventario de productos | Productos · Categorías · Marcas · Compras · Movimientos y ajustes | Stock por cantidades y presentaciones. |
| Mototaxis | Resumen · Modelos · Unidades · Compras y recepción · Movimientos y ajustes · Garantías | Catálogo y ciclo de vida de cada unidad. |
| Contactos | Clientes · Proveedores | Directorio compartido; la misma persona puede tener ambos roles. |
| Reportes | Ventas · Productos · Mototaxis · Compras · Garantías | Vistas gerenciales con métricas definidas por dominio. |

“Compras” de productos y “Compras y recepción” de mototaxis deben mostrarse en lugares diferenciados porque generan existencias distintas. El proveedor, sin embargo, pertenece al directorio común.

## Flujos funcionales

### Catálogo y compra de mototaxis

1. Registrar una marca y ficha de modelo que la empresa trabaja. La ficha contiene fabricante, marca, modelo, versión, categoría vehicular y especificaciones técnicas disponibles.
2. Registrar una compra vinculada a proveedor y documento de sustento, con moneda, total, pagos y saldo.
3. Registrar la recepción física. Cada unidad recibida obtiene una ficha independiente, incluso si varias unidades pertenecen al mismo modelo y documento de compra.
4. Validar identificadores duplicados y dejar la unidad disponible solo después de completar los datos requeridos para su recepción.
5. Registrar cambios posteriores como movimientos trazables, sin borrar el historial.

El Reglamento Nacional de Vehículos establece VIN y número de motor para vehículos de categorías L, M y N; el VIN es irrepetible, mientras números de motor o chasis pueden coincidir entre vehículos distintos. Se propone VIN como identificador único prioritario cuando exista, y motor/chasis como identificadores complementarios sujetos a validación. La ficha de modelo debe admitir los datos aplicables de categoría, marca, modelo, versión, motor, combustible, cilindrada, carrocería y capacidad. La categoría L5 y sus características deben confirmarse con los documentos de cada modelo. [Reglamento Nacional de Vehículos, MTC](https://www.mtc.gob.pe/cnsv/documentos/normas-legales/DS%20058-2003-MTC.pdf)

### Venta

- Una sola cabecera de venta registra fecha, cliente, medio/condición de pago, total y tipo documental.
- Sus líneas son de tipo producto, servicio o mototaxi. Cada tipo referencia su entidad correspondiente y aplica sus reglas de disponibilidad.
- Línea producto: actualiza saldo y movimiento de productos.
- Línea servicio: no descuenta inventario.
- Línea mototaxi: exige una unidad disponible y la pasa a vendida dentro de la misma transacción que registra la venta.
- Boleta: enviar a NubeFact según configuración vigente y contabilizar en el acumulado operativo de boletas.
- Nota interna: conservar cliente y detalle comercial, no enviar a NubeFact, mostrar en informes y excluir del acumulado operativo de boletas.

Las notas internas no deben confundirse con transferencias, bajas, uso propio o pruebas. Esos son movimientos internos de inventario sin venta y deben tener sus propios motivos; no se registran como nota de venta.

### Garantía y reclamo

Guardar términos de garantía por proveedor/modelo (porcentaje, base de cálculo, vigencia, alcance y exclusiones); cada unidad referencia el término aplicable al momento de compra. Un reclamo registra unidad, falla, diagnóstico, fechas, costos de repuestos/mano de obra, importe asumido por proveedor, saldo de empresa, evidencia y resolución (reparación, repuesto, pago o crédito). El porcentaje cubierto debe quedar pendiente de definición exacta —incluida la base y la vigencia— antes de construir validaciones.

## Modelo relacional propuesto

Se propone una evolución incremental, conservando ventas, compras y pagos existentes y evitando un rediseño total de tablas maduras.

| Relación lógica | Atributos clave y propósito |
|---|---|
| `personas` | Identidad única de persona natural/jurídica y documento. Reutilizar la tabla actual. |
| `proveedores` | Rol de proveedor asociado a persona; condiciones comerciales generales si se necesitan. |
| `clientes` | Rol de cliente asociado a persona; ya existe. Una persona puede tener ambos roles. |
| `marcas` / marcas de dominio | Marca con identidad y atributos propios. Unificar con marcas de productos solo si ambas representan la misma entidad y reglas; si no, mantener catálogos separados sin duplicar información transversal. |
| `mototaxi_modelos` | Marca, modelo, versión, categoría y especificaciones normalizadas del modelo. No almacena datos seriales de una unidad. |
| `mototaxi_modelo_especificaciones` (opcional) | Solo atributos variables no comunes entre modelos, con catálogo tipado y validación. No usar JSON para campos que deban filtrarse o validarse frecuentemente. |
| `proveedor_modelo_mototaxi` | Relación N:M de proveedores y modelos, con vigencia, términos de compra y garantía asociados al acuerdo. |
| `compras` y `compras_detalle` | Cabecera común de documento/pago y detalle de líneas de producto o modelo/unidad; evaluar reutilizar `entradas_stock` sin romper su contrato actual. |
| `mototaxi_unidades` | Una fila por vehículo: modelo, VIN, motor, chasis/serie, color, año, placa (cuando exista), compra de origen y estado actual. |
| `movimientos_mototaxi` | Historial inmutable de recepción, reserva, venta, ajuste, traslado, garantía, devolución o baja; incluye motivo, unidad, usuario, fecha y referencia de origen. |
| `mototaxi_garantias` | Condición de cobertura adquirida/otorgada, fechas, alcance y referencia a proveedor/modelo/unidad. |
| `mototaxi_reclamos_garantia` | Eventos y costos de reclamos con cobertura y resolución. |
| `ventas` y `ventas_detalle` | Cabecera y líneas tipadas; ampliar la línea para referenciar unidad de mototaxi sin convertirla en producto genérico. Reutilizar `ingresos`/`ingresos_detalle` si su semántica se conserva. |
| `pagos_ventas` | Pagos/abonos como eventos ligados a venta, preservando medio, fecha e idempotencia. |

### Normalización como criterio de diseño

1. **1FN:** valores atómicos; no guardar listas de unidades, pagos o documentos dentro de una celda.
2. **2FN:** en relaciones con claves compuestas, cada atributo no clave depende de la clave completa. En detalles, la dependencia es de documento + número de línea (o una clave sustituta con restricción única equivalente).
3. **3FN:** separar atributos que dependen de otra entidad: nombre del proveedor en contacto, descripción de modelo en catálogo, datos de unidad en su ficha, pagos en pagos.
4. **BCNF:** para cada dependencia funcional no trivial, el determinante debe ser una superclave. Definir claves candidatas y `UNIQUE` explícitos, además de PK/FK.
5. **4FN:** separar hechos multivaluados independientes, por ejemplo modelos que pueden tener varios proveedores y proveedores que trabajan varios modelos; sus términos dependen de la asociación.
6. **5FN:** descomponer relaciones de más de dos entidades solo cuando exista una dependencia de unión real y recomponer no produzca filas espurias. No crear tablas sin una dependencia demostrable por perseguir la etiqueta “5FN”.

Los saldos actuales de productos son una proyección materializada mantenida junto con sus movimientos para consultas rápidas. Para mototaxis se puede mantener el estado actual en la ficha de unidad y el historial en movimientos, actualizándolos en una única transacción; los reportes históricos consultan movimientos por fecha. Índices iniciales sugeridos: VIN único (parcial si opcional), motor/chasis según reglas y calidad de datos, modelo+estado, proveedor+fecha de compra, unidad+fecha de movimiento, fecha+tipo documental en ventas y claves foráneas usadas por filtros. Ajustar índices con consultas reales y `EXPLAIN ANALYZE`, no duplicar cada columna en índices.

## Estado del código y brechas validadas

- `egresos_registros` guarda la compra de mototaxi como egreso con marca/modelo/motor/chasis en texto; no hay entidad de modelo ni unidad vehicular completa. Véase [`esquema/index.ts`](../packages/database/src/esquema/index.ts).
- `egresos` presta actualmente endpoints de compra de mototaxi; la navegación también ubica “Mototaxis” dentro de Inventario. La nueva arquitectura debe reemplazar esos accesos por rutas propias del dominio, no seguir creando mototaxis como egresos genéricos.
- El catálogo de productos y marcas ya está normalizado en entidades separadas. Compras de productos ya tienen cabecera, documento-detalle, detalle de inventario y pagos.
- El directorio actual tiene `personas` y `clientes`, pero el proveedor de compra de productos se guarda como texto en la cabecera. Se requiere una entidad/rol proveedor y una migración que conserve los valores históricos.
- `ingresos_detalle` distingue producto y servicio; falta el tipo mototaxi y la referencia a unidad. La venta de mototaxi debe validar y cambiar estado en transacción.
- El control NRUS y los reportes actuales filtran comprobantes electrónicos/boletas; deben documentar explícitamente notas internas como categoría separada, y nunca derivar “ingreso real” solo desde tipo documental sin el criterio acordado.
- Varias rutas visibles siguen renderizando `InicioPage` como contenedor SPA; la reorganización debe añadir pantallas y permisos antes de mostrar enlaces activos.

## Fases recomendadas de implementación

1. **Contratos y clasificación:** cerrar campos obligatorios, estados, catálogo de motivos de movimiento, separación nota/boleta y la base/validez del 70–80% de cobertura.
2. **Modelo y proveedores:** tablas de proveedores/rol, modelos, acuerdo proveedor-modelo y unidades; restricciones únicas, claves foráneas e índices. Migración aditiva con lectura compatible de registros históricos.
3. **Compras y recepción:** compra desde modelos permitidos, recepción por unidad, pagos/saldos y reporte de adquisiciones; evitar doble registro en egresos y compras.
4. **Inventario y garantías:** lista/ficha de unidades, movimientos, ajustes auditables, garantías y reclamos.
5. **Venta integrada:** línea mototaxi, actualización transaccional del estado, comprobante boleta/nota y validación de unidad disponible.
6. **Navegación y reportes:** aside por dominios, permisos/rutas verdaderos y reportes separados de boleta, nota, salidas internas, compras y garantías.
7. **Migración de legado:** mapear cada egreso MOTOTAXI existente a una compra/unidad solo cuando sus identificadores y datos sean suficientes; dejar casos ambiguos en revisión y nunca inferir unidades duplicadas automáticamente.

## Criterios para aceptar la futura implementación

- Una mototaxi solo se compra desde un modelo activo del catálogo.
- No se puede recibir otra unidad con VIN duplicado; motor/chasis se validan según los datos reales disponibles.
- Venta de una unidad no permite venderla dos veces, ni deja estado/venta inconsistente si una transacción falla.
- Boleta y nota muestran cliente, líneas, total y pago; solo boleta invoca NubeFact y suma al indicador operativo boletas acordado.
- Nota interna aparece en reportes gerenciales separada de boletas; transferencias/ajustes sin venta no aparecen como ventas.
- El historial de movimientos y reclamos no se modifica al actualizar el estado actual.
- Las compras de productos y mototaxis pueden analizarse por separado y por proveedor/periodo; los pagos parciales no alteran el costo documental.
- El aside solo activa enlaces con pantalla, ruta, permiso y operación implementados.
