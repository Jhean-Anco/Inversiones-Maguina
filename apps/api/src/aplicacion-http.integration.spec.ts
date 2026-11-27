import "reflect-metadata";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { NestFactory, Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import { ModuloAplicacion } from "./modulo-aplicacion";
import { validarConfiguracionEntorno } from "./configuracion-entorno";
import { ContextoPostgres, fechaHoyPeru, sumarDias, type UsuarioPrueba } from "./pruebas/contexto-postgres";
import { ControladorAutenticacion } from "./modulos/autenticacion/autenticacion.controller";
import { ModuloAutenticacion } from "./modulos/autenticacion/autenticacion.module";
import { ServicioAutenticacion } from "./modulos/autenticacion/autenticacion.service";
import { GuardiaPermiso } from "./modulos/autenticacion/guardia-permiso";
import { GuardiaSesion } from "./modulos/autenticacion/guardia-sesion";
import { RequierePermiso } from "./modulos/autenticacion/permisos";
import { ControladorArchivosLocales } from "./modulos/almacenamiento/almacenamiento.controller";
import { ServicioAlmacenamiento } from "./modulos/almacenamiento/almacenamiento.service";
import { ControladorMototaxisInventario } from "./modulos/egresos/egresos.controller";
import { ServicioEgresos } from "./modulos/egresos/egresos.service";
import { ControladorFinanzas } from "./modulos/finanzas/finanzas.controller";
import { ServicioFinanzas } from "./modulos/finanzas/finanzas.service";
import { ControladorIngresos } from "./modulos/ingresos/ingresos.controller";
import { ServicioIngresos } from "./modulos/ingresos/ingresos.service";
import { ControladorCategorias } from "./modulos/inventario/categorias.controller";
import { ServicioCategorias } from "./modulos/inventario/categorias.service";
import { ControladorEntradasStock } from "./modulos/inventario/entradas-stock.controller";
import { ServicioEntradasStock } from "./modulos/inventario/entradas-stock.service";
import { ControladorMarcas } from "./modulos/inventario/marcas.controller";
import { ServicioMarcas } from "./modulos/inventario/marcas.service";
import { ControladorMovimientosStock } from "./modulos/inventario/movimientos-stock.controller";
import { ServicioMovimientosStock } from "./modulos/inventario/movimientos-stock.service";
import { ControladorProductos } from "./modulos/inventario/productos.controller";
import { ServicioProductos } from "./modulos/inventario/productos.service";
import { ControladorMototaxis } from "./modulos/mototaxis/mototaxis.controller";
import { ServicioMototaxis } from "./modulos/mototaxis/mototaxis.service";
import { ControladorDirectorioProveedores } from "./modulos/mototaxis/proveedores.controller";
import { ControladorConductores } from "./modulos/personas/conductores.controller";
import { ServicioConductores } from "./modulos/personas/conductores.service";
import { ControladorTransportistas } from "./modulos/personas/transportistas.controller";
import { ServicioTransportistas } from "./modulos/personas/transportistas.service";
import { ControladorReportes } from "./modulos/reportes/reportes.controller";
import { ServicioMetas } from "./modulos/reportes/metas.service";
import { ServicioReportes } from "./modulos/reportes/reportes.service";

/**
 * tsx (esbuild) no emite `design:paramtypes`, que Nest usa para resolver dependencias por constructor.
 * El build real con `tsc` sí lo emite; aquí se declara a mano para arrancar la misma aplicación en memoria.
 */
const dependencias: Array<[object, unknown[]]> = [
  [ControladorAutenticacion, [ServicioAutenticacion]], [ServicioAutenticacion, [JwtService]],
  [GuardiaSesion, [JwtService]], [GuardiaPermiso, [Reflector]],
  [ControladorArchivosLocales, [ServicioAlmacenamiento]], [ControladorMototaxisInventario, [ServicioEgresos]],
  [ControladorFinanzas, [ServicioFinanzas]], [ControladorIngresos, [ServicioIngresos]], [ServicioIngresos, [ServicioAlmacenamiento]],
  [ControladorCategorias, [ServicioCategorias]], [ControladorMarcas, [ServicioMarcas]], [ControladorProductos, [ServicioProductos]],
  [ControladorEntradasStock, [ServicioEntradasStock]], [ControladorMovimientosStock, [ServicioMovimientosStock]],
  [ControladorMototaxis, [ServicioMototaxis]], [ControladorDirectorioProveedores, [ServicioMototaxis]],
  [ControladorConductores, [ServicioConductores]], [ControladorTransportistas, [ServicioTransportistas]],
  [ControladorReportes, [ServicioReportes, ServicioMetas]],
];
for (const [clase, tipos] of dependencias) Reflect.defineMetadata("design:paramtypes", tipos, clase);

let contexto: ContextoPostgres;
let app: NestFastifyApplication;
let administrador: UsuarioPrueba;
let lector: UsuarioPrueba;
let sinPermisos: UsuarioPrueba;
let cookieAdministrador: string;
const hoy = fechaHoyPeru();
const inicioAnio = `${hoy.slice(0, 4)}-01-01`;

type Respuesta = { statusCode: number; headers: Record<string, unknown>; body: string; json: () => any };

async function solicitar(metodo: "GET" | "POST" | "PUT" | "PATCH", url: string, opciones: { cuerpo?: unknown; cookie?: string } = {}): Promise<Respuesta> {
  return app.inject({
    method: metodo, url,
    headers: { ...(opciones.cookie ? { cookie: opciones.cookie } : {}), ...(opciones.cuerpo === undefined ? {} : { "content-type": "application/json" }) },
    ...(opciones.cuerpo === undefined ? {} : { payload: JSON.stringify(opciones.cuerpo) }),
  }) as unknown as Promise<Respuesta>;
}

async function iniciarSesion(usuario: UsuarioPrueba, recordar = false) {
  const respuesta = await solicitar("POST", "/autenticacion/iniciar-sesion", { cuerpo: { usuario: usuario.nombreUsuario.toUpperCase(), contrasena: usuario.contrasena, recordar } });
  assert.equal(respuesta.statusCode, 200, respuesta.body);
  const cabecera = respuesta.headers["set-cookie"];
  const valor = Array.isArray(cabecera) ? cabecera[0] : String(cabecera);
  return { respuesta, cookie: valor.split(";")[0], cabecera: valor };
}

function contextoHttp(solicitud: Record<string, unknown>, manejador: () => void = () => undefined, clase: object = class {}) {
  return {
    getHandler: () => manejador,
    getClass: () => clase,
    switchToHttp: () => ({ getRequest: () => solicitud }),
  } as unknown as ExecutionContext;
}

before(async () => {
  contexto = await ContextoPostgres.crear();
  const todos = (await contexto.sql.unsafe<{ codigo: string }[]>("SELECT codigo FROM permisos")).map((fila) => fila.codigo);
  administrador = await contexto.crearUsuario(todos);
  lector = await contexto.crearUsuario(["INGRESOS.LEER"]);
  sinPermisos = await contexto.crearUsuario([]);
  app = await NestFactory.create<NestFastifyApplication>(ModuloAplicacion, new FastifyAdapter(), { logger: false });
  await app.register(cookie);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  cookieAdministrador = (await iniciarSesion(administrador)).cookie;
});

after(async () => {
  if (app) await app.close();
  if (contexto) await contexto.cerrar();
});

describe("salud y sesión", () => {
  test("health informa PostgreSQL disponible y 503 cuando la consulta falla", async () => {
    const ok = await solicitar("GET", "/health");
    assert.equal(ok.statusCode, 200);
    assert.deepEqual(ok.json(), { estado: "ok", servicio: "api", baseDatos: "ok", buildSha: process.env.MAGINA_BUILD_SHA || "local" });

    const original = contexto.db.execute;
    contexto.db.execute = (() => Promise.reject(new Error("caída simulada"))) as unknown as typeof original;
    try {
      const caida = await solicitar("GET", "/health");
      assert.equal(caida.statusCode, 503);
      assert.equal(caida.json().baseDatos, "no_disponible");
    } finally {
      contexto.db.execute = original;
    }
  });

  test("el inicio de sesión valida el cuerpo y rechaza credenciales incorrectas", async () => {
    assert.equal((await solicitar("POST", "/autenticacion/iniciar-sesion", { cuerpo: { usuario: 1, contrasena: "x" } })).statusCode, 400);
    const incorrecta = await solicitar("POST", "/autenticacion/iniciar-sesion", { cuerpo: { usuario: administrador.nombreUsuario, contrasena: "incorrecta" } });
    assert.equal(incorrecta.statusCode, 401);
    assert.equal(incorrecta.headers["set-cookie"], undefined);
    const inexistente = await solicitar("POST", "/autenticacion/iniciar-sesion", { cuerpo: { usuario: `no-existe-${randomUUID()}`, contrasena: "x" } });
    assert.equal(inexistente.statusCode, 401);
  });

  test("la sesión se abre por correo, respeta 'recordar' y expone el perfil con permisos", async () => {
    const configuracion = validarConfiguracionEntorno();
    const corta = await iniciarSesion(administrador);
    assert.match(corta.cabecera, new RegExp(`Max-Age=${configuracion.segundosSesion}`));
    assert.match(corta.cabecera, /HttpOnly/);
    const larga = await iniciarSesion({ ...administrador, nombreUsuario: administrador.correo }, true);
    assert.match(larga.cabecera, new RegExp(`Max-Age=${configuracion.segundosSesionRecordada}`));
    const cuerpo = larga.respuesta.json();
    assert.equal(cuerpo.usuario.id, administrador.id);
    assert.ok(cuerpo.usuario.permisos.includes("FINANZAS.ADMINISTRAR"));
    assert.equal("token" in cuerpo, false);

    const perfil = await solicitar("GET", "/autenticacion/yo", { cookie: larga.cookie });
    assert.equal(perfil.statusCode, 200);
    assert.equal(perfil.json().usuario.nombreCompleto, `QA ${contexto.sufijo} Pruebas`);
    const [acceso] = await contexto.sql.unsafe<{ ultimo_acceso_en: Date | null }[]>("SELECT ultimo_acceso_en FROM usuarios WHERE id = $1", [administrador.id]);
    assert.ok(acceso.ultimo_acceso_en, `último acceso: ${String(acceso.ultimo_acceso_en)}`);

    const cierre = await solicitar("POST", "/autenticacion/cerrar-sesion");
    assert.equal(cierre.statusCode, 200);
    assert.match(String(cierre.headers["set-cookie"]), /magina_sesion=;.*Max-Age=0/);
  });

  test("la guardia de sesión rechaza cookies ausentes, inválidas y cuentas desactivadas", async () => {
    assert.equal((await solicitar("GET", "/autenticacion/yo")).statusCode, 401);
    assert.equal((await solicitar("GET", "/autenticacion/yo", { cookie: "magina_sesion=token-falso" })).statusCode, 401);
    const temporal = await contexto.crearUsuario(["INGRESOS.LEER"]);
    const { cookie: sesion } = await iniciarSesion(temporal);
    await contexto.sql.unsafe("UPDATE usuarios SET activo = false WHERE id = $1", [temporal.id]);
    const respuesta = await solicitar("GET", "/autenticacion/yo", { cookie: sesion });
    assert.equal(respuesta.statusCode, 401);
    assert.match(respuesta.json().message, /ya no está disponible/);
    const relogin = await solicitar("POST", "/autenticacion/iniciar-sesion", { cuerpo: { usuario: temporal.nombreUsuario, contrasena: temporal.contrasena } });
    assert.equal(relogin.statusCode, 401);
  });

  test("el perfil responde 401 si la cuenta deja de estar disponible tras validar la sesión", async () => {
    const controlador = new ControladorAutenticacion({ obtenerPerfil: async () => null } as unknown as ServicioAutenticacion);
    await assert.rejects(controlador.obtenerSesion({ id: randomUUID() }), UnauthorizedException);
  });

  test("el módulo de autenticación exige un secreto JWT de al menos 32 caracteres", () => {
    const imports = Reflect.getMetadata("imports", ModuloAutenticacion) as Array<{ providers?: Array<{ useFactory?: () => unknown }> }>;
    const fabrica = imports.flatMap((modulo) => modulo.providers ?? []).find((proveedor) => typeof proveedor.useFactory === "function")?.useFactory;
    assert.ok(fabrica);
    const secreto = process.env.AUTENTICACION_SECRETO;
    try {
      process.env.AUTENTICACION_SECRETO = "corto";
      assert.throws(() => fabrica(), /al menos 32 caracteres/);
      delete process.env.AUTENTICACION_SECRETO;
      assert.throws(() => fabrica(), /al menos 32 caracteres/);
    } finally {
      process.env.AUTENTICACION_SECRETO = secreto;
    }
    assert.deepEqual(fabrica(), { secret: secreto, signOptions: { expiresIn: validarConfiguracionEntorno().segundosSesion } });
  });
});

describe("guardia de permisos", () => {
  test("niega rutas sin el permiso requerido y permite rutas sin requisito", async () => {
    const { cookie: sesionLector } = await iniciarSesion(lector);
    const denegada = await solicitar("GET", "/inventario/productos", { cookie: sesionLector });
    assert.equal(denegada.statusCode, 403);
    assert.match(denegada.json().message, /no tiene permiso/);

    const resumenLector = (await solicitar("GET", "/reportes/resumen", { cookie: sesionLector })).json();
    assert.ok("ventasHoy" in resumenLector);
    assert.equal("inventario" in resumenLector, false);
    assert.equal("clientesActivos" in resumenLector, false);

    const { cookie: sesionVacia } = await iniciarSesion(sinPermisos);
    const resumenVacio = await solicitar("GET", "/reportes/resumen", { cookie: sesionVacia });
    assert.equal(resumenVacio.statusCode, 200);
    assert.deepEqual(Object.keys(resumenVacio.json()), ["generadoPara"]);
    assert.equal((await solicitar("GET", "/finanzas/cuentas/opciones", { cookie: sesionVacia })).statusCode, 403);
  });

  test("ignora roles inactivos y exige un usuario autenticado en la solicitud", async () => {
    const inactivo = await contexto.crearUsuario(["INVENTARIO.LEER"], { rolActivo: false });
    const { cookie: sesion } = await iniciarSesion(inactivo);
    assert.equal((await solicitar("GET", "/inventario/categorias", { cookie: sesion })).statusCode, 403);

    const guardia = new GuardiaPermiso(new Reflector());
    await assert.rejects(guardia.canActivate(contextoHttp({})), ForbiddenException);
    class Protegido { @RequierePermiso("INVENTARIO.LEER") accion() { return true; } }
    const solicitud: Record<string, any> = { usuario: { id: administrador.id } };
    assert.equal(await guardia.canActivate(contextoHttp(solicitud, Protegido.prototype.accion, Protegido)), true);
    assert.ok(solicitud.usuario.permisos.includes("INVENTARIO.LEER"));
  });

  test("la guardia de sesión deja el usuario autenticado en la solicitud", async () => {
    const jwt = app.get(JwtService);
    const guardia = new GuardiaSesion(jwt);
    const solicitud: Record<string, any> = { cookies: { magina_sesion: await jwt.signAsync({ sub: administrador.id }) } };
    assert.equal(await guardia.canActivate(contextoHttp(solicitud)), true);
    assert.deepEqual(solicitud.usuario, { id: administrador.id });
    await assert.rejects(guardia.canActivate(contextoHttp({})), UnauthorizedException);
  });
});

describe("rutas protegidas con un usuario administrador", () => {
  const get = (url: string) => solicitar("GET", url, { cookie: cookieAdministrador });
  const enviar = (metodo: "POST" | "PUT" | "PATCH", url: string, cuerpo: unknown) => solicitar(metodo, url, { cookie: cookieAdministrador, cuerpo });
  const idAleatorio = () => randomUUID();

  test("inventario: categorías, marcas y productos", async () => {
    const categoria = await enviar("POST", "/inventario/categorias", { nombre: `QA HTTP ${contexto.sufijo}` });
    assert.equal(categoria.statusCode, 201);
    contexto.categorias.push(categoria.json().id);
    assert.equal((await enviar("PATCH", `/inventario/categorias/${categoria.json().id}`, { descripcion: "Editada" })).json().descripcion, "Editada");
    assert.ok((await get("/inventario/categorias")).json().some((item: { id: string }) => item.id === categoria.json().id));

    const marca = await enviar("POST", "/inventario/marcas", { nombre: `QA HTTP ${contexto.sufijo}` });
    assert.equal(marca.statusCode, 201);
    contexto.marcas.push(marca.json().id);
    assert.equal((await enviar("PATCH", `/inventario/marcas/${marca.json().id}`, { uso: "AMBOS" })).json().uso, "AMBOS");
    assert.equal((await get("/inventario/marcas")).statusCode, 200);

    const producto = await enviar("POST", "/inventario/productos", { nombre: "Repuesto HTTP", categoriaId: categoria.json().id, marcaId: marca.json().id, unidadBaseCodigo: "NIU", afectacionIgv: "GRAVADO" });
    assert.equal(producto.statusCode, 201, producto.body);
    const id = producto.json().id;
    const presentacionId = producto.json().presentaciones[0].id;
    const listaGeneral = await contexto.idCatalogo("tipos_listas_precio", "GENERAL");
    assert.equal((await enviar("PATCH", `/inventario/productos/${id}`, { nombre: "Repuesto HTTP editado", categoriaId: categoria.json().id, marcaId: marca.json().id, unidadBaseCodigo: "NIU", afectacionIgv: "EXONERADO" })).json().afectacionIgv, "EXONERADO");
    const precio = await enviar("POST", `/inventario/productos/${id}/precios`, { presentacionId, tipoListaPrecioId: listaGeneral, precio: "12.50" });
    assert.equal(precio.statusCode, 201, precio.body);
    const correccion = await enviar("PATCH", `/inventario/productos/${id}/precios/${precio.json().id}`, { precio: "12.50", precioAnterior: "12.50" });
    assert.equal(correccion.json().id, precio.json().id);
    assert.equal((await get("/inventario/productos/catalogos")).json().tiposListasPrecio.length > 0, true);
    assert.equal((await get("/inventario/productos/alertas-stock-bajo?pagina=1&porPagina=5")).statusCode, 200);
    assert.equal((await get(`/inventario/productos?busqueda=${encodeURIComponent("Repuesto HTTP")}`)).json().total >= 1, true);
    assert.equal((await get(`/inventario/productos/precios?marca=${marca.json().id}`)).json().total, 1);
    assert.deepEqual((await get(`/inventario/productos/${id}/costos-compra`)).json(), { ultima: null, promedioPonderado: null });
    assert.deepEqual((await get(`/inventario/productos/${id}/historial`)).json(), { movimientos: [], compra: null, venta: null });
    assert.equal((await get(`/inventario/productos/${id}`)).json().nombre, "Repuesto HTTP editado");
    assert.deepEqual((await enviar("PATCH", `/inventario/productos/${id}/estado`, { activo: false })).json(), { id, activo: false });
    assert.equal((await get(`/inventario/productos/${idAleatorio()}`)).statusCode, 404);
  });

  test("inventario: entradas y movimientos de stock validan sus datos", async () => {
    assert.deepEqual((await get("/inventario/entradas-stock/productos?busqueda=ab")).json(), []);
    assert.equal((await get("/inventario/entradas-stock?estadoPago=PAGADAS")).statusCode, 200);
    assert.equal((await get(`/inventario/entradas-stock/${idAleatorio()}`)).statusCode, 404);
    assert.equal((await enviar("POST", "/inventario/entradas-stock", [])).statusCode, 400);
    assert.equal((await enviar("POST", "/inventario/entradas-stock", { fecha: "2026-02-30" })).statusCode, 400);
    assert.deepEqual((await get("/inventario/movimientos-stock/productos?busqueda=a")).json(), []);
    assert.equal((await get("/inventario/movimientos-stock?tipo=AJUSTE")).statusCode, 200);
    assert.equal((await enviar("POST", "/inventario/movimientos-stock/ajustes", { productoId: "x" })).statusCode, 400);
  });

  test("compras de mototaxi como egreso validan el cuerpo antes del servicio", async () => {
    assert.equal((await get("/inventario/mototaxis?pagina=1")).statusCode, 200);
    assert.equal((await enviar("POST", "/inventario/mototaxis", [])).statusCode, 400);
    assert.equal((await enviar("POST", "/inventario/mototaxis", { fecha: "fecha" })).statusCode, 400);
    assert.equal((await enviar("POST", `/inventario/mototaxis/${idAleatorio()}/pagos`, [])).statusCode, 400);
    assert.equal((await enviar("POST", `/inventario/mototaxis/${idAleatorio()}/pagos`, { fechaPago: "x" })).statusCode, 400);
  });

  test("finanzas: cuentas, resumen, flujo y movimientos", async () => {
    const creada = await enviar("POST", "/finanzas/cuentas", { tipo: "EFECTIVO", nombre: `Caja HTTP ${contexto.sufijo}` });
    assert.equal(creada.statusCode, 201);
    const id = creada.json().id;
    assert.equal((await enviar("PATCH", `/finanzas/cuentas/${id}`, { tipo: "EFECTIVO", nombre: "Caja HTTP editada" })).json().nombre, "Caja HTTP editada");
    assert.equal((await enviar("PATCH", `/finanzas/cuentas/${id}/estado`, { activa: false })).json().activa, false);
    assert.ok((await get("/finanzas/cuentas")).json().some((cuenta: { id: string }) => cuenta.id === id));
    assert.equal((await get("/finanzas/cuentas/opciones")).json().some((cuenta: { id: string }) => cuenta.id === id), false);
    assert.equal((await get("/finanzas/cuentas/resumen")).json().periodo, hoy.slice(0, 7));
    assert.equal((await get("/finanzas/cuentas/flujo")).statusCode, 400);
    assert.equal((await get("/finanzas/cuentas/flujo?periodo=SEMANA")).json().periodo, "SEMANA");
    assert.equal((await get(`/finanzas/cuentas/composicion?desde=${inicioAnio}&hasta=${hoy}`)).json().desde, inicioAnio);
    assert.equal((await get("/finanzas/cuentas/composicion?desde=2026-13-01&hasta=2026-01-01")).statusCode, 400);
    assert.equal((await get("/finanzas/cuentas/movimientos?periodo=DIA")).statusCode, 400);
    assert.equal((await get(`/finanzas/cuentas/movimientos?periodo=DIA&fecha=${hoy}&cuentaId=${id}`)).json().totalMovimientos, 0);
  });

  test("personas: conductores, transportistas, proveedores y consulta de identidad", async () => {
    assert.equal((await get("/personas/conductores?busqueda=QA")).statusCode, 200);
    assert.equal((await get("/personas/conductores/listado?pagina=1")).json().pagina, 1);
    assert.equal((await enviar("POST", "/personas/conductores", { tipoDocumento: "DNI" })).statusCode, 400);
    assert.equal((await enviar("PATCH", `/personas/conductores/${idAleatorio()}`, { numeroLicencia: "Q12345678" })).statusCode, 404);
    assert.equal((await get("/personas/transportistas")).statusCode, 200);
    assert.equal((await enviar("POST", "/personas/transportistas", { numeroDocumento: "123" })).statusCode, 400);
    assert.equal((await get("/personas/proveedores?busqueda=QA")).statusCode, 200);
    assert.equal((await get("/personas/proveedores/listado?porPagina=5")).json().porPagina, 5);
    assert.equal((await get(`/personas/proveedores/${idAleatorio()}/ficha`)).statusCode, 404);
    assert.equal((await enviar("POST", "/personas/proveedores", { tipoDocumento: "CE" })).statusCode, 400);

    const fetchOriginal = globalThis.fetch;
    const tokenOriginal = process.env.APIS_PERU_TOKEN;
    process.env.APIS_PERU_TOKEN = "token-sintetico";
    globalThis.fetch = (async () => Response.json({ success: true, nombres: "Ana", apellidoPaterno: "Prueba", apellidoMaterno: "Sintética" })) as typeof fetch;
    try {
      const identidad = await get("/personas/consulta-identidad?tipoDocumento=DNI&numeroDocumento=12345678");
      assert.equal(identidad.statusCode, 200);
      assert.equal(identidad.json().nombres, "Ana");
    } finally {
      globalThis.fetch = fetchOriginal;
      if (tokenOriginal === undefined) delete process.env.APIS_PERU_TOKEN; else process.env.APIS_PERU_TOKEN = tokenOriginal;
    }
  });

  test("mototaxis: catálogo, compras, inventario y garantías", async () => {
    const marca = await enviar("POST", "/mototaxis/marcas", { nombre: `QA Moto HTTP ${contexto.sufijo}` });
    assert.equal(marca.statusCode, 201);
    contexto.marcas.push(marca.json().id);
    assert.ok((await get("/mototaxis/marcas")).json().some((item: { id: string }) => item.id === marca.json().id));
    const modelo = await enviar("POST", "/mototaxis/modelos", { marcaId: marca.json().id, nombre: "Modelo HTTP" });
    assert.equal(modelo.statusCode, 201, modelo.body);
    const modeloId = modelo.json().id;
    assert.equal((await enviar("PATCH", `/mototaxis/modelos/${modeloId}`, { marcaId: marca.json().id, nombre: "Modelo HTTP", version: "V2" })).json().version, "V2");
    assert.ok((await get("/mototaxis/modelos?busqueda=Modelo%20HTTP&incluirInactivos=true")).json().some((item: { id: string }) => item.id === modeloId));
    assert.equal((await get(`/mototaxis/modelos/${modeloId}/analisis`)).json().modelo.id, modeloId);
    assert.equal((await get(`/mototaxis/modelos/${modeloId}/garantia`)).json(), null);
    assert.equal((await enviar("PUT", `/mototaxis/modelos/${modeloId}/garantia`, { activa: true, mesesVigencia: 12, alcance: "Motor y chasis" })).json().mesesVigencia, 12);
    assert.equal((await enviar("POST", `/mototaxis/ventas/${idAleatorio()}/garantia`, {})).statusCode, 400);
    assert.equal((await enviar("PATCH", `/mototaxis/modelos/${modeloId}/precio-venta`, { precioVenta: 5000 })).json().precioVenta, "5000.00");
    const [precio] = (await get(`/mototaxis/modelos/${modeloId}/precios`)).json();
    assert.equal((await enviar("PATCH", `/mototaxis/modelos/${modeloId}/precios/${precio.id}`, { precioVenta: 5000, precioAnterior: 5000 })).statusCode, 200);
    assert.equal((await get("/mototaxis/proveedores?busqueda=QA")).statusCode, 200);
    assert.equal((await enviar("POST", "/mototaxis/proveedores", [])).statusCode, 400);
    assert.equal((await get("/mototaxis/compras?busqueda=QA")).statusCode, 200);
    assert.equal((await enviar("POST", "/mototaxis/compras", {})).statusCode, 400);
    assert.equal((await enviar("POST", `/mototaxis/compras/${idAleatorio()}/pagos`, {})).statusCode, 400);
    assert.deepEqual((await get(`/mototaxis/compras/${idAleatorio()}/pagos`)).json(), []);
    assert.equal((await get("/mototaxis/unidades?estado=DISPONIBLE&pagina=1&porPagina=24")).json().porPagina, 24);
    assert.equal((await get("/mototaxis/ajustes-inventario")).statusCode, 200);
    assert.equal((await get(`/mototaxis/ajustes-inventario/${modeloId}/reconteo`)).json().cantidadSistema, 0);
    assert.equal((await enviar("POST", "/mototaxis/ajustes-inventario", { modeloId, cantidadContada: 2, motivo: "Conteo HTTP" })).json().cantidadContada, 2);
    assert.deepEqual((await get(`/mototaxis/unidades/${idAleatorio()}/movimientos`)).json(), []);
    assert.equal((await get("/mototaxis/garantias")).statusCode, 200);
    assert.equal((await get("/mototaxis/reclamos")).statusCode, 200);
    assert.equal((await enviar("POST", "/mototaxis/reclamos", { garantiaId: "x" })).statusCode, 400);
    assert.equal((await enviar("PATCH", `/mototaxis/reclamos/${idAleatorio()}/estado`, { estado: "ENVIADO", estadoAnterior: "ABIERTO" })).statusCode, 409);
  });

  test("reportes: rangos, límites, metas y resumen gerencial", async () => {
    const rango = `desde=${inicioAnio}&hasta=${hoy}`;
    assert.equal((await get(`/reportes/ingresos/dashboard?${rango}&mesDesde=${hoy.slice(0, 8)}01`)).json().anual.rango.desde, inicioAnio);
    assert.equal((await get(`/reportes/ingresos/reporte?${rango}&linea=MOTOTAXI`)).json().linea, "MOTOTAXI");
    assert.equal((await get(`/reportes/ingresos/reporte?${rango}&linea=OTRA`)).statusCode, 400);
    assert.equal((await get(`/reportes/ingresos/comparativo?${rango}`)).statusCode, 200);
    const largo = `desde=2020-01-01&hasta=${hoy}`;
    assert.equal((await get(`/reportes/ingresos/comparativo?${largo}`)).statusCode, 400);
    assert.equal((await get(`/reportes/ingresos/horarios?${largo}`)).statusCode, 400);
    assert.equal((await get(`/reportes/ingresos/horarios?${rango}`)).json().rango.hasta, hoy);
    assert.ok(Array.isArray((await get(`/reportes/ingresos/rentabilidad?${rango}`)).json().filas));
    assert.equal((await get(`/reportes/ingresos/cobranza?${rango}`)).statusCode, 200);
    assert.equal((await get(`/reportes/ingresos/articulos?${rango}`)).statusCode, 200);
    assert.equal((await get("/reportes/ingresos/cobranza?desde=2026-01-01")).statusCode, 400);
    assert.equal((await get(`/reportes/inventario?desde=${sumarDias(hoy, -7)}&hasta=${hoy}`)).json().mototaxis !== undefined, true);
    const meta = await enviar("PUT", "/reportes/metas?periodo=1999-01", { indicador: "COBRANZA", periodo: "1999-01", valor: 75 });
    assert.equal(meta.statusCode, 200);
    assert.deepEqual(meta.json().metas.COBRANZA, { valor: 75, origen: "MES" });
    assert.deepEqual((await get("/reportes/metas?periodo=1999-01")).json().metas.COBRANZA, { valor: 75, origen: "MES" });
    const resumen = (await get("/reportes/resumen")).json();
    assert.ok(["ventasHoy", "clientesActivos", "inventario", "inventarioMototaxis"].every((clave) => clave in resumen));
  });

  test("archivos registrados se sirven solo con permiso y con cabeceras de descarga segura", async () => {
    const almacenamiento = app.get(ServicioAlmacenamiento);
    const archivo = await almacenamiento.guardarArchivo("OTRO", "PRUEBA", "QA", randomUUID(), "reporte prueba.txt", "text/plain", Buffer.from("contenido sintético"));
    contexto.archivos.push(archivo.id);
    const respuesta = await get(archivo.ruta);
    assert.equal(respuesta.statusCode, 200);
    assert.equal(respuesta.body, "contenido sintético");
    assert.match(String(respuesta.headers["content-disposition"]), /filename\*=UTF-8''reporte%20prueba\.txt/);
    assert.equal(respuesta.headers["cache-control"], "private, max-age=3600");
    const { cookie: sesionVacia } = await iniciarSesion(sinPermisos);
    assert.equal((await solicitar("GET", archivo.ruta, { cookie: sesionVacia })).statusCode, 403);
  });
});
