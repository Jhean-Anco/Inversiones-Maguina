# 09. Integraciones externas

**Propósito:** diferenciar conexión implementada de conexión validada. **Estado:** código inspeccionado; proveedores reales no contactados en esta documentación.

| Servicio | Uso visible | Configuración | Evidencia/limitación |
|---|---|---|---|
| NubeFact | emisión, consulta, notas/anulaciones y descarga de documentos | `NUBEFACT_RUTA`, `NUBEFACT_TOKEN`, timeout; series en DB | solicitudes `fetch` y manejo de estados en servicios; requiere endpoint/token válidos |
| API Perú | consulta de identidad/RUC | `APIS_PERU_TOKEN` | utilidad de consulta; servicio externo y cuota no probados |

No se encontró módulo activo de Google Drive en la lista de módulos raíz, pese a existir directorio con ese nombre; una migración de activos/carpetas no prueba integración funcional. No se documentan otros proveedores sin llamadas comprobadas.

## Seguimiento de documentos pendientes en SUNAT

Tras emitir, la API hace unas consultas rápidas si NubeFact responde antes que SUNAT. Después, `ServicioSeguimientoNubefact` consulta en segundo plano boletas, facturas, notas, bajas y guías pendientes con espera creciente, aplica el resultado y descarga el PDF, XML y CDR que falten. Estado, intentos y último error quedan en la tabla `nubefact_seguimientos`; varias instancias se reparten las filas con `FOR UPDATE SKIP LOCKED`.

Revisión manual de lo agotado: `select * from nubefact_seguimientos where estado = 'AGOTADO';`. Para reabrir una fila ya corregida: `update nubefact_seguimientos set estado = 'ACTIVO', creado_en = now(), proximo_intento = now() where id = ...;`.

**Fuentes:** `ingresos.service.ts`, `consulta-identidad-peru.ts`, `almacenamiento.service.ts`, `.env.example`. **Limitación:** sin credenciales, respuestas simuladas de CI o tráfico real no se asigna estado funcional del proveedor.
