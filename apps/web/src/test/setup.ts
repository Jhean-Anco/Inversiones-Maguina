import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  try { window.localStorage.clear(); } catch { /* almacenamiento no disponible */ }
});
