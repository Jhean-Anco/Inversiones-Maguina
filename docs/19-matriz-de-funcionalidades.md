# 19. Matriz de funcionalidades

**Propósito:** separar presencia en código de operación comprobada. **Estado:** inspección estática de controladores, esquema, scripts y pruebas; no hubo E2E en esta reconstrucción.

| Módulo | Funcionalidad | Endpoint o componente | Persistencia | Permisos | Estado | Evidencia |
|---|---|---|---|---|---|---|
| Autenticación | sesión, cierre, usuario actual | `/autenticacion/*` | usuarios/roles | guards | IMPLEMENTADO SIN PRUEBA COMPLETA | controlador y servicios |
| Personas | clientes, proveedores, conductores, identidad | `/personas/*`, endpoints bajo ingresos | personas | decoradores por método | IMPLEMENTADO SIN PRUEBA COMPLETA | controladores y tablas |
| Inventario | productos, categorías, marcas, movimientos/entradas | `/inventario/*` | catálogo, stock, entradas | `INVENTARIO.*` | IMPLEMENTADO SIN PRUEBA COMPLETA | controladores y esquema |
| Compras/recepción | egresos, documentos y entradas | `/egresos/*`, `/inventario/entradas-stock` | egresos, detalle, pagos y stock | permisos de controlador | REQUIERE VALIDACIÓN FUNCIONAL | código presente; ciclo total no probado |
| Ventas | registro y consulta de ingresos | `/ingresos/*` | ingresos, detalle y pagos | `INGRESOS.*` | IMPLEMENTADO SIN PRUEBA COMPLETA | servicio y pruebas existentes |
| Crédito/pagos | pagos vinculados a venta | `/ingresos/:id/pagos` | ingresos_pagos | `INGRESOS.CREAR` | REQUIERE VALIDACIÓN FUNCIONAL | reglas/saldo requieren contrastar |
| Facturación | emisión, nota, anulación | ingresos/NubeFact | ingresos y documentos | permisos fiscales | BLOQUEADO POR SERVICIO EXTERNO | solicitudes presentes, proveedor real no comprobado |
| SIRE | consulta/importación documentos | `/inventario/sunat-sire`, documentos recibidos | tablas documentos | guardas de inventario/egreso | BLOQUEADO POR SERVICIO EXTERNO | servicio y credenciales requeridas |
| Mototaxis | compras, unidades, movimientos, garantías | `/mototaxis`, rutas de egreso | tablas mototaxis | por endpoint | IMPLEMENTADO SIN PRUEBA COMPLETA | módulos, esquema, migraciones |
| Finanzas | cuentas y movimientos | `/finanzas/cuentas/*` | cuentas financieras | incluye administración | IMPLEMENTADO SIN PRUEBA COMPLETA | controlador y esquema |
| Cotizaciones/servicios | CRUD y emisión desde ingresos | `/ingresos/cotizaciones`, `/ordenes-servicio` | cotizaciones/órdenes | `INGRESOS.*` | REQUIERE VALIDACIÓN FUNCIONAL | métodos controladores presentes |
| Reportes | consultas de reportes | `/reportes/*` | lectura de varias áreas | según controlador | IMPLEMENTADO SIN PRUEBA COMPLETA | módulo y controlador |

Estados usados en el sentido de la directiva. **No se marca IMPLEMENTADO Y VERIFICADO** porque no se ejecutaron suites ni flujos en este trabajo. `NO IMPLEMENTADO` requiere revisar alcance funcional esperado y no se infiere por ausencia de ruta.
