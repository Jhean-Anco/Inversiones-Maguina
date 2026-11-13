# 09. Integraciones externas

**Propósito:** diferenciar conexión implementada de conexión validada. **Estado:** código inspeccionado; proveedores reales no contactados en esta documentación.

| Servicio | Uso visible | Configuración | Evidencia/limitación |
|---|---|---|---|
| NubeFact | emisión, consulta, notas/anulaciones y descarga de documentos | `NUBEFACT_RUTA`, `NUBEFACT_TOKEN`, timeout; series en DB | solicitudes `fetch` y manejo de estados en servicios; requiere endpoint/token válidos |
| SUNAT SIRE | OAuth y consultas de propuestas/libro electrónico | RUC, usuario/clave SOL, client ID/secret | servicio usa API SIRE y errores controlados; no se verificó autorización real |
| API Perú | consulta de identidad/RUC | `APIS_PERU_TOKEN` | utilidad de consulta; servicio externo y cuota no probados |

No se encontró módulo activo de Google Drive en la lista de módulos raíz, pese a existir directorio con ese nombre; una migración de activos/carpetas no prueba integración funcional. No se documentan otros proveedores sin llamadas comprobadas.

**Fuentes:** `ingresos.service.ts`, `sunat-sire.service.ts`, `consulta-identidad-peru.ts`, `almacenamiento.service.ts`, `.env.example`. **Limitación:** sin credenciales, respuestas simuladas de CI o tráfico real no se asigna estado funcional del proveedor.
