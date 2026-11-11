import { resolve } from "node:path";

type Ambiente = "development" | "test" | "production";

const texto = (nombre: string) => process.env[nombre]?.trim() ?? "";
const requerido = (nombre: string) => {
  const valor = texto(nombre);
  if (!valor) throw new Error(`Falta la variable requerida ${nombre}.`);
  return valor;
};

export const esProduccion = () => process.env.NODE_ENV === "production";

function enteroPositivo(nombre: string, defecto: number) {
  const valor = Number(texto(nombre) || defecto);
  if (!Number.isInteger(valor) || valor <= 0) throw new Error(`${nombre} debe ser un entero positivo.`);
  return valor;
}

export function validarConfiguracionEntorno() {
  const ambiente = (texto("NODE_ENV") || "development") as Ambiente;
  if (!["development", "test", "production"].includes(ambiente)) {
    throw new Error("NODE_ENV debe tener uno de estos valores: development, test o production.");
  }

  const puerto = Number(texto("PORT") || "3000");
  if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error("PORT debe ser un puerto válido.");
  const origenes = (texto("FRONTEND_ORIGIN") || (ambiente === "development" ? "http://localhost:5173" : ""))
    .split(",").map((origen) => origen.trim()).filter(Boolean);
  if (!origenes.length) throw new Error("Define FRONTEND_ORIGIN con el origen permitido del frontend.");
  for (const origen of origenes) {
    let url: URL;
    try { url = new URL(origen); } catch { throw new Error("FRONTEND_ORIGIN debe contener orígenes URL válidos separados por coma."); }
    if (url.origin !== origen) throw new Error("FRONTEND_ORIGIN debe contener solo el origen, sin ruta ni barra final.");
    if (ambiente === "production" && url.protocol !== "https:") throw new Error("FRONTEND_ORIGIN debe usar HTTPS en producción.");
  }

  const segundosSesion = enteroPositivo("AUTENTICACION_DURACION_SEGUNDOS", 8 * 60 * 60);
  const segundosSesionRecordada = enteroPositivo("AUTENTICACION_DURACION_RECORDAR_SEGUNDOS", 30 * 24 * 60 * 60);
  const timeoutNubefactMs = enteroPositivo("NUBEFACT_TIMEOUT_MS", 20000);
  const maximoImagenBytes = enteroPositivo("IMAGEN_MAXIMO_BYTES", 5 * 1024 * 1024);
  const carpetaSubidas = resolve(process.cwd(), texto("UPLOADS_DIR") || "storage");
  const descuentoMaximoPorcentaje = Number(texto("DESCUENTO_MAXIMO_PORCENTAJE") || (ambiente === "production" ? "0" : "100"));
  if (!Number.isFinite(descuentoMaximoPorcentaje) || descuentoMaximoPorcentaje < 0 || descuentoMaximoPorcentaje > 100) {
    throw new Error("DESCUENTO_MAXIMO_PORCENTAJE debe ser un número entre 0 y 100.");
  }

  if (ambiente === "production") {
    const urlBaseDatos = requerido("DATABASE_URL");
    try {
      const url = new URL(urlBaseDatos);
      if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:") || /^(localhost|127\.|0\.0\.0\.0|::1)$/i.test(url.hostname)) throw new Error();
    } catch { throw new Error("DATABASE_URL debe apuntar a PostgreSQL remoto de producción, no a localhost."); }
    const secreto = requerido("AUTENTICACION_SECRETO");
    if (secreto.length < 32 || /generar-un-secreto|cambiar|changeme|development|postgres/i.test(secreto)) {
      throw new Error("AUTENTICACION_SECRETO debe ser propio, aleatorio y tener al menos 32 caracteres en producción.");
    }
    const ruta = requerido("NUBEFACT_RUTA");
    try {
      const url = new URL(ruta);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch { throw new Error("NUBEFACT_RUTA debe ser una URL HTTPS válida en producción."); }
    requerido("NUBEFACT_TOKEN");
    if (!texto("UPLOADS_DIR") || !/^[A-Za-z]:[\\/]|^\//.test(texto("UPLOADS_DIR"))) {
      throw new Error("UPLOADS_DIR debe apuntar a un volumen persistente con ruta absoluta en producción.");
    }
  }


  const regimenTributario = texto("REGIMEN_TRIBUTARIO") || "NRUS";
  if (!["NRUS", "RER", "RMT", "GENERAL"].includes(regimenTributario)) throw new Error("REGIMEN_TRIBUTARIO debe ser NRUS, RER, RMT o GENERAL.");
  return { ambiente, puerto, origenes, segundosSesion, segundosSesionRecordada, timeoutNubefactMs, maximoImagenBytes, carpetaSubidas, descuentoMaximoPorcentaje };
}
