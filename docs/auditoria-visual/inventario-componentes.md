# Inventario de componentes visuales e interactivos

**Estado:** parcial; los patrones fuente son hipótesis para comparar hasta contar con inspección del DOM en la vista correspondiente.

| Patrón | Componentes/fuentes | Patrón declarado | Revisión visual |
|---|---|---|---|
| Tokens globales | `apps/web/src/main/index.css` | Paleta ERP, Inter/Segoe UI, radios 8/12/16 px, espaciado 4–24 px | Login inspeccionado en desktop y móvil; faltan vistas autenticadas |
| Botón de sistema | `components/ui/button.tsx` | CVA/Tailwind; tamaños sm 36, default 40, lg 44, icon 40 px | Comparación transversal pendiente |
| Botón de icono/acción | `components/ui/boton-accion.tsx` | Tamaños propios 30/34/40 px | Pendiente |
| Botones por página | Componentes de `pages/` y `components/` | Hay clases locales además de las variantes compartidas | Pendiente |
| Formularios flotantes | `main/formularios-flotantes.css` y diálogos por módulo | Reglas compartidas y reglas responsive específicas | Diálogo Nuevo repuesto observado en móvil; contraste con otros diálogos pendiente |
| Tabla/listado | `components/ui/listado-maestro/` y tablas por página | Tabla compartida con alternativas y estilos locales | Productos: tabla con desplazamiento horizontal interno; semántica/intención por comprobar |
| Responsive | `utilidades/viewport.ts`, `main/main.tsx` | Perfil en `html[data-responsive-profile]`, media y container queries | Perfil observado en login; validar por módulo y orientación pendiente |
| Carga/notificaciones | `components/ui/estado-global/`, `notificacion-flotante/` | Estados compartidos declarados | Pendiente de observar durante operaciones seguras |
| Formulario de producto | `components/productos/producto-formulario/` | Dialog con secciones e inputs agrupados | A 390×844: panel de 390×844, contenido desplazable de ~1611 px y pie fijo con Cancelar/Crear; no se envió |
| Dashboard | `pages/dashboard-page/` | Tarjetas y gráficos | 6 tarjetas/artículos observados en móvil; la lectura de datos sensibles se mantiene fuera del informe |
| Cuentas financieras | `pages/finanzas-page/` | Tabla de cuentas, resumen y acciones por registro | 3 filas y acciones Editar/Desactivar observadas en móvil; no se activaron |
| Series | `pages/configuracion-series-page/` | Tabla de series y acciones de configuración | 5 registros observados; no se modificó configuración |
| Reportes | `pages/reportes-page/` | Selector, Consultar, tablas y gráficas | Inventario con tabla de 20 filas; ingresos con 3 tablas; pendiente revisar todos los estados de consulta |

## Login observado

- A 390×844: tarjeta 366×562 px; campos 318×44 px; botón principal 318×46 px; no se observó scroll horizontal del documento.
- A 360×800: tarjeta 336×556 px; campos 291×44 px; botón principal 291×46 px; controles dentro del viewport.
- En desktop 1536×690: tarjeta medida en torno a 440 px de ancho y campos en torno a 362×49 px en una captura del estado inicial. Faltan comparaciones equivalentes entre rutas.
- Las capturas de login guardadas tienen los campos vacíos.
- Las listas móviles de Clientes, Proveedores y Conductores muestran búsqueda y paginación; no se usaron acciones de edición.
