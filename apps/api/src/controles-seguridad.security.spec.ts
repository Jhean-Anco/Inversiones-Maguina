import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.API_BASE_URL;
assert.ok(base, "API_BASE_URL debe apuntar a la API local iniciada por CI.");

test("un identificador manipulado no omite el control de sesión", async () => {
  const respuesta = await fetch(new URL("/inventario/productos/00000000-0000-0000-0000-000000000001", base));
  assert.equal(respuesta.status, 401);
});

test("una cookie de sesión manipulada no obtiene acceso ni crea una sesión nueva", async () => {
  const respuesta = await fetch(new URL("/finanzas/cuentas", base), {
    headers: { cookie: "magina_sesion=eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9." },
  });
  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.headers.has("set-cookie"), false);
  const cuerpo = await respuesta.text();
  assert.equal(cuerpo.includes("ci-only-random-secret"), false);
});

test("un origen hostil no recibe permiso CORS con credenciales", async () => {
  const respuesta = await fetch(new URL("/autenticacion/yo", base), {
    method: "OPTIONS",
    headers: {
      origin: "https://sitio-hostil.invalid",
      "access-control-request-method": "GET",
    },
  });
  assert.equal(respuesta.headers.has("access-control-allow-origin"), false);
  assert.equal(respuesta.headers.has("access-control-allow-credentials"), false);
});

test("fallar autenticación no devuelve tokens ni secretos del servidor", async () => {
  const respuesta = await fetch(new URL("/autenticacion/iniciar-sesion", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ usuario: "prueba-seguridad-inexistente", contrasena: "clave-ficticia" }),
  });
  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.headers.has("set-cookie"), false);
  const cuerpo = await respuesta.text();
  assert.equal(cuerpo.toLowerCase().includes("token"), false);
  assert.equal(cuerpo.includes("ci-only-random-secret"), false);
});
