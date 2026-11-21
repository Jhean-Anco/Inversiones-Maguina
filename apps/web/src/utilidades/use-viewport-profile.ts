import { useSyncExternalStore } from "react";
import { getViewportProfile, type ViewportProfile } from "./viewport";

const suscribirAViewport = (notificar: () => void) => {
  window.addEventListener("resize", notificar, { passive: true });
  window.addEventListener("orientationchange", notificar, { passive: true });
  return () => {
    window.removeEventListener("resize", notificar);
    window.removeEventListener("orientationchange", notificar);
  };
};

const leerPerfilViewport = () => getViewportProfile(window.innerWidth, window.innerHeight);

export function useViewportProfile(): ViewportProfile {
  return useSyncExternalStore(suscribirAViewport, leerPerfilViewport, () => "laptop");
}
