import { useId, useState } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import type { ISourceOptions } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";

const opcionesParticulas: ISourceOptions = {
  fullScreen: { enable: false, zIndex: 0 },
  fpsLimit: 30,
  detectRetina: true,
  interactivity: {
    events: {
      onClick: { enable: false, mode: "push" },
      onHover: { enable: false, mode: "repulse" },
      resize: { enable: true },
    },
  },
  particles: {
    color: { value: ["#5eb6ff", "#ed293a", "#d8eaff"] },
    number: { value: 44, density: { enable: true, width: 1000, height: 700 } },
    opacity: {
      value: { min: 0.18, max: 0.72 },
      animation: { enable: true, speed: 0.45, sync: false },
    },
    size: { value: { min: 0.7, max: 2.2 } },
    move: { enable: true, speed: 0.28, direction: "none", outModes: { default: "out" } },
    shape: { type: "circle" },
    links: { enable: false },
  },
};

export function SparklesCore() {
  const [movimientoReducido] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const id = useId();

  if (movimientoReducido) return null;

  return (
    <ParticlesProvider init={loadSlim}>
      <Particles
        id={`login-sparkles-${id}`}
        className="login-sparkles-canvas"
        options={opcionesParticulas}
      />
    </ParticlesProvider>
  );
}
