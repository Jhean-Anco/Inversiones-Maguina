import { useEffect, useSyncExternalStore } from "react";

type EstadoMenu = { id: string | null; fase: "cerrado" | "abriendo" | "abierto" | "cerrando"; siguiente: string | null };

const estadoCerrado: EstadoMenu = { id: null, fase: "cerrado", siguiente: null };
let estado: EstadoMenu = estadoCerrado;
let temporizador: number | undefined;
const suscriptores = new Set<() => void>();

function publicar(nuevo: EstadoMenu) {
  estado = nuevo;
  suscriptores.forEach((suscriptor) => suscriptor());
}

function suscribirse(suscriptor: () => void) {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

function cerrarTemporizador() {
  if (temporizador !== undefined) window.clearTimeout(temporizador);
}

function terminarTransicion() {
  temporizador = undefined;
  if (estado.fase === "cerrando") {
    if (estado.siguiente) {
      const siguiente = estado.siguiente;
      publicar({ id: siguiente, fase: "abriendo", siguiente: null });
      temporizador = window.setTimeout(() => {
        temporizador = undefined;
        if (estado.id === siguiente && estado.fase === "abriendo") publicar({ id: siguiente, fase: "abierto", siguiente: null });
      }, 160);
    } else publicar(estadoCerrado);
  } else if (estado.fase === "abriendo" && estado.id) publicar({ ...estado, fase: "abierto" });
}

function iniciarCierre(siguiente: string | null = null) {
  cerrarTemporizador();
  publicar({ ...estado, fase: "cerrando", siguiente });
  temporizador = window.setTimeout(terminarTransicion, 140);
}

function alternarMenu(id: string) {
  if (estado.id === id && (estado.fase === "abierto" || estado.fase === "abriendo")) {
    iniciarCierre();
    return;
  }
  if (estado.id === id && estado.fase === "cerrando") {
    cerrarTemporizador();
    publicar({ id, fase: "abierto", siguiente: null });
    return;
  }
  if (estado.fase === "cerrando") {
    publicar({ ...estado, siguiente: id });
    return;
  }
  if (estado.id) {
    iniciarCierre(id);
    return;
  }
  publicar({ id, fase: "abriendo", siguiente: null });
  temporizador = window.setTimeout(() => {
    temporizador = undefined;
    if (estado.id === id && estado.fase === "abriendo") publicar({ id, fase: "abierto", siguiente: null });
  }, 160);
}

function cerrarMenu(id: string) {
  if (estado.id === id && estado.fase !== "cerrando") iniciarCierre();
  else if (estado.id === id && estado.fase === "cerrando" && estado.siguiente) iniciarCierre();
}

export function useMenuAccionExclusivo(id: string) {
  const actual = useSyncExternalStore(suscribirse, () => estado, () => estadoCerrado);
  useEffect(() => {
    const alPresionarTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cerrarMenu(id);
    };
    window.addEventListener("keydown", alPresionarTecla);
    return () => {
      window.removeEventListener("keydown", alPresionarTecla);
      if (estado.id === id) {
        cerrarTemporizador();
        publicar(estadoCerrado);
      }
    };
  }, [id]);
  return {
    abierto: actual.id === id && actual.fase !== "cerrando",
    presente: actual.id === id,
    fase: actual.id === id ? actual.fase : "cerrado",
    alternar: () => alternarMenu(id),
    cerrar: () => cerrarMenu(id),
  } as const;
}
