import "./main.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "../pages/login-page/login-page";
import { InicioPage } from "../pages/inicio-page/inicio-page";
import { TemaProvider } from "../components/tema-contexto/tema-contexto";
import "./tema-oscuro.css";

function App() {
  return (
    <TemaProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/inicio" element={<InicioPage />} />
          <Route path="/mi-perfil" element={<InicioPage />} />
          <Route path="/finanzas/cuentas" element={<InicioPage />} />
          <Route path="/drive" element={<Navigate to="/inicio" replace />} />
          <Route path="/boveda" element={<Navigate to="/inicio" replace />} />
          <Route path="/ingresos/nuevo" element={<Navigate to="/ingresos/nuevo/repuestos" replace />} />
          <Route path="/ingresos/nuevo/repuestos" element={<InicioPage />} />
          <Route path="/ingresos/nuevo/mototaxis" element={<InicioPage />} />
          <Route path="/ingresos/guias" element={<InicioPage />} />
          <Route path="/ingresos/ventas/repuestos" element={<InicioPage />} />
          <Route path="/ingresos/ventas/mototaxis" element={<InicioPage />} />
          <Route path="/reportes/inventario" element={<InicioPage />} />
          <Route path="/reportes/ingresos" element={<InicioPage />} />
          <Route path="/clientes" element={<InicioPage />} />
          <Route path="/personas/proveedores" element={<InicioPage />} />
          <Route path="/personas/conductores" element={<InicioPage />} />
          <Route path="/inventario/categorias" element={<InicioPage />} />
          <Route path="/inventario/marcas" element={<InicioPage />} />
          <Route path="/inventario/productos" element={<InicioPage />} />
          <Route path="/inventario/precios" element={<Navigate to="/inventario/productos" replace />} />
          <Route path="/inventario/mototaxis" element={<InicioPage />} />
          <Route path="/inventario/mototaxis/unidades" element={<InicioPage />} />
          <Route path="/mototaxis" element={<Navigate to="/inventario/mototaxis" replace />} />
          <Route path="/mototaxis/resumen" element={<Navigate to="/inventario/mototaxis" replace />} />
          <Route path="/mototaxis/modelos" element={<Navigate to="/inventario/mototaxis" replace />} />
          <Route path="/mototaxis/unidades" element={<Navigate to="/inventario/mototaxis/unidades" replace />} />
          <Route path="/mototaxis/:seccion" element={<InicioPage />} />
          <Route path="/egresos/compras" element={<InicioPage />} />
          <Route path="/egresos/gastos-operativos" element={<InicioPage />} />
          <Route path="/egresos/activos-herramientas" element={<InicioPage />} />
          <Route path="/egresos/mototaxis" element={<Navigate to="/mototaxis/compras" replace />} />
          <Route path="/inventario/entradas-stock" element={<Navigate to="/egresos/compras" replace />} />
          <Route path="/inventario/movimientos-ajustes" element={<InicioPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </TemaProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
