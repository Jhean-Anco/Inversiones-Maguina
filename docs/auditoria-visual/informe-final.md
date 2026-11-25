# Informe de auditoría visual integral

**Estado: borrador en curso.** No representa una auditoría completa y no debe usarse como certificación de todas las rutas.

## Resumen provisional

- Router fuente: 37 declaraciones `<Route>` incluidas redirecciones y ruta comodín.
- Login: inspeccionado en desktop y en móvil 360×800 / 390×844; controles vacíos en capturas.
- Productos: se observó listado a 390×844 y la apertura sin envío del formulario “Nuevo repuesto”.
- Se observaron 39 URLs/estados: 23 rutas de módulo, 4 destinos de formulario, 10 aliases y `/mototaxis/garantias`; además, `/dashboard` redirigió a `/login`. Cada una de las 37 declaraciones del router tiene al menos un resultado de navegación, pero las pantallas y acciones no están auditadas por completo.
- Login y Productos se midieron en los siete viewports solicitados; existen capturas de los estados iniciales y el perfil responsive tiene la limitación descrita en `auditoria-responsive.md`.
- Rutas auditadas por completo: 0; hay vistas parcialmente inspeccionadas.
- Hallazgos visuales confirmados: ninguno hasta cerrar la verificación de los candidatos en revisión.

## Cobertura pendiente

Contrastar todas las rutas declaradas con la navegación real, inventariar controles/estados por vista, completar resoluciones y orientación, inspeccionar hover/focus/disabled/loading, validar capturas enmascaradas y probar estados vacíos/errores sin persistir cambios. Consultar `matriz-cobertura.md` e `inventario-rutas.md` para el detalle actualizado.

## Límite de esta etapa

La auditoría no modifica frontend, backend, permisos ni datos. El árbol de trabajo ya tenía cambios sin commit antes de iniciar; se preservan. Los entregables se completarán a medida que avance la inspección.
