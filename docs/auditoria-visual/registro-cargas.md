# Registro de cargas y errores visuales

**Estado:** en curso. Se registran tiempos solo cuando la operación y el estado final se observan con marcas reproducibles.

| Ruta | Acción | Tiempo observado | Estado de carga | Resultado | Incidencia |
|---|---|---|---|---|---|
| `/login` | Navegar a la página | No medido con reloj de inicio/fin de render estable | Formulario renderizado | Vista visible en desktop y móvil | Ninguna confirmada |
| `/inventario/productos` | Abrir “Nuevo repuesto” | No medido | Formulario con desplazamiento interno; pie con acciones fijo | Diálogo visible; no se envió | Ninguna confirmada |
| `/ingresos/ordenes-servicio` | Abrir y cancelar editor vacío | No medido | Editor visible; cancelación posterior | Se cerró sin guardar | Ninguna confirmada |
| `/ingresos/ventas/repuestos` | Abrir formulario vacío | No medido | Formulario con 8 campos | Se dejó sin completar ni enviar | Ninguna confirmada |
| `/ingresos/nuevo` | Esperar redirección al módulo | 1,5 s y repetición a 2 s | Sin `aria-busy` ni progressbar al final | `/ingresos/nuevo/repuestos`; body estable en longitud 1235 | Ninguna; duración real de carga no medida |
| `/inventario/productos` | Búsqueda local ficticia y restauración | Conteo cambió 10→0→10 entre lecturas inmediatas y final | No se verificó loader visible estable | Conteo final volvió a 10; no se clasifica incidencia | Resultado transitorio; pendiente repetir con espera por contenido estable |

En varias páginas se esperó aproximadamente 2,4 s y a `document.fonts.ready` antes de medir y capturar. Ese intervalo fue una espera de estabilización, no una medición del tiempo de carga de cada ruta. No se detectó ni comparó de forma sistemática la duración de loaders.

No se ejecutaron guardados ni acciones que persistan datos. Los errores de consola referidos por agentes aún no se atribuyen a la aplicación hasta contrastar fuente y contexto de extensión.
