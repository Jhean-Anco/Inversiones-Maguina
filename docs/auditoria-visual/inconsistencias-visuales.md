# Inconsistencias visuales

**Estado:** en curso. Solo se registran defectos confirmados con evidencia estable y reproducible.

## Confirmadas

Por ahora, ninguna. Se retiró una primera sospecha de compresión del panel en Productos: la captura inicial correspondía a un estado transitorio y la medición estable mostró el aside fuera de pantalla y el contenedor ocupando 390 px.

## Pendientes de reproducir o valorar

- En inspecciones DOM de `/clientes` y `/personas/conductores` se reportó un aside abierto que reducía el ancho de la vista; las capturas estables enmascaradas de Clientes, Proveedores y Conductores muestran el aside cerrado y el contenido completo. Por la contradicción no se confirma el hallazgo; requiere una reproducción sincronizada.
- En `/inventario/productos`, la tabla se midió alrededor de 640 px dentro de un contenedor de aproximadamente 349 px y permite desplazamiento horizontal interno. Falta decidir si es un patrón intencional y confirmar el acceso real a acciones de columnas derechas; no se clasifica como defecto por ahora.
- En Clientes, Proveedores y Conductores las capturas estables a 390×844 muestran el campo de búsqueda cerca de y=485 px y la tabla cerca de y=578 px, con una zona vacía amplia entre encabezado y búsqueda. Comparar con listados equivalentes antes de clasificarlo.
- En pruebas automatizadas de resize, el valor de `html[data-responsive-profile]` fue inconsistente entre sesiones/tamaños, mientras el viewport reportado cambiaba. Como el código actualiza el atributo al escuchar `resize` y en `requestAnimationFrame`, falta verificar que la herramienta dispare el evento; no es un defecto confirmado.
- En una búsqueda ficticia/restauración de Productos el conteo transitorio pasó de 10 a 0 y después volvió a 10 en la lectura final. El resultado no se espera estable de forma consistente todavía; no se reporta como defecto hasta medir el ciclo completo y reproducirlo.

## Falsos positivos descartados

- `/inventario/productos`, 390×844: la primera lectura midió el aside abierto durante una transición; la captura estable muestra aside cerrado y ancho completo. No reportar como defecto confirmado.
