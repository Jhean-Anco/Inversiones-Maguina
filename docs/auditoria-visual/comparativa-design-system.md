# Comparativa del Design System

**Estado:** inventario fuente y primeras mediciones; comparación transversal pendiente.

| Elemento | Patrón fuente | Medida observada | Comparación / estado |
|---|---|---|---|
| Fuente base | Inter, Segoe UI, system-ui | Login: Inter, 14 px en inputs; se midió también 12 px en enlaces secundarios | Sin par equivalente todavía |
| Input de login | Estilo local de acceso | Desktop 362×49 px; móvil 291×44 px a 360×800 y 318×44 px a 390×844; radio computado 9 px en una medición desktop | La variación móvil/desktop parece responder al breakpoint; comparar con otros formularios |
| Botón principal de login | Estilo local de acceso | Desktop 362×50 px; móvil 291×46 px a 360×800 | Sin par equivalente todavía |
| Button compartido | CVA: sm/default/lg/icon de 36/40/44/40 px | No medido en estado renderizado | Pendiente |
| Acción de icono | BotonAccion: alturas 30/34/40 px por variante | No medido en estado renderizado | Pendiente |
| Formularios de compra | `erp-design-system.css`: inputs 42 px, radio 9 px, 13 px | No medido en navegador | Pendiente |
| Tabla responsiva | Listado compartido más tablas locales | Productos: tabla más ancha que el contenedor y scroll interno | Evaluar frente a tablas equivalentes |
| Listados de personas | Vistas de Clientes, Proveedores y Conductores | En capturas de 390×844, búsqueda a y≈485 px; tabla a y≈578 px; cabecera móvil completa | Posición coherente entre estos tres; comparar con otras listas antes de juzgar el espacio vacío |
| Filtros de Productos | Búsqueda y selector | A 1280×800, ambos 42 px de alto | Solo una ruta; comparación entre módulos pendiente |
| Acción principal de Productos | Botón flotante | A 1280×800, 56×56 px; hover cambió la sombra | Medida de referencia; estados de otros botones pendientes |
| Foco de campo | Búsqueda de Productos | Outline visible de 2,4 px | Resultado solo de una página; revisar otros componentes equivalentes |

Los valores fuente no se califican como inconsistencias sin comparación de elementos semánticamente equivalentes y estados computados.
