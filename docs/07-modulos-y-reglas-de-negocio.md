# 07. Módulos y reglas de negocio

**Propósito:** separar procesos presentes de conclusiones comerciales no demostradas. **Verificación:** estática; comportamiento de extremo a extremo requiere validación funcional.

| Área | Evidencia en código | Estado y límite |
|---|---|---|
| Catálogo e inventario | productos, entradas, movimientos, categorías, marcas y SIRE | IMPLEMENTADO SIN PRUEBA COMPLETA; verificar cantidades/costos y recepción |
| Compras y egresos | controladores y servicios de egresos, entradas de stock, documentos recibidos | IMPLEMENTACIÓN PARCIAL como proceso integral; recepción y pago son acciones separadas a verificar |
| Ventas e ingresos | ingreso, detalle, pagos, búsqueda de productos/clientes | IMPLEMENTADO SIN PRUEBA COMPLETA; validar reglas de precio/crédito |
| Créditos y pagos | pagos asociados a ingresos y tablas relacionadas | REQUIERE VALIDACIÓN FUNCIONAL de saldo, mora y contabilización |
| Facturación | NubeFact, series, notas, anulaciones y consultas | BLOQUEADO POR SERVICIO EXTERNO sin credenciales/respuesta real; no equivale a emisión probada |
| Finanzas | cuentas, movimientos y resúmenes | IMPLEMENTADO SIN PRUEBA COMPLETA; conciliación contable pendiente |
| Mototaxis | modelos, compras, unidades, movimientos, garantías | IMPLEMENTADO SIN PRUEBA COMPLETA; validar ciclo físico y comercial |
| Cotizaciones y servicio | controladores de cotización/órdenes dentro de ingresos | REQUIERE VALIDACIÓN FUNCIONAL de conversión y cierre |
| Reportes | módulo/controlador reportes | IMPLEMENTADO SIN PRUEBA COMPLETA; validar cifras con fuente operativa |

Para cada flujo, actor y permisos se determinan en controlador/guards; entradas por método; validaciones y escrituras en servicio/Drizzle; estados y errores deben derivarse de esas funciones y pruebas. Donde no hay evidencia contrastada se conserva `REQUIERE VALIDACIÓN FUNCIONAL`. La existencia de una pantalla o tabla no demuestra que el flujo esté operativamente cerrado.

**Fuentes:** `apps/api/src/modulos/**`, esquema Drizzle, suites unitarias/integración/API/E2E. **Preguntas pendientes:** criterios comerciales para costos, descuentos, crédito, anulaciones, recepción física, garantías y tratamiento de saldos.
