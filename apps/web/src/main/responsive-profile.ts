import { getResponsiveProfile } from "../utilidades/responsive-profile";

export function iniciarPerfilResponsive() {
  if (typeof window === "undefined") return () => undefined;

  let frame = 0;
  document.documentElement.dataset.responsiveProfile = getResponsiveProfile(window.innerWidth, window.innerHeight);
  const actualizar = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      document.documentElement.dataset.responsiveProfile = getResponsiveProfile(window.innerWidth, window.innerHeight);
    });
  };

  actualizar();
  window.addEventListener("resize", actualizar, { passive: true });
  window.addEventListener("orientationchange", actualizar, { passive: true });

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", actualizar);
    window.removeEventListener("orientationchange", actualizar);
    delete document.documentElement.dataset.responsiveProfile;
  };
}
