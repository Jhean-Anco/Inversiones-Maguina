import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useSesion } from "./use-sesion";
import { cerrarSesion, obtenerPerfil, type PerfilSesion } from "../services/autenticacion.service";

const navegar = vi.fn();
const ubicacion = vi.hoisted(() => ({ actual: { state: null as unknown } }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar, useLocation: () => ubicacion.actual }));
vi.mock("../services/autenticacion.service", () => ({ obtenerPerfil: vi.fn(), cerrarSesion: vi.fn() }));

const perfil: PerfilSesion = { id: "u1", nombreCompleto: "Ana", roles: ["ADMIN"], permisos: [] };

beforeEach(() => {
  navegar.mockReset();
  vi.mocked(obtenerPerfil).mockReset();
  vi.mocked(cerrarSesion).mockReset();
  ubicacion.actual = { state: null };
});

describe("useSesion", () => {
  it("reutiliza el perfil validado al iniciar sesión", () => {
    ubicacion.actual = { state: { datosInicio: { perfil } } };
    const { result } = renderHook(() => useSesion());
    expect(result.current.perfil).toEqual(perfil);
    expect(obtenerPerfil).not.toHaveBeenCalled();
  });

  it("consulta el perfil cuando se entra directamente", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil);
    ubicacion.actual = { state: { datosInicio: { perfil: null } } };
    const { result } = renderHook(() => useSesion());
    expect(result.current.perfil).toBeNull();
    await waitFor(() => expect(result.current.perfil).toEqual(perfil));
    expect(navegar).not.toHaveBeenCalled();
  });

  it("redirige al inicio de sesión si no hay sesión válida", async () => {
    vi.mocked(obtenerPerfil).mockRejectedValue(new Error("401"));
    renderHook(() => useSesion());
    await waitFor(() => expect(navegar).toHaveBeenCalledWith("/login", { replace: true }));
  });

  it("ignora el perfil que llega después de desmontar", async () => {
    let resolver!: (perfilActual: PerfilSesion) => void;
    vi.mocked(obtenerPerfil).mockReturnValue(new Promise((res) => { resolver = res; }));
    const { result, unmount } = renderHook(() => useSesion());
    unmount();
    await act(async () => { resolver(perfil); });
    expect(result.current.perfil).toBeNull();
  });

  it("cierra la sesión y vuelve al login aunque el servidor falle", async () => {
    vi.mocked(obtenerPerfil).mockResolvedValue(perfil);
    vi.mocked(cerrarSesion).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("caído"));
    const { result } = renderHook(() => useSesion());
    act(() => result.current.salir());
    await waitFor(() => expect(navegar).toHaveBeenCalledTimes(1));
    act(() => result.current.salir());
    await waitFor(() => expect(navegar).toHaveBeenCalledTimes(2));
    expect(navegar).toHaveBeenLastCalledWith("/login", { replace: true });
    expect(cerrarSesion).toHaveBeenCalledTimes(2);
  });
});
