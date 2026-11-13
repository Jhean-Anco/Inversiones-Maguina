# 20. Proceso de versiones

Crear una rama, implementar y abrir un PR a `main`. Los controles obligatorios verifican calidad e imágenes antes de fusionar. El pipeline también se ejecuta en cada push de rama.

Después de aprobar un commit de `main`, se publican imágenes con su SHA y, si está habilitado el despliegue, se promueven a la etiqueta de producción. API y frontend deben reportar el mismo SHA en sus endpoints de versión.

El intento automático de recuperación restaura etiquetas de imágenes anteriores. No revierte cambios de esquema ni reemplaza un respaldo de PostgreSQL y archivos.
