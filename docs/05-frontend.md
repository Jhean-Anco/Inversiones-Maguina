# 05. Frontend

**Propósito:** describir navegación e integración HTTP observables en código. **Verificación:** inspección estática; no se recorrió la aplicación en navegador.

React 19, Vite 7 y React Router 7. `apps/web/src/main/main.tsx` declara acceso `/login`, rutas de inicio, ingresos, egresos, inventario, reportes, clientes, proveedores y conductores, además de redirecciones de compatibilidad. Muchas rutas se renderizan mediante `InicioPage`; por ello la ruta declarada no basta para afirmar que un formulario u operación está completo. `/` redirige a `/login`; rutas desconocidas también.

El cliente HTTP está en `apps/web/src/services/api-cliente.ts` y toma `VITE_API_URL`; el valor vacío habilita URL relativa. Vite valida URL y exige HTTPS, con excepción de loopback HTTP local. La API configura CORS con credenciales. Las pantallas/autorización efectivas dependen de los componentes y menús dentro de `InicioPage` y de la API, no solo de este router.

**Fuentes:** `apps/web/src/main/main.tsx`, `src/services/api-cliente.ts`, `vite.config.ts`, `package.json`. **Limitación:** estado visual, accesibilidad y flujos autenticados requieren prueba de navegador.
