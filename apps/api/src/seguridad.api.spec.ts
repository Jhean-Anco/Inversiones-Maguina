import assert from "node:assert/strict";
import { test } from "node:test";

const base = process.env.API_BASE_URL;
assert.ok(base, "API_BASE_URL debe apuntar a la API local iniciada por CI.");

async function solicitar(ruta: string, init?: RequestInit) {
  return fetch(new URL(ruta, base), { redirect: "manual", ...init });
}

test("health confirma que la API real puede consultar PostgreSQL", async () => {
  const respuesta = await solicitar("/health");
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), {
    estado: "ok",
    servicio: "api",
    baseDatos: "ok",
  });
});

test("el perfil autenticado rechaza la solicitud sin cookie", async () => {
  const respuesta = await solicitar("/autenticacion/yo");
  assert.equal(respuesta.status, 401);
  const cuerpo = await respuesta.json();
  assert.equal("usuario" in cuerpo, false);
  assert.equal("token" in cuerpo, false);
});

test("el perfil autenticado rechaza una cookie JWT inválida", async () => {
  const respuesta = await solicitar("/autenticacion/yo", {
    headers: { cookie: "magina_sesion=token-falso-de-prueba" },
  });
  assert.equal(respuesta.status, 401);
  const cuerpo = await respuesta.json();
  assert.equal("token" in cuerpo, false);
});

test("las rutas de inventario protegidas rechazan acceso anónimo", async () => {
  const respuesta = await solicitar("/inventario/productos");
  assert.equal(respuesta.status, 401);
});

test("el inicio de sesión valida el cuerpo antes de consultar credenciales", async () => {
  const respuesta = await solicitar("/autenticacion/iniciar-sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ usuario: 42, contrasena: null }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = await respuesta.json();
  assert.equal("token" in cuerpo, false);
});

test("un usuario sintético inexistente no recibe una sesión ni revela configuración", async () => {
  const respuesta = await solicitar("/autenticacion/iniciar-sesion", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      usuario: "usuario-inexistente-qa",
      contrasena: "clave-ficticia-que-no-es-secreto",
    }),
  });
  assert.equal(respuesta.status, 401);
  assert.equal(respuesta.headers.has("set-cookie"), false);
  const texto = await respuesta.text();
  assert.equal(texto.includes("ci-only-random-secret-value"), false);
  assert.equal(texto.toLowerCase().includes("token"), false);
});

test("cerrar sesión elimina la cookie con atributos seguros", async () => {
  const respuesta = await solicitar("/autenticacion/cerrar-sesion", { method: "POST" });
  assert.equal(respuesta.status, 200);
  const cookie = respuesta.headers.get("set-cookie") ?? "";
  assert.match(cookie, /magina_sesion=/i);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.match(cookie, /Max-Age=0/i);
});

test("CORS permite el origen configurado y no habilita un origen arbitrario", async () => {
  const permitida = await solicitar("/inventario/productos", {
    method: "OPTIONS",
    headers: {
      origin: "http://localhost:5173",
      "access-control-request-method": "GET",
    },
  });
  assert.equal(permitida.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(permitida.headers.get("access-control-allow-credentials"), "true");

  const rechazada = await solicitar("/inventario/productos", {
    method: "OPTIONS",
    headers: {
      origin: "https://origen-no-autorizado.invalid",
      "access-control-request-method": "GET",
    },
  });
  assert.equal(rechazada.headers.has("access-control-allow-origin"), false);
});
