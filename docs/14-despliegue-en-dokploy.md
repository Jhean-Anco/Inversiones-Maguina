# 14. Despliegue en Dokploy

`compose.prod.yaml` usa imágenes GHCR con la etiqueta `production` y política de descarga siempre, la red externa `dokploy-network` y las variables de base de datos, autenticación e integraciones configuradas en Dokploy.

Tras las pruebas y la publicación de imágenes por SHA en `main`, el job de despliegue promueve las imágenes aprobadas, solicita `compose.deploy` y comprueba el SHA de la API y del frontend. El flujo crea y verifica etiquetas Git `ci-deploy-<SHA>` y configura Dokploy para clonar la etiqueta aprobada. La actualización no vuelve a escribir el entorno de Dokploy. El job necesita permisos de escritura de contenidos para crear las etiquetas. Son necesarios los secretos `DOKPLOY_URL`, `DOKPLOY_API_KEY` y `DOKPLOY_COMPOSE_ID`, y la variable `PRODUCTION_DEPLOY_ENABLED`.

No ejecutar despliegues manuales durante la promoción de imágenes. Verificar la disponibilidad de imágenes anteriores y copias de seguridad antes de cambios de base de datos. Restaurar imágenes no deshace migraciones.
