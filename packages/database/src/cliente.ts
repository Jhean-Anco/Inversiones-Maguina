import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as esquema from "./esquema/index.js";

const rutaEnvLocal = resolve(dirname(fileURLToPath(import.meta.url)), "../../..", ".env");
config({ path: rutaEnvLocal });

const cadenaConexion = process.env.DATABASE_URL;
if (!cadenaConexion) throw new Error("Falta DATABASE_URL para conectar a PostgreSQL.");

const maximoConexiones = Number(process.env.DATABASE_POOL_MAX ?? "10");
const tiempoInactivoSegundos = Number(process.env.DATABASE_IDLE_TIMEOUT_SECONDS ?? "20");
if (!Number.isInteger(maximoConexiones) || maximoConexiones < 1 || maximoConexiones > 100) throw new Error("DATABASE_POOL_MAX debe ser un entero entre 1 y 100.");
if (!Number.isInteger(tiempoInactivoSegundos) || tiempoInactivoSegundos < 1 || tiempoInactivoSegundos > 3600) throw new Error("DATABASE_IDLE_TIMEOUT_SECONDS debe ser un entero entre 1 y 3600.");

export const clientePostgres = postgres(cadenaConexion, { max: maximoConexiones, idle_timeout: tiempoInactivoSegundos });
export const db = drizzle(clientePostgres, { schema: esquema });

export async function cerrarBaseDatos() {
  await clientePostgres.end({ timeout: 5 });
}
