# Inventario de rutas

**Estado:** en curso. Inventario contrastado con el router fuente; la cobertura navegada se completa por lotes. No se considera que una ruta esté auditada solo por estar declarada.

## Fuentes y alcance

- Router: `apps/web/src/main/main.tsx` (37 declaraciones `<Route>`, contando la ruta comodín).
- Selector de vistas y permisos: `apps/web/src/pages/inicio-page/inicio-page.tsx`.
- Menú y permisos de navegación: `apps/web/src/components/layout/erp-aside/navegacion-aside.ts`.
- El router monta muchas rutas mediante `InicioPage`; por ello las vistas concretas dependen de la URL, permisos, estado de sesión y datos.

## Rutas declaradas

| Ruta | Tipo en router | Módulo o destino | Estado de exploración |
|---|---|---|---|
| `/` | Redirección | `/login` | Redirect observado estable |
| `/login` | Vista directa | Acceso | Inspeccionada; responsive y controles principales |
| `/inicio` | Vista compartida | Inicio | Captura móvil anonimizada; revisar estados/acciones del panel |
| `/configuracion/series` | Vista compartida | Configuración de series | Captura móvil anonimizada; no se guardó configuración |
| `/finanzas/cuentas` | Vista compartida | Finanzas / cuentas | Captura móvil anonimizada; acciones persistentes no activadas |
| `/ingresos/nuevo` | Redirección | `/ingresos/nuevo/repuestos` | Redirect estable tras 1,5 s y 2 s; sin loader ni `aria-busy` en el estado final |
| `/ingresos/nuevo/repuestos` | Vista compartida | Nuevo ingreso / repuestos | Formulario vacío abierto a 1440×900; no se emitió ni guardó |
| `/ingresos/nuevo/mototaxis` | Vista compartida | Nuevo ingreso / mototaxis | Formulario abierto desde venta de mototaxis; no se envió |
| `/ingresos/guias` | Vista compartida | Guías de remisión | Lista desktop observada; no se emitió guía |
| `/ingresos/ordenes-servicio` | Vista compartida | Órdenes de servicio | Lista y editor vacío observados; editor cancelado sin guardar |
| `/ingresos/cotizaciones` | Vista compartida | Cotizaciones | Lista desktop observada; emisión/envío no activados |
| `/ingresos/ventas/repuestos` | Vista compartida | Ventas / repuestos | Lista y formulario vacío observados; no se emitió ni guardó |
| `/ingresos/ventas/mototaxis` | Vista compartida | Ventas / mototaxis | Lista desktop observada; acciones persistentes no activadas |
| `/reportes/inventario` | Vista compartida | Reportes / inventario | Captura móvil anonimizada; acciones de consulta pendientes |
| `/reportes/ingresos` | Vista compartida | Reportes / ingresos | Captura móvil anonimizada; acciones de consulta pendientes |
| `/clientes` | Vista compartida | Clientes | Lista capturada a 390×844; interacción parcial |
| `/personas/proveedores` | Vista compartida | Proveedores | Lista capturada a 390×844; interacción parcial |
| `/personas/conductores` | Vista compartida | Conductores | Lista capturada a 390×844; interacción parcial |
| `/inventario/categorias` | Vista compartida | Categorías | Lista y diálogo observados; no se persistieron cambios. Captura no conservada por falta de máscara comprobable |
| `/inventario/marcas` | Vista compartida | Marcas | Lista observada; no se editó ni guardó. Captura no conservada por falta de máscara comprobable |
| `/inventario/productos` | Vista compartida | Productos / repuestos | Lista y diálogo Nuevo repuesto observados a 390×844; no se envió |
| `/inventario/precios` | Redirección | `/inventario/productos` | Redirect observado estable |
| `/inventario/mototaxis` | Vista compartida | Inventario de mototaxis | Lista observada; captura no conservada por falta de máscara comprobable |
| `/inventario/mototaxis/unidades` | Redirección | `/inventario/mototaxis` | Redirect observado estable |
| `/mototaxis` | Redirección | `/inventario/mototaxis` | Redirect observado estable |
| `/mototaxis/resumen` | Redirección | `/inventario/mototaxis` | Redirect observado estable |
| `/mototaxis/modelos` | Redirección | `/inventario/mototaxis` | Redirect observado estable |
| `/mototaxis/unidades` | Redirección | `/inventario/mototaxis` | Redirect observado estable |
| `/mototaxis/compras/nueva` | Vista compartida | Nueva compra de mototaxis | Formulario vacío abierto; no se guardó. Captura descartada por falta de máscara comprobable |
| `/mototaxis/:seccion` | Vista compartida dinámica | Secciones de mototaxis | Se observaron `/mototaxis/compras`, `/mototaxis/movimientos` y `/mototaxis/garantias`; no se modificó inventario |
| `/egresos/compras/nueva` | Vista compartida | Nueva compra | Formulario vacío abierto; no se guardó. Captura descartada por falta de máscara comprobable |
| `/egresos/compras` | Vista compartida | Compras | Lista observada parcialmente en desktop 1536×690 |
| `/egresos/mototaxis` | Redirección | `/mototaxis/compras` | Redirect observado estable |
| `/inventario/entradas-stock` | Redirección | `/egresos/compras` | Redirect observado estable |
| `/inventario/movimientos-ajustes` | Vista compartida | Movimientos y ajustes de stock | Vista observada; no se ajustó stock; captura no conservada |
| `*` | Redirección | `/login` | `/dashboard` se probó y terminó en `/login` |

## Observaciones

- Las rutas anteriores describen la declaración actual del router. La navegación efectiva, los redirects, los permisos y las pantallas montadas se contrastan por separado.
- Se abrieron 23 URLs de módulo directamente, 4 destinos adicionales desde acciones de crear, 10 aliases y `/mototaxis/garantias`. También se probó `/dashboard` como ruta no declarada y se observó la redirección comodín a `/login`. Las 37 declaraciones `<Route>` tienen al menos un resultado de navegador; la auditoría visual y de interacciones de cada destino sigue parcial.
- No hay un guard global visible en cada `<Route>`; `InicioPage` resuelve la vista/permiso. La disponibilidad por perfil se debe comprobar en navegador.
- El inventario no está completo: quedan rutas y acciones por explorar en estados autenticados y responsivos.
