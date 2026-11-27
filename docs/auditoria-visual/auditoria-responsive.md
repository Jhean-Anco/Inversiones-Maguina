# Auditoría responsive

**Estado:** en curso. Resoluciones aún no cubiertas en todas las rutas; no inferir el comportamiento global desde login.

## Medidas realizadas

| Ruta | Viewport | Perfil | Evidencia observada | Estado |
|---|---:|---|---|---|
| `/login` | 360×800 | mobile-portrait | Tarjeta 336×556 px; campos y botón dentro del viewport; `scrollWidth=360` | Inspeccionada |
| `/login` | 390×844 | mobile-portrait | Tarjeta 366×562 px; campos y botón dentro del viewport; `scrollWidth=390` | Inspeccionada |
| `/inventario/productos` | 360×800 | mobile-portrait | Captura anonimizada; lista y controles visibles; scroll horizontal interno de tabla | Parcial |
| `/inventario/productos` | 390×844 | mobile-portrait | Captura estable; aside visualmente cerrado y lista a ancho completo | Parcial |
| `/login` | 768×1024 | Pendiente de lectura estable | Captura/medición provisional de tarjeta y campos disponible, pero la secuencia de resize no esperó a cada cambio de perfil | No certificada |
| `/login` | 1024×768 | Pendiente de lectura estable | Idem | No certificada |
| `/login` | 1280×800 | Pendiente de lectura estable | Idem | No certificada |
| `/login` | 1440×900 | Pendiente de lectura estable | Idem | No certificada |
| `/login` | 1920×1080 | Pendiente de lectura estable | Idem | No certificada |
| `/inventario/productos` | 390×844 | mobile-portrait | Aside fuera de pantalla tras estabilizar; listados dentro del viewport con tabla de desplazamiento interno | Parcial |
| `/inventario/productos` | 390×844 | mobile-portrait | Diálogo Nuevo repuesto ocupa el viewport; scroll interno y pie Cancelar/Crear visible | Parcial |
| `/clientes` | 390×844 | mobile-portrait | Captura estable muestra aside cerrado y vista completa; evaluaciones DOM contradictorias requieren reproducción sincronizada | Parcial |
| `/personas/proveedores` | 390×844 | mobile-portrait | Búsqueda/tablas visibles; tabla con scroll interno; gran espacio sobre el campo de búsqueda | Parcial |
| `/personas/conductores` | 390×844 | mobile-portrait | Búsqueda/tablas visibles; tabla con scroll interno; gran espacio sobre el campo de búsqueda | Parcial |
| `/inicio`, `/finanzas/cuentas`, `/configuracion/series`, `/reportes/inventario`, `/reportes/ingresos` | 390×844 | mobile-portrait | Vistas capturadas; se desenfocaron tarjetas, importes y filas | Parcial |
| `/ingresos/ordenes-servicio`, `/ingresos/cotizaciones`, `/ingresos/ventas/repuestos`, `/ingresos/ventas/mototaxis`, `/ingresos/guias` | 1440×900 | laptop | Listas y acciones visibles; no se activaron operaciones externas | Parcial |
| `/egresos/compras` | 1536×690 | laptop | Lista observada; botón principal 56×56 px | Parcial |

El login no presentó desbordamiento global ni controles fuera de pantalla en las dos medidas móviles revisadas. Las capturas de Clientes, Proveedores y Conductores muestran el contenido dentro del viewport, pero falta comparar el espacio vertical antes de la búsqueda con otros listados equivalentes. Las tablas de Productos, Proveedores y Conductores usan desplazamiento interno; falta comprobar la experiencia de las columnas de acciones.

## Medidas del listado de productos

Playwright recorrió los siete viewports pedidos; en todos, `scrollWidth` coincidió con el ancho del viewport y `scrollHeight` con el alto. Las cajas son viewport-relative en CSS px:

| Viewport | Scroll doc. (W×H) | Título (x,y,w,h) | Búsqueda (x,y,w,h) | Botón de acción (x,y,w,h) |
|---|---|---|---|---|
| 360×800 | 360×800 | 96,18,107,23 | 34,193,292,42 | 286,726,56,56 |
| 390×844 | 390×844 | 108,17,113,24 | 34,193,323,42 | 317,770,56,56 |
| 768×1024 | 768×1024 | 287,19,134,29 | 37,120,383,42 | 689,937,56,56 |
| 1024×768 | 1024×768 | 415,19,134,29 | 37,120,451,42 | 938,689,56,56 |
| 1280×800 | 1280×800 | 534,17,151,32 | 37,120,707,42 | 1186,720,56,56 |
| 1440×900 | 1440×900 | 605,15,169,36 | 37,120,867,42 | 1341,817,56,56 |
| 1920×1080 | 1920×1080 | 844,15,171,37 | 37,120,1347,42 | 1820,992,56,56 |

El segundo control observado en la zona inferior midió 36×34 px en 360/390 y 98×34 px desde 768. A 1280×800 la búsqueda y el selector midieron 42 px de alto; el botón de acción, 56 px. Se comprobó foco visible con outline de 2,4 px y hover con cambio de sombra, sin activar acciones.

## Limitación sobre perfiles

El atributo `data-responsive-profile` de `html` no se pudo validar de forma concluyente con el resize automatizado: en ejecuciones distintas quedó con valores distintos aunque `innerWidth` cambiaba y las capturas mostraban la página redimensionada. El código lo actualiza al recibir `resize` y dentro de `requestAnimationFrame`. Según el clasificador fuente, los perfiles esperados son mobile-portrait (360/390), tablet-portrait (768×1024), tablet-landscape (1024×768) y laptop (1280/1440/1920). No se declara defecto por esta discrepancia hasta verificar el evento con un navegador interactivo.

## Pendiente

La cobertura actual se concentra en 390×844 y 1440×900 (además de vistas puntuales a 1536×690). Comprobar las siete resoluciones solicitadas y los puntos de cambio por módulo; incluir orientación horizontal, modales, tablas y acciones de cada vista relevante.
