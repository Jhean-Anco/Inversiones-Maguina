import "reflect-metadata";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import { ModuloAplicacion } from "./modulo-aplicacion";
import { validarConfiguracionEntorno } from "./configuracion-entorno";

function cargarEntornoLocal() {
  const archivo = [resolve(process.cwd(), ".env"), resolve(process.cwd(), "..", "..", ".env")].find(existsSync);
  if (archivo) process.loadEnvFile(archivo);
}

async function iniciar() {
  cargarEntornoLocal();
  const configuracion = validarConfiguracionEntorno();
  const app = await NestFactory.create<NestFastifyApplication>(
    ModuloAplicacion,
    new FastifyAdapter({ trustProxy: process.env.TRUST_PROXY === "true" }),
  );

  await app.register(cookie);
  await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1, fields: 0 } });
  app.enableCors({
    origin: configuracion.origenes,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  app.enableShutdownHooks();
  await app.listen(configuracion.puerto, "0.0.0.0");
}

void iniciar();
