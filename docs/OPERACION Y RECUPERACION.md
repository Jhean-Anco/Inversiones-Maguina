# Operación, respaldo y recuperación

## Operación diaria

- Consultar salud y logs desde Dokploy. No escribir tokens o cadenas de conexión en logs.
- Revisar uso de memoria, disco, PostgreSQL, volumen de adjuntos, errores HTTP y expiración de certificados.
- Conservar el SHA completo y los digests desplegados por cada versión.
- No editar simultáneamente variables de Dokploy mientras el job CD cambia `DEPLOY_SHA`.
- Mantener SSH por claves y limitar el firewall del VPS a los puertos administrativos necesarios; web debe entrar por Traefik HTTPS y PostgreSQL no debe publicarse.

## Respaldos

El repositorio separa datos PostgreSQL (`postgres-data`) y adjuntos (`uploads-data`), pero el respaldo externo aún no está automatizado: falta elegir el proveedor y recibir credenciales de almacenamiento cifrado. Antes de habilitar tráfico productivo, programar respaldos consistentes de PostgreSQL con `pg_dump -Fc` y copia de `/data/uploads` en el mismo ciclo lógico; usar cifrado en tránsito y reposo, retención definida, monitoreo de fallos y una ubicación fuera del VPS. No respaldar únicamente los volúmenes Docker del mismo host.

Probar una restauración en una instancia aislada: restaurar la base y los adjuntos, verificar conteos/referencias y abrir documentos de prueba. Registrar fecha, versión, duración y resultado. No declarar un respaldo verificado solo porque el archivo existe.

## Recuperación

### Fallo de imagen o aplicación

1. Detener promociones nuevas y conservar logs del despliegue fallido.
2. Cambiar `DEPLOY_SHA` al SHA anterior conocido y redeplegar las imágenes inmutables.
3. Confirmar `/health` del API, la base, HTTPS de frontend y lectura de adjuntos.
4. No borrar volúmenes.

### Fallo o incompatibilidad de esquema

No ejecutar rollback automático ni `drizzle push`. Si la aplicación anterior no es compatible con el esquema ya migrado, detener escrituras siguiendo el procedimiento operativo aprobado y decidir entre una corrección hacia adelante o una restauración planificada. Restaurar base de datos solo con aprobación del responsable, respaldo comprobado y un plan separado para los adjuntos del mismo punto temporal.

## Pendientes que requieren acceso al VPS/plataforma

- Definir proveedor, cifrado y política de retención de respaldos; guardar credenciales solo en Dokploy.
- Verificar restauración real en staging separado.
- Verificar firewall, SSH por claves, rotación de logs y alertas de disco/memoria.
- Registrar contacto y autorización para un piloto NubeFact real.
