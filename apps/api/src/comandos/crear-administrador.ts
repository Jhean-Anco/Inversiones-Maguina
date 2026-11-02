import { input, password, select } from "@inquirer/prompts";
import * as argon2 from "argon2";
import { eq, or, sql } from "drizzle-orm";
import {
  cargos,
  cerrarBaseDatos,
  db,
  personas,
  personasContactos,
  roles,
  tiposContacto,
  tiposDocumento,
  tiposPersona,
  trabajadores,
  usuarios,
  usuariosRoles,
} from "@magina/database";

async function crearAdministrador() {
  const [tipoNatural] = await db.select().from(tiposPersona).where(eq(tiposPersona.codigo, "NATURAL")).limit(1);
  const [rolAdministrador] = await db.select().from(roles).where(eq(roles.codigo, "ADMINISTRADOR")).limit(1);
  const [cargoAdministrador] = await db.select().from(cargos).where(eq(cargos.codigo, "ADMINISTRADOR")).limit(1);
  const [contactoCorreo] = await db.select().from(tiposContacto).where(eq(tiposContacto.codigo, "CORREO_ELECTRONICO")).limit(1);
  const documentos = await db.select({
    id: tiposDocumento.id,
    codigo: tiposDocumento.codigo,
    nombre: tiposDocumento.nombre,
    longitudMinima: tiposDocumento.longitudMinima,
    longitudMaxima: tiposDocumento.longitudMaxima,
    soloNumeros: tiposDocumento.soloNumeros,
  })
    .from(tiposDocumento)
    .where(eq(tiposDocumento.activo, true));

  if (!tipoNatural || !rolAdministrador || !documentos.length) {
    throw new Error("Faltan catálogos iniciales. Aplica primero las migraciones de la base de datos.");
  }

  const [administradorExistente] = await db
    .select({ id: usuariosRoles.usuarioId })
    .from(usuariosRoles)
    .innerJoin(roles, eq(usuariosRoles.rolId, roles.id))
    .where(eq(roles.codigo, "ADMINISTRADOR"))
    .limit(1);
  if (administradorExistente) {
    throw new Error("Ya existe una cuenta con el rol Administrador. No se creó otra cuenta.");
  }

  const nombres = (await input({ message: "Nombres", validate: (valor) => valor.trim().length > 0 || "Ingresa los nombres." })).trim();
  const apellidoPaterno = (await input({ message: "Apellido paterno", validate: (valor) => valor.trim().length > 0 || "Ingresa el apellido paterno." })).trim();
  const apellidoMaterno = (await input({ message: "Apellido materno (opcional)" })).trim() || null;
  const tipoDocumentoId = await select({
    message: "Tipo de documento",
    choices: documentos.map((documento) => ({ value: documento.id, name: `${documento.codigo} · ${documento.nombre}` })),
  });
  const documentoSeleccionado = documentos.find(({ id }) => id === tipoDocumentoId)!;
  const numeroDocumento = (await input({
    message: "Número de documento",
    validate: (valor) => {
      const numero = valor.trim();
      if (!numero) return "Ingresa el número de documento.";
      if (documentoSeleccionado.soloNumeros && !/^\d+$/.test(numero)) return "Este documento solo acepta números.";
      if (documentoSeleccionado.longitudMinima && numero.length < documentoSeleccionado.longitudMinima) return `Ingresa al menos ${documentoSeleccionado.longitudMinima} caracteres.`;
      if (documentoSeleccionado.longitudMaxima && numero.length > documentoSeleccionado.longitudMaxima) return `Ingresa como máximo ${documentoSeleccionado.longitudMaxima} caracteres.`;
      return true;
    },
  })).trim();
  const nombreUsuario = (await input({ message: "Nombre de usuario", validate: (valor) => valor.trim().length >= 3 || "Usa al menos 3 caracteres." })).trim();
  const correo = (await input({
    message: "Correo electrónico",
    validate: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()) || "Ingresa un correo válido.",
  })).trim().toLocaleLowerCase("es-PE");
  const clave = await password({
    message: "Contraseña inicial (mínimo 12 caracteres; no se mostrará)",
    validate: (valor) => valor.length >= 12 || "La contraseña debe tener al menos 12 caracteres.",
  });
  const confirmarClave = await password({ message: "Repite la contraseña" });
  if (clave !== confirmarClave) throw new Error("Las contraseñas no coinciden; no se creó la cuenta.");

  const [usuarioDuplicado] = await db.select({ id: usuarios.id })
    .from(usuarios)
    .where(or(
      eq(sql`lower(${usuarios.nombreUsuario})`, nombreUsuario.toLocaleLowerCase("es-PE")),
      eq(sql`lower(${usuarios.correo})`, correo),
    ))
    .limit(1);
  if (usuarioDuplicado) throw new Error("El usuario o correo ya está registrado.");

  const hash = await argon2.hash(clave);
  const fechaIngreso = new Date().toISOString().slice(0, 10);

  await db.transaction(async (tx) => {
    const [persona] = await tx.insert(personas).values({
      tipoPersonaId: tipoNatural.id,
      nombres,
      apellidoPaterno,
      apellidoMaterno,
      tipoDocumentoId,
      numeroDocumento,
    }).returning({ id: personas.id });

    if (contactoCorreo) {
      await tx.insert(personasContactos).values({
        personaId: persona.id,
        tipoContactoId: contactoCorreo.id,
        valor: correo,
        esPrincipal: true,
      });
    }

    await tx.insert(trabajadores).values({
      personaId: persona.id,
      cargoId: cargoAdministrador?.id ?? null,
      fechaIngreso,
    });

    const [usuario] = await tx.insert(usuarios).values({
      trabajadorId: persona.id,
      nombreUsuario,
      correo,
      contrasenaHash: hash,
      activo: true,
      requiereCambioContrasena: false,
    }).returning({ id: usuarios.id });

    await tx.insert(usuariosRoles).values({
      usuarioId: usuario.id,
      rolId: rolAdministrador.id,
    });
  });

  console.log("Cuenta administradora creada. Ya puedes iniciar sesión en el sistema.");
}

crearAdministrador()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "No se pudo crear el administrador.");
    process.exitCode = 1;
  })
  .finally(cerrarBaseDatos);
