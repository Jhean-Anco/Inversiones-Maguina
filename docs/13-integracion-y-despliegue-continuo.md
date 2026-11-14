# 13. Integración y despliegue continuo

El pipeline ejecuta calidad e imágenes en cada push de rama y en PR dirigidos a `main` o `feature/docker-cicd-production`. Incluye pruebas unitarias, integración, API, seguridad y E2E; además construye y analiza las imágenes de API, operaciones y frontend.

En un push a `main`, publica imágenes etiquetadas con el SHA aprobado. Si `PRODUCTION_DEPLOY_ENABLED` está habilitado, comprueba la versión de `main`, la salud de producción y la disponibilidad de las imágenes anterior y nueva; promueve las tres etiquetas de producción y solicita el despliegue a Dokploy. El script no modifica las variables del entorno de Dokploy.

El flujo espera que API y frontend reporten el SHA aprobado. Ante un fallo después de empezar la promoción, intenta recuperar las imágenes anteriores y comprobarlas. La recuperación de imágenes **no revierte migraciones ni restaura datos**.
