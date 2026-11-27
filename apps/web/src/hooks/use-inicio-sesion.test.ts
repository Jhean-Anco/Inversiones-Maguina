import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useInicioSesion } from "./use-inicio-sesion";
import { ErrorApi } from "../services/api-cliente";
import { iniciarSesion, obtenerPerfil } from "../services/autenticacion.service";
import { servicioDashboard } from "../services/dashboard.service";

const navegar = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navegar }));
vi.mock("../services/autenticacion.service", () => ({ iniciarSesion: vi.fn(), obtenerPerfil: vi.fn() }));
vi.mock("../services/dashboard.service", () => ({ servicioDashboard: { resumen: vi.fn() } }));

const credenciales = { usuario: "ana", contrasena: "secreta", recordar: true };
const perfil = { id: "u1", nombreCompleto: "Ana", roles: [], permisos: [] };
const resumen = { generadoPara: "Ana" };

/** Simula que la validación tardó más que la espera mínima para no esperar en la prueba. */
function validacionLenta() {
  let instante = 0;
  vi.spyOn(window.performance, "now").mockImplementation(() => (instante += 5_000));
}

beforeEach(() => {
  navegar.mockReset();
  vi.mocked(iniciarSesion).mockReset().mockResolvedValue(undefined);
  vi.mocked(obtenerPerfil).mockReset().mockResolvedValue(perfil);
  vi.mocked(servicioDashboard.resumen).mockReset().mockResolvedValue(resumen);
});

afterEach(() => vi.useRealTimers());

describe("useInicioSesion", () => {
  it("inicia sesión y entra al inicio con el perfil y el resumen precargados", async () => {
    validacionLenta();
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    expect(result.current.cargando).toBe(true);
    expect(iniciarSesion).toHaveBeenCalledWith(credenciales);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.accesoConfirmado).toBe(true);
    expect(navegar).toHaveBeenCalledWith("/inicio", { replace: true, state: { datosInicio: { perfil, resumen, errorResumen: "" } } });
  });

  it("mantiene una espera mínima para mostrar la confirmación de acceso", async () => {
    vi.useFakeTimers();
    vi.spyOn(window.performance, "now").mockReturnValue(0);
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    await act(async () => { await vi.advanceTimersByTimeAsync(1_099); });
    expect(navegar).not.toHaveBeenCalled();
    expect(result.current.accesoConfirmado).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(navegar).toHaveBeenCalledOnce();
    expect(result.current.cargando).toBe(false);
  });

  it("entra igualmente si fallan el perfil o el resumen", async () => {
    validacionLenta();
    vi.mocked(obtenerPerfil).mockRejectedValue(new Error("x"));
    vi.mocked(servicioDashboard.resumen).mockRejectedValue(new Error("Sin permiso para reportes"));
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar).toHaveBeenCalledWith("/inicio", { replace: true, state: { datosInicio: { perfil: null, resumen: null, errorResumen: "Sin permiso para reportes" } } });
  });

  it("usa un mensaje genérico si el resumen falla sin un Error", async () => {
    validacionLenta();
    vi.mocked(servicioDashboard.resumen).mockRejectedValue("timeout");
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    await waitFor(() => expect(navegar).toHaveBeenCalled());
    expect(navegar.mock.calls[0][1].state.datosInicio.errorResumen).toBe("No se pudo cargar el resumen del negocio.");
  });

  it("avisa cuando las credenciales son incorrectas", async () => {
    vi.mocked(iniciarSesion).mockRejectedValue(new ErrorApi("No autorizado", 401));
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    await waitFor(() => expect(result.current.aviso).toBe("Usuario o contraseña incorrectos."));
    expect(result.current.cargando).toBe(false);
    expect(result.current.accesoConfirmado).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it("avisa de problemas de conexión u otros errores", async () => {
    vi.mocked(iniciarSesion).mockRejectedValueOnce(new ErrorApi("Caído", 503)).mockRejectedValueOnce(new TypeError("red"));
    const { result } = renderHook(() => useInicioSesion());
    act(() => result.current.iniciar(credenciales));
    await waitFor(() => expect(result.current.aviso).toBe("No se pudo conectar o iniciar sesión. Inténtalo nuevamente."));
    act(() => result.current.setAviso(""));
    expect(result.current.aviso).toBe("");
    act(() => result.current.iniciar(credenciales));
    await waitFor(() => expect(result.current.aviso).toBe("No se pudo conectar o iniciar sesión. Inténtalo nuevamente."));
  });
});
